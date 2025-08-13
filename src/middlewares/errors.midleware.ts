import { type NextFunction, type Response, type Request } from "express";
import { ZodError } from "zod";
import { StatusCodes } from "http-status-codes";
import type { AplicationError } from "../utils/error-handlers.js";

export function errorsMiddleware(
  error: Error & Partial<AplicationError>,
  request: Request,
  response: Response,
  next: NextFunction
) {
  let statusCode = error.statusCode ?? StatusCodes.INTERNAL_SERVER_ERROR;
  let errorResponse: { message: string }[] = [];

  if (error instanceof ZodError) {
    statusCode = StatusCodes.BAD_REQUEST;

    const flattened = error.flatten();
    const fieldErrors = Object.values(flattened.fieldErrors)
      .flat()
      .filter((msg): msg is string => typeof msg === "string");
    const formErrors = flattened.formErrors.filter(
      (msg): msg is string => typeof msg === "string"
    );

    errorResponse = [...fieldErrors, ...formErrors].map((message) => ({
      message,
    }));
  } else {
    errorResponse = [{ message: error.message ?? "Internal server error" }];
  }

  console.error({ status: statusCode, errors: errorResponse });

  return response.status(statusCode).json({ error: errorResponse });
}
