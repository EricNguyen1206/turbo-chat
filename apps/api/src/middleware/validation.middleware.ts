import { Request, Response, NextFunction } from "express";
import { validate, ValidationError as ClassValidationError } from "class-validator";
import { plainToClass } from "class-transformer";
import { logger } from "@/utils/logger";
import { ValidationError } from "@turbo-chat/shared";

export const validateDto = (dtoClass: any) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const dto = plainToClass(dtoClass, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        const errorMessages = errors.map((error: ClassValidationError) => {
          return Object.values(error.constraints || {}).join(", ");
        });

        logger.warn("Validation failed:", { errors: errorMessages, body: req.body });

        // Throw ValidationError to be handled by error handler
        throw new ValidationError(errorMessages.join("; "));
      }

      // Replace req.body with validated and transformed data
      req.body = dto;
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        next(error);
      } else {
        logger.error("Validation middleware error:", error);
        next(new ValidationError("Validation failed"));
      }
    }
  };
};
