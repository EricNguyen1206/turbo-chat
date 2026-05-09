import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { SignupRequestDto, SigninRequestDto, UpdateProfileDto } from "../auth.dto";

// Helper to convert a plain object into a class instance and validate it.
async function validateDto<T extends object>(
  cls: new () => T,
  plain: Record<string, any>
): Promise<string[]> {
  const instance = plainToInstance(cls, plain);
  const errors = await validate(instance as object);
  return errors.map((e) => e.property);
}

// ============================================================================
// SignupRequestDto
// ============================================================================

describe("SignupRequestDto", () => {
  const valid = {
    username: "testuser",
    email: "test@example.com",
    password: "pass123",
  };

  it("passes validation with valid data", async () => {
    const fields = await validateDto(SignupRequestDto, valid);
    expect(fields).toEqual([]);
  });

  // -- username --

  it("fails when username is missing", async () => {
    const fields = await validateDto(SignupRequestDto, {
      ...valid,
      username: undefined,
    });
    expect(fields).toContain("username");
  });

  it("fails when username is too short (< 3 chars)", async () => {
    const fields = await validateDto(SignupRequestDto, {
      ...valid,
      username: "ab",
    });
    expect(fields).toContain("username");
  });

  it("fails when username is too long (> 50 chars)", async () => {
    const fields = await validateDto(SignupRequestDto, {
      ...valid,
      username: "a".repeat(51),
    });
    expect(fields).toContain("username");
  });

  it("accepts username at boundary length (3 chars)", async () => {
    const fields = await validateDto(SignupRequestDto, {
      ...valid,
      username: "abc",
    });
    expect(fields).toEqual([]);
  });

  it("accepts username at boundary length (50 chars)", async () => {
    const fields = await validateDto(SignupRequestDto, {
      ...valid,
      username: "a".repeat(50),
    });
    expect(fields).toEqual([]);
  });

  // -- email --

  it("fails when email is missing", async () => {
    const fields = await validateDto(SignupRequestDto, {
      ...valid,
      email: undefined,
    });
    expect(fields).toContain("email");
  });

  it("fails when email is invalid", async () => {
    const fields = await validateDto(SignupRequestDto, {
      ...valid,
      email: "not-an-email",
    });
    expect(fields).toContain("email");
  });

  // -- password --

  it("fails when password is missing", async () => {
    const fields = await validateDto(SignupRequestDto, {
      ...valid,
      password: undefined,
    });
    expect(fields).toContain("password");
  });

  it("fails when password is too short (< 6 chars)", async () => {
    const fields = await validateDto(SignupRequestDto, {
      ...valid,
      password: "ab12",
    });
    expect(fields).toContain("password");
  });

  it("fails when password has only letters (no numbers)", async () => {
    const fields = await validateDto(SignupRequestDto, {
      ...valid,
      password: "abcdef",
    });
    expect(fields).toContain("password");
  });

  it("fails when password has only numbers (no letters)", async () => {
    const fields = await validateDto(SignupRequestDto, {
      ...valid,
      password: "123456",
    });
    expect(fields).toContain("password");
  });

  it("accepts password with letters and numbers at minimum length (6)", async () => {
    const fields = await validateDto(SignupRequestDto, {
      ...valid,
      password: "abc123",
    });
    expect(fields).toEqual([]);
  });
});

// ============================================================================
// SigninRequestDto
// ============================================================================

describe("SigninRequestDto", () => {
  const valid = {
    email: "user@example.com",
    password: "pass123",
  };

  it("passes validation with valid data", async () => {
    const fields = await validateDto(SigninRequestDto, valid);
    expect(fields).toEqual([]);
  });

  // -- email --

  it("fails when email is missing", async () => {
    const fields = await validateDto(SigninRequestDto, {
      ...valid,
      email: undefined,
    });
    expect(fields).toContain("email");
  });

  it("fails when email is invalid", async () => {
    const fields = await validateDto(SigninRequestDto, {
      ...valid,
      email: "bad-email",
    });
    expect(fields).toContain("email");
  });

  // -- password --

  it("fails when password is missing", async () => {
    const fields = await validateDto(SigninRequestDto, {
      ...valid,
      password: undefined,
    });
    expect(fields).toContain("password");
  });

  it("fails when password is too short", async () => {
    const fields = await validateDto(SigninRequestDto, {
      ...valid,
      password: "ab12",
    });
    expect(fields).toContain("password");
  });

  it("fails when password has only letters", async () => {
    const fields = await validateDto(SigninRequestDto, {
      ...valid,
      password: "abcdef",
    });
    expect(fields).toContain("password");
  });

  it("fails when password has only numbers", async () => {
    const fields = await validateDto(SigninRequestDto, {
      ...valid,
      password: "123456",
    });
    expect(fields).toContain("password");
  });
});

// ============================================================================
// UpdateProfileDto
// ============================================================================

describe("UpdateProfileDto", () => {
  const valid = {
    username: "updateduser",
    currentPassword: "current123",
  };

  it("passes validation with valid data", async () => {
    const fields = await validateDto(UpdateProfileDto, valid);
    expect(fields).toEqual([]);
  });

  // -- username (optional but validated if present) --

  it("passes when username is omitted", async () => {
    const fields = await validateDto(UpdateProfileDto, {
      currentPassword: "current123",
    });
    expect(fields).toEqual([]);
  });

  it("fails when username is too short", async () => {
    const fields = await validateDto(UpdateProfileDto, {
      ...valid,
      username: "ab",
    });
    expect(fields).toContain("username");
  });

  it("fails when username is too long", async () => {
    const fields = await validateDto(UpdateProfileDto, {
      ...valid,
      username: "x".repeat(51),
    });
    expect(fields).toContain("username");
  });

  // -- password (optional but validated if present) --

  it("fails when password has only letters", async () => {
    const fields = await validateDto(UpdateProfileDto, {
      ...valid,
      password: "abcdef",
    });
    expect(fields).toContain("password");
  });

  it("fails when password has only numbers", async () => {
    const fields = await validateDto(UpdateProfileDto, {
      ...valid,
      password: "123456",
    });
    expect(fields).toContain("password");
  });

  it("passes when valid password is provided", async () => {
    const fields = await validateDto(UpdateProfileDto, {
      ...valid,
      password: "newpass123",
    });
    expect(fields).toEqual([]);
  });

  // -- currentPassword (required) --

  it("fails when currentPassword is missing", async () => {
    const fields = await validateDto(UpdateProfileDto, {
      username: "user",
    });
    expect(fields).toContain("currentPassword");
  });
});
