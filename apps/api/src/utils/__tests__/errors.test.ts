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

describe("Custom Error Classes", () => {
  // ── ValidationError ────────────────────────────────────────────────
  describe("ValidationError", () => {
    it("should set custom message", () => {
      const err = new ValidationError("Email is required");
      expect(err.message).toBe("Email is required");
    });

    it("should have statusCode 400", () => {
      const err = new ValidationError("bad input");
      expect(err.statusCode).toBe(400);
    });

    it("should be operational", () => {
      const err = new ValidationError("bad input");
      expect(err.isOperational).toBe(true);
    });

    it("should set name to ValidationError", () => {
      const err = new ValidationError("bad input");
      expect(err.name).toBe("ValidationError");
    });

    it("should accept an optional field", () => {
      const err = new ValidationError("Email is required", "email");
      expect(err.field).toBe("email");
    });

    it("should leave field undefined when not provided", () => {
      const err = new ValidationError("bad input");
      expect(err.field).toBeUndefined();
    });

    it("should be an instance of Error", () => {
      const err = new ValidationError("bad input");
      expect(err).toBeInstanceOf(Error);
    });
  });

  // ── UnauthorizedError ──────────────────────────────────────────────
  describe("UnauthorizedError", () => {
    it("should set custom message", () => {
      const err = new UnauthorizedError("Token expired");
      expect(err.message).toBe("Token expired");
    });

    it("should default message to 'Unauthorized'", () => {
      const err = new UnauthorizedError();
      expect(err.message).toBe("Unauthorized");
    });

    it("should have statusCode 401", () => {
      const err = new UnauthorizedError();
      expect(err.statusCode).toBe(401);
    });

    it("should be operational", () => {
      const err = new UnauthorizedError();
      expect(err.isOperational).toBe(true);
    });

    it("should set name to UnauthorizedError", () => {
      const err = new UnauthorizedError();
      expect(err.name).toBe("UnauthorizedError");
    });

    it("should be an instance of Error", () => {
      const err = new UnauthorizedError();
      expect(err).toBeInstanceOf(Error);
    });
  });

  // ── ForbiddenError ─────────────────────────────────────────────────
  describe("ForbiddenError", () => {
    it("should set custom message", () => {
      const err = new ForbiddenError("Not allowed");
      expect(err.message).toBe("Not allowed");
    });

    it("should default message to 'Forbidden'", () => {
      const err = new ForbiddenError();
      expect(err.message).toBe("Forbidden");
    });

    it("should have statusCode 403", () => {
      const err = new ForbiddenError();
      expect(err.statusCode).toBe(403);
    });

    it("should be operational", () => {
      const err = new ForbiddenError();
      expect(err.isOperational).toBe(true);
    });

    it("should set name to ForbiddenError", () => {
      const err = new ForbiddenError();
      expect(err.name).toBe("ForbiddenError");
    });

    it("should be an instance of Error", () => {
      const err = new ForbiddenError();
      expect(err).toBeInstanceOf(Error);
    });
  });

  // ── NotFoundError ──────────────────────────────────────────────────
  describe("NotFoundError", () => {
    it("should set custom message", () => {
      const err = new NotFoundError("User not found");
      expect(err.message).toBe("User not found");
    });

    it("should default message to 'Not found'", () => {
      const err = new NotFoundError();
      expect(err.message).toBe("Not found");
    });

    it("should have statusCode 404", () => {
      const err = new NotFoundError();
      expect(err.statusCode).toBe(404);
    });

    it("should be operational", () => {
      const err = new NotFoundError();
      expect(err.isOperational).toBe(true);
    });

    it("should set name to NotFoundError", () => {
      const err = new NotFoundError();
      expect(err.name).toBe("NotFoundError");
    });

    it("should be an instance of Error", () => {
      const err = new NotFoundError();
      expect(err).toBeInstanceOf(Error);
    });
  });

  // ── ConflictError ──────────────────────────────────────────────────
  describe("ConflictError", () => {
    it("should set custom message", () => {
      const err = new ConflictError("Username taken");
      expect(err.message).toBe("Username taken");
    });

    it("should default message to 'Conflict'", () => {
      const err = new ConflictError();
      expect(err.message).toBe("Conflict");
    });

    it("should have statusCode 409", () => {
      const err = new ConflictError();
      expect(err.statusCode).toBe(409);
    });

    it("should be operational", () => {
      const err = new ConflictError();
      expect(err.isOperational).toBe(true);
    });

    it("should set name to ConflictError", () => {
      const err = new ConflictError();
      expect(err.name).toBe("ConflictError");
    });

    it("should be an instance of Error", () => {
      const err = new ConflictError();
      expect(err).toBeInstanceOf(Error);
    });
  });

  // ── RateLimitError ─────────────────────────────────────────────────
  describe("RateLimitError", () => {
    it("should set custom message", () => {
      const err = new RateLimitError("Slow down");
      expect(err.message).toBe("Slow down");
    });

    it("should default message to 'Rate limit exceeded'", () => {
      const err = new RateLimitError();
      expect(err.message).toBe("Rate limit exceeded");
    });

    it("should have statusCode 429", () => {
      const err = new RateLimitError();
      expect(err.statusCode).toBe(429);
    });

    it("should be operational", () => {
      const err = new RateLimitError();
      expect(err.isOperational).toBe(true);
    });

    it("should set name to RateLimitError", () => {
      const err = new RateLimitError();
      expect(err.name).toBe("RateLimitError");
    });

    it("should be an instance of Error", () => {
      const err = new RateLimitError();
      expect(err).toBeInstanceOf(Error);
    });
  });

  // ── InternalServerError ────────────────────────────────────────────
  describe("InternalServerError", () => {
    it("should set custom message", () => {
      const err = new InternalServerError("DB connection failed");
      expect(err.message).toBe("DB connection failed");
    });

    it("should default message to 'Internal server error'", () => {
      const err = new InternalServerError();
      expect(err.message).toBe("Internal server error");
    });

    it("should have statusCode 500", () => {
      const err = new InternalServerError();
      expect(err.statusCode).toBe(500);
    });

    it("should be operational", () => {
      const err = new InternalServerError();
      expect(err.isOperational).toBe(true);
    });

    it("should set name to InternalServerError", () => {
      const err = new InternalServerError();
      expect(err.name).toBe("InternalServerError");
    });

    it("should be an instance of Error", () => {
      const err = new InternalServerError();
      expect(err).toBeInstanceOf(Error);
    });
  });
});

