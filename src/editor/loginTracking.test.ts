import { describe, expect, it } from "vitest";
import { isMagicLinkCallback } from "./loginTracking";

describe("isMagicLinkCallback", () => {
  it("detects a Supabase callback fragment with a session", () => {
    expect(isMagicLinkCallback("#access_token=abc&refresh_token=def&type=magiclink")).toBe(true);
  });

  it("ignores empty fragments, plain anchors and callback errors", () => {
    expect(isMagicLinkCallback("")).toBe(false);
    expect(isMagicLinkCallback("#seccion")).toBe(false);
    expect(isMagicLinkCallback("#error=access_denied&error_description=expired")).toBe(false);
  });
});
