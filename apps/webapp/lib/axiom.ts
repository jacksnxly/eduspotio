import { Axiom } from "@axiomhq/js";
import {
  AxiomJSTransport,
  ConsoleTransport,
  Logger,
  type Transport,
} from "@axiomhq/logging";
import { nextJsFormatters } from "@axiomhq/nextjs";

// Read process.env directly (not our env.ts) to avoid circular imports
// and build-phase issues. Both vars are optional — when absent, only
// ConsoleTransport is used (same DX as before Axiom integration).
const transports: [Transport, ...Transport[]] = [
  new ConsoleTransport({
    prettyPrint: process.env.NODE_ENV !== "production",
  }),
];

if (process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET) {
  transports.push(
    new AxiomJSTransport({
      axiom: new Axiom({ token: process.env.AXIOM_TOKEN }),
      dataset: process.env.AXIOM_DATASET,
    }),
  );
}

export const logger = new Logger({
  transports,
  formatters: nextJsFormatters,
});
