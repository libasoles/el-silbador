import { describe, expect, it } from "vitest";
import { isUnexpectedAuthError } from "./authErrorMessages";

describe("isUnexpectedAuthError", () => {
  it("treats mapped codes as expected", () => {
    expect(isUnexpectedAuthError({ code: "over_email_send_rate_limit" })).toBe(false);
  });

  it("flags unmapped server failures and non-objects", () => {
    expect(isUnexpectedAuthError({ code: "unexpected_failure", message: "Error sending magic link email" })).toBe(true);
    expect(isUnexpectedAuthError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isUnexpectedAuthError(undefined)).toBe(true);
  });
});