describe("Type guard: isOperationalError", () => {
  it("should return true for ValidationError", () => {
    expect(isOperationalError(new ValidationError("bad"))).toBe(true);
  });

  it("should return true for UnauthorizedError", () => {
    expect(isOperationalError(new UnauthorizedError())).toBe(true);
  });

  it("should return true for ForbiddenError", () => {
    expect(isOperationalError(new ForbiddenError())).toBe(true);
  });

  it("should return true for NotFoundError", () => {
    expect(isOperationalError(new NotFoundError())).toBe(true);
  });

  it("should return true for ConflictError", () => {
    expect(isOperationalError(new ConflictError())).toBe(true);
  });

  it("should return true for RateLimitError", () => {
    expect(isOperationalError(new RateLimitError())).toBe(true);
  });

  it("should return true for InternalServerError", () => {
    expect(isOperationalError(new InternalServerError())).toBe(true);
  });

  it("should return false for a plain Error", () => {
    expect(isOperationalError(new Error("plain"))).toBe(false);
  });

  it("should return false for an object with isOperational=false", () => {
    const err = new Error("not operational") as Error & { isOperational: boolean };
    err.isOperational = false;
    expect(isOperationalError(err)).toBe(false);
  });
});

describe("Type guard: isValidationError", () => {
  it("should return true for ValidationError", () => {
    expect(isValidationError(new ValidationError("bad"))).toBe(true);
  });

  it("should return false for other custom errors", () => {
    expect(isValidationError(new UnauthorizedError())).toBe(false);
    expect(isValidationError(new ForbiddenError())).toBe(false);
    expect(isValidationError(new NotFoundError())).toBe(false);
    expect(isValidationError(new ConflictError())).toBe(false);
    expect(isValidationError(new RateLimitError())).toBe(false);
    expect(isValidationError(new InternalServerError())).toBe(false);
  });

  it("should return false for a plain Error", () => {
    expect(isValidationError(new Error("plain"))).toBe(false);
  });
});

