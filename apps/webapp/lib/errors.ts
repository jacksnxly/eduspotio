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

  constructor({ code, message }: { code: ErrorCode; message: string }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = ERROR_CODES[code];
  }

  public toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}

export function handleApiError(
  error: unknown,
  context?: { method?: string; path?: string; userId?: string },
): Response {
  if (error instanceof ApiError) {
    if (error.code === "unauthorized" || error.code === "forbidden" || error.code === "rate_limit_exceeded") {
      console.warn(
        JSON.stringify({
          level: "warn",
          code: error.code,
          message: error.message,
          ...(context && context),
        }),
      );
    }
    return Response.json(error.toJSON(), { status: error.status });
  }

  const errorId = crypto.randomUUID();
  console.error(
    JSON.stringify({
      errorId,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    }),
  );

  const fallback = new ApiError({
    code: "internal_server_error",
    message: `An unexpected error occurred. Reference: ${errorId}`,
  });
  return Response.json(fallback.toJSON(), { status: fallback.status });
}
