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

export function handleApiError(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(error.toJSON(), { status: error.status });
  }

  console.error("Unhandled error:", error);
  const fallback = new ApiError({
    code: "internal_server_error",
    message: "An unexpected error occurred.",
  });
  return Response.json(fallback.toJSON(), { status: fallback.status });
}