describe("Type guard: isUnauthorizedError", () => {
  it("should return true for UnauthorizedError", () => {
    expect(isUnauthorizedError(new UnauthorizedError())).toBe(true);
  });

  it("should return false for other custom errors", () => {
    expect(isUnauthorizedError(new ValidationError("bad"))).toBe(false);
    expect(isUnauthorizedError(new ForbiddenError())).toBe(false);
    expect(isUnauthorizedError(new NotFoundError())).toBe(false);
    expect(isUnauthorizedError(new ConflictError())).toBe(false);
    expect(isUnauthorizedError(new RateLimitError())).toBe(false);
    expect(isUnauthorizedError(new InternalServerError())).toBe(false);
  });

  it("should return false for a plain Error", () => {
    expect(isUnauthorizedError(new Error("plain"))).toBe(false);
  });
});

describe("Type guard: isForbiddenError", () => {
  it("should return true for ForbiddenError", () => {
    expect(isForbiddenError(new ForbiddenError())).toBe(true);
  });

  it("should return false for other custom errors", () => {
    expect(isForbiddenError(new ValidationError("bad"))).toBe(false);
    expect(isForbiddenError(new UnauthorizedError())).toBe(false);
    expect(isForbiddenError(new NotFoundError())).toBe(false);
    expect(isForbiddenError(new ConflictError())).toBe(false);
    expect(isForbiddenError(new RateLimitError())).toBe(false);
    expect(isForbiddenError(new InternalServerError())).toBe(false);
  });

  it("should return false for a plain Error", () => {
    expect(isForbiddenError(new Error("plain"))).toBe(false);
  });
});

describe("Type guard: isNotFoundError", () => {
  it("should return true for NotFoundError", () => {
    expect(isNotFoundError(new NotFoundError())).toBe(true);
  });

  it("should return false for other custom errors", () => {
    expect(isNotFoundError(new ValidationError("bad"))).toBe(false);
    expect(isNotFoundError(new UnauthorizedError())).toBe(false);
    expect(isNotFoundError(new ForbiddenError())).toBe(false);
    expect(isNotFoundError(new ConflictError())).toBe(false);
    expect(isNotFoundError(new RateLimitError())).toBe(false);
    expect(isNotFoundError(new InternalServerError())).toBe(false);
  });

  it("should return false for a plain Error", () => {
    expect(isNotFoundError(new Error("plain"))).toBe(false);
  });
});

describe("Type guard: isConflictError", () => {
  it("should return true for ConflictError", () => {
    expect(isConflictError(new ConflictError())).toBe(true);
  });

  it("should return false for other custom errors", () => {
    expect(isConflictError(new ValidationError("bad"))).toBe(false);
    expect(isConflictError(new UnauthorizedError())).toBe(false);
    expect(isConflictError(new ForbiddenError())).toBe(false);
    expect(isConflictError(new NotFoundError())).toBe(false);
    expect(isConflictError(new RateLimitError())).toBe(false);
    expect(isConflictError(new InternalServerError())).toBe(false);
  });

  it("should return false for a plain Error", () => {
    expect(isConflictError(new Error("plain"))).toBe(false);
  });
});

describe("Type guard: isRateLimitError", () => {
  it("should return true for RateLimitError", () => {
    expect(isRateLimitError(new RateLimitError())).toBe(true);
  });

  it("should return false for other custom errors", () => {
    expect(isRateLimitError(new ValidationError("bad"))).toBe(false);
    expect(isRateLimitError(new UnauthorizedError())).toBe(false);
    expect(isRateLimitError(new ForbiddenError())).toBe(false);
    expect(isRateLimitError(new NotFoundError())).toBe(false);
    expect(isRateLimitError(new ConflictError())).toBe(false);
    expect(isRateLimitError(new InternalServerError())).toBe(false);
  });

  it("should return false for a plain Error", () => {
    expect(isRateLimitError(new Error("plain"))).toBe(false);
  });
});
