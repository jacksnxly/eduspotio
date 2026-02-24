import { z } from "zod";
import { generateErrorMessage } from "zod-error";
import { logger } from "@/lib/axiom";

const DOC_ERROR_URL = "https://docs.eduspot.io/api/errors";

export const ERROR_CODES = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  unprocessable_entity: 422,
  rate_limit_exceeded: 429,
  internal_server_error: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly docUrl: string;
  public readonly headers?: HeadersInit;

  constructor({ code, message, headers }: { code: ErrorCode; message: string; headers?: HeadersInit }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = ERROR_CODES[code];
    this.docUrl = `${DOC_ERROR_URL}#${code.replace(/_/g, "-")}`;
    this.headers = headers;
  }

  public toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        doc_url: this.docUrl,
      },
    };
  }
}

export function handleApiError(
  error: unknown,
  context?: Record<string, string | undefined>,
): Response {
  if (error instanceof ApiError) {
    const logLevel =
      error.code === "unauthorized" ||
      error.code === "forbidden" ||
      error.code === "rate_limit_exceeded"
        ? "warn"
        : "info";
    logger[logLevel](`${error.code} ${error.status}`, {
      code: error.code,
      status: error.status,
      message: error.message,
      ...context,
    });
    return Response.json(error.toJSON(), {
      status: error.status,
      headers: error.headers,
    });
  }

  if (error instanceof z.ZodError) {
    const message = generateErrorMessage(error.issues, {
      maxErrors: 3,
      delimiter: { component: ": " },
      path: { enabled: true, type: "objectNotation", label: "" },
      code: { enabled: true, label: "" },
      message: { enabled: true, label: "" },
    });
    const zodApiError = new ApiError({
      code: "unprocessable_entity",
      message,
    });
    // Log at info level (validation errors are client mistakes, not security events warranting warn)
    logger.info("Validation error", {
      code: zodApiError.code,
      status: zodApiError.status,
      message: zodApiError.message,
      ...context,
    });
    return Response.json(zodApiError.toJSON(), { status: zodApiError.status });
  }

  // PostgreSQL native errors (Drizzle passes these through)
  if (error && typeof error === "object" && "code" in error) {
    const pgCode = (error as { code: string }).code;
    if (pgCode === "23505") {
      // unique_violation → 409 Conflict
      const pgError = new ApiError({
        code: "conflict",
        message: (error as { detail?: string }).detail || "A record with this value already exists.",
      });
      logger.info("Database constraint violation", {
        code: pgError.code,
        status: pgError.status,
        pgCode,
        message: pgError.message,
        ...context,
      });
      return Response.json(pgError.toJSON(), { status: pgError.status });
    }
    if (pgCode === "23503") {
      // foreign_key_violation → 422
      const pgError = new ApiError({
        code: "unprocessable_entity",
        message: "Referenced record does not exist.",
      });
      logger.info("Database constraint violation", {
        code: pgError.code,
        status: pgError.status,
        pgCode,
        message: pgError.message,
        ...context,
      });
      return Response.json(pgError.toJSON(), { status: pgError.status });
    }
    if (pgCode === "23502") {
      // not_null_violation → 422
      const pgError = new ApiError({
        code: "unprocessable_entity",
        message: `Required field missing: ${(error as { column?: string }).column || "unknown"}`,
      });
      logger.info("Database constraint violation", {
        code: pgError.code,
        status: pgError.status,
        pgCode,
        message: pgError.message,
        ...context,
      });
      return Response.json(pgError.toJSON(), { status: pgError.status });
    }
  }

  const errorId = crypto.randomUUID();
  logger.error("Unexpected error", {
    errorId,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  });

  const fallback = new ApiError({
    code: "internal_server_error",
    message: `An unexpected error occurred. Reference: ${errorId}`,
  });
  return Response.json(fallback.toJSON(), { status: fallback.status });
}
