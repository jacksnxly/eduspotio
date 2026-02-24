import { z } from "zod";
import { logger } from "@/lib/axiom";
import { ApiError } from "../errors";

export async function parseRequestBody<T extends z.ZodType>(
  req: Request,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch (err) {
    logger.info("JSON parse failed", {
      type: "json_parse_failed",
      error: err instanceof Error ? err.message : String(err),
      contentType: req.headers.get("content-type"),
    });
    throw new ApiError({
      code: "bad_request",
      message: "Request body must be valid JSON.",
    });
  }
  return schema.parse(raw); // ZodError caught by handleApiError in the HOF
}
