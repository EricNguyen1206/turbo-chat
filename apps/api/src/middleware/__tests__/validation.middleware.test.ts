/**
 * Unit tests for validateDto middleware factory
 * @module middleware/__tests__/validation.middleware.test
 */

import { validateDto } from "../validation.middleware";
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import { ValidationError } from "@turbo-chat/shared";
import { mockRequest, mockResponse, mockNext } from "@/tests/helpers/mockExpress";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/utils/logger");

jest.mock("class-validator", () => ({
  validate: jest.fn(),
  ValidationError: class ClassValidationError {
    constraints?: Record<string, string>;
    property?: string;
  },
}));

jest.mock("class-transformer", () => ({
  plainToClass: jest.fn(),
}));

const mockedValidate = validate as jest.MockedFunction<typeof validate>;
const mockedPlainToClass = plainToClass as jest.MockedFunction<typeof plainToClass>;

// ---------------------------------------------------------------------------
// Stub DTO class
// ---------------------------------------------------------------------------

class StubDto {
  username!: string;
  email!: string;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("validateDto middleware", () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
  });

  // -------------------------------------------------------------------------
  // Happy path — valid DTO
  // -------------------------------------------------------------------------
  it("should call next() and replace req.body when validation passes", async () => {
    const transformedDto = { username: "testuser", email: "test@example.com" };
    mockedPlainToClass.mockReturnValue(transformedDto);
    mockedValidate.mockResolvedValue([]);

    const middleware = validateDto(StubDto);
    req.body = { username: "testuser", email: "test@example.com" };

    await middleware(req, res, next);

    expect(mockedPlainToClass).toHaveBeenCalledWith(StubDto, req.body);
    expect(mockedValidate).toHaveBeenCalledWith(transformedDto);
    expect(req.body).toBe(transformedDto);
    expect(next).toHaveBeenCalledWith();
  });

  // -------------------------------------------------------------------------
  // Validation errors → ValidationError passed to next()
  // -------------------------------------------------------------------------
  it("should call next with ValidationError when validation fails", async () => {
    const transformedDto = { username: "", email: "invalid" };
    mockedPlainToClass.mockReturnValue(transformedDto);

    const classErrors: any[] = [
      {
        constraints: { isNotEmpty: "username should not be empty" },
        property: "username",
      },
      {
        constraints: { isEmail: "email must be a valid email" },
        property: "email",
      },
    ];
    mockedValidate.mockResolvedValue(classErrors);

    const middleware = validateDto(StubDto);
    req.body = { username: "", email: "invalid" };

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toContain("username should not be empty");
    expect(error.message).toContain("email must be a valid email");
  });

  it("should join multiple constraint messages with comma", async () => {
    const transformedDto = { username: "ab", email: "test@example.com" };
    mockedPlainToClass.mockReturnValue(transformedDto);

    const classErrors: any[] = [
      {
        constraints: {
          minLength: "username must be at least 3 characters",
          isAlphanumeric: "username must be alphanumeric",
        },
        property: "username",
      },
    ];
    mockedValidate.mockResolvedValue(classErrors);

    const middleware = validateDto(StubDto);
    req.body = { username: "ab", email: "test@example.com" };

    await middleware(req, res, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toContain("username must be at least 3 characters");
    expect(error.message).toContain("username must be alphanumeric");
  });

  // -------------------------------------------------------------------------
  // Non-validation error inside the try block
  // -------------------------------------------------------------------------
  it("should call next with generic ValidationError when non-validation error is thrown", async () => {
    mockedPlainToClass.mockImplementation(() => {
      throw new Error("Unexpected transform failure");
    });

    const middleware = validateDto(StubDto);
    req.body = { username: "testuser", email: "test@example.com" };

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe("Validation failed");
  });

  // -------------------------------------------------------------------------
  // Edge: validate returns empty constraints
  // -------------------------------------------------------------------------
  it("should handle validation errors with no constraints gracefully", async () => {
    const transformedDto = {};
    mockedPlainToClass.mockReturnValue(transformedDto);

    const classErrors: any[] = [
      {
        constraints: undefined,
        property: "username",
      },
    ];
    mockedValidate.mockResolvedValue(classErrors);

    const middleware = validateDto(StubDto);
    req.body = {};

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ValidationError);
  });
});
