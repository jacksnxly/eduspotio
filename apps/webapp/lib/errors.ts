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
  public readonly headers?: HeadersInit;

  constructor({ code, message, headers }: { code: ErrorCode; message: string; headers?: HeadersInit }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = ERROR_CODES[code];
    this.headers = headers;
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
  context?: Record<string, string | undefined>,
): Response {
  if (error instanceof ApiError) {
    const logLevel =
      error.code === "unauthorized" ||
      error.code === "forbidden" ||
      error.code === "rate_limit_exceeded"
        ? "warn"
        : "info";
    const logFn = logLevel === "warn" ? console.warn : console.info;
    logFn(
      JSON.stringify({
        level: logLevel,
        code: error.code,
        status: error.status,
        message: error.message,
        ...context,
      }),
    );
    return Response.json(error.toJSON(), {
      status: error.status,
      headers: error.headers,
    });
  }

  const errorId = crypto.randomUUID();
  console.error(
    JSON.stringify({
      level: "error",
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
