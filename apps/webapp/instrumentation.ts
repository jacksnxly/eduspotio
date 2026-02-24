import { createOnRequestError } from "@axiomhq/nextjs";
import { logger } from "@/lib/axiom";

export const onRequestError = createOnRequestError(logger);
