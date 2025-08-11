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
  if (error instanceof ZodError)
    return response
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Preencha os dados da requisição corretamente" });

  const statusCode = error.statusCode ?? StatusCodes.INTERNAL_SERVER_ERROR;
  const message = error.message ?? StatusCodes.INTERNAL_SERVER_ERROR;
  console.error({ status: error.statusCode, message });
  return response.status(statusCode).json({ message });
}
