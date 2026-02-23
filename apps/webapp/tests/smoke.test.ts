import { describe, expect, it } from "vitest";

describe("smoke test", () => {
  it("should run tests successfully", () => {
    expect(true).toBe(true);
  });

  it("should have access to environment", () => {
    expect(typeof process.env).toBe("object");
  });
});
