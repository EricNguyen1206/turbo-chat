import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  isOperationalError,
  isValidationError,
  isUnauthorizedError,
  isForbiddenError,
  isNotFoundError,
  isConflictError,
  isRateLimitError,
} from "../errors";

// ---------------------------------------------------------------------------
// ValidationError
// ---------------------------------------------------------------------------

describe("ValidationError", () => {
  it("should set custom message", () => {
    const err = new ValidationError("email is required");
    expect(err.message).toBe("email is required");
  });

  it("should expose the field when provided", () => {
    const err = new ValidationError("required", "email");
    expect(err.field).toBe("email");
  });

  it("should have undefined field when omitted", () => {
    const err = new ValidationError("required");
    expect(err.field).toBeUndefined();
  });

  it("should have statusCode 400", () => {
    const err = new ValidationError("bad");
    expect(err.statusCode).toBe(400);
  });

  it("should be operational", () => {
    const err = new ValidationError("bad");
    expect(err.isOperational).toBe(true);
  });

  it("should have name ValidationError", () => {
    const err = new ValidationError("bad");
    expect(err.name).toBe("ValidationError");
  });

  it("should be an instance of Error", () => {
    const err = new ValidationError("bad");
    expect(err).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// UnauthorizedError
// ---------------------------------------------------------------------------

describe("UnauthorizedError", () => {
  it("should use custom message when provided", () => {
    const err = new UnauthorizedError("token expired");
    expect(err.message).toBe("token expired");
  });

  it("should use default message when none provided", () => {
    const err = new UnauthorizedError();
    expect(err.message).toBe("Unauthorized");
  });

  it("should have statusCode 401", () => {
    expect(new UnauthorizedError().statusCode).toBe(401);
  });

  it("should be operational", () => {
    expect(new UnauthorizedError().isOperational).toBe(true);
  });

  it("should have name UnauthorizedError", () => {
    expect(new UnauthorizedError().name).toBe("UnauthorizedError");
  });
});

// ---------------------------------------------------------------------------
// ForbiddenError
// ---------------------------------------------------------------------------

describe("ForbiddenError", () => {
  it("should use custom message when provided", () => {
    const err = new ForbiddenError("no access");
    expect(err.message).toBe("no access");
  });

  it("should use default message when none provided", () => {
    expect(new ForbiddenError().message).toBe("Forbidden");
  });

  it("should have statusCode 403", () => {
    expect(new ForbiddenError().statusCode).toBe(403);
  });

  it("should be operational", () => {
    expect(new ForbiddenError().isOperational).toBe(true);
  });

  it("should have name ForbiddenError", () => {
    expect(new ForbiddenError().name).toBe("ForbiddenError");
  });
});

// ---------------------------------------------------------------------------
// NotFoundError
// ---------------------------------------------------------------------------

describe("NotFoundError", () => {
  it("should use custom message when provided", () => {
    const err = new NotFoundError("user not found");
    expect(err.message).toBe("user not found");
  });

  it("should use default message when none provided", () => {
    expect(new NotFoundError().message).toBe("Not found");
  });

  it("should have statusCode 404", () => {
    expect(new NotFoundError().statusCode).toBe(404);
  });

  it("should be operational", () => {
    expect(new NotFoundError().isOperational).toBe(true);
  });

  it("should have name NotFoundError", () => {
    expect(new NotFoundError().name).toBe("NotFoundError");
  });
});

// ---------------------------------------------------------------------------
// ConflictError
// ---------------------------------------------------------------------------

describe("ConflictError", () => {
  it("should use custom message when provided", () => {
    const err = new ConflictError("duplicate email");
    expect(err.message).toBe("duplicate email");
  });

  it("should use default message when none provided", () => {
    expect(new ConflictError().message).toBe("Conflict");
  });

  it("should have statusCode 409", () => {
    expect(new ConflictError().statusCode).toBe(409);
  });

  it("should be operational", () => {
    expect(new ConflictError().isOperational).toBe(true);
  });

  it("should have name ConflictError", () => {
    expect(new ConflictError().name).toBe("ConflictError");
  });
});

// ---------------------------------------------------------------------------
// RateLimitError
// ---------------------------------------------------------------------------

describe("RateLimitError", () => {
  it("should use custom message when provided", () => {
    const err = new RateLimitError("slow down");
    expect(err.message).toBe("slow down");
  });

  it("should use default message when none provided", () => {
    expect(new RateLimitError().message).toBe("Rate limit exceeded");
  });

  it("should have statusCode 429", () => {
    expect(new RateLimitError().statusCode).toBe(429);
  });

  it("should be operational", () => {
    expect(new RateLimitError().isOperational).toBe(true);
  });

  it("should have name RateLimitError", () => {
    expect(new RateLimitError().name).toBe("RateLimitError");
  });
});

// ---------------------------------------------------------------------------
// InternalServerError
// ---------------------------------------------------------------------------

describe("InternalServerError", () => {
  it("should use custom message when provided", () => {
    const err = new InternalServerError("db down");
    expect(err.message).toBe("db down");
  });

  it("should use default message when none provided", () => {
    expect(new InternalServerError().message).toBe("Internal server error");
  });

  it("should have statusCode 500", () => {
    expect(new InternalServerError().statusCode).toBe(500);
  });

  it("should be operational", () => {
    expect(new InternalServerError().isOperational).toBe(true);
  });

  it("should have name InternalServerError", () => {
    expect(new InternalServerError().name).toBe("InternalServerError");
  });
});

// ---------------------------------------------------------------------------
// Type guard: isOperationalError
// ---------------------------------------------------------------------------

describe("isOperationalError", () => {
  it("should return true for operational errors", () => {
    expect(isOperationalError(new ValidationError("bad"))).toBe(true);
    expect(isOperationalError(new UnauthorizedError())).toBe(true);
    expect(isOperationalError(new ForbiddenError())).toBe(true);
    expect(isOperationalError(new NotFoundError())).toBe(true);
    expect(isOperationalError(new ConflictError())).toBe(true);
    expect(isOperationalError(new RateLimitError())).toBe(true);
    expect(isOperationalError(new InternalServerError())).toBe(true);
  });

  it("should return false for plain Error", () => {
    expect(isOperationalError(new Error("plain"))).toBe(false);
  });

  it("should return false for object without isOperational", () => {
    expect(isOperationalError({} as Error)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Type guards for each class
// ---------------------------------------------------------------------------

describe("isValidationError", () => {
  it("returns true for ValidationError", () => {
    expect(isValidationError(new ValidationError("bad"))).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(isValidationError(new Error("x"))).toBe(false);
    expect(isValidationError(new NotFoundError())).toBe(false);
  });
});

describe("isUnauthorizedError", () => {
  it("returns true for UnauthorizedError", () => {
    expect(isUnauthorizedError(new UnauthorizedError())).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(isUnauthorizedError(new Error("x"))).toBe(false);
    expect(isUnauthorizedError(new ForbiddenError())).toBe(false);
  });
});

describe("isForbiddenError", () => {
  it("returns true for ForbiddenError", () => {
    expect(isForbiddenError(new ForbiddenError())).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(isForbiddenError(new Error("x"))).toBe(false);
    expect(isForbiddenError(new UnauthorizedError())).toBe(false);
  });
});

describe("isNotFoundError", () => {
  it("returns true for NotFoundError", () => {
    expect(isNotFoundError(new NotFoundError())).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(isNotFoundError(new Error("x"))).toBe(false);
    expect(isNotFoundError(new ConflictError())).toBe(false);
  });
});

describe("isConflictError", () => {
  it("returns true for ConflictError", () => {
    expect(isConflictError(new ConflictError())).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(isConflictError(new Error("x"))).toBe(false);
    expect(isConflictError(new NotFoundError())).toBe(false);
  });
});

describe("isRateLimitError", () => {
  it("returns true for RateLimitError", () => {
    expect(isRateLimitError(new RateLimitError())).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(isRateLimitError(new Error("x"))).toBe(false);
    expect(isRateLimitError(new InternalServerError())).toBe(false);
  });
});
