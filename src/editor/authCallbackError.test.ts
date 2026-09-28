import { describe, expect, it } from "vitest";
import { readAuthCallbackError } from "./authCallbackError";

describe("readAuthCallbackError", () => {
  it("reads the human-readable Supabase error from an implicit-flow callback", () => {
    expect(
      readAuthCallbackError(
        "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
      ),
    ).toBe("Email link is invalid or has expired");
  });

  it("does nothing for a successful callback", () => {
    expect(readAuthCallbackError("#access_token=example&token_type=bearer")).toBeNull();
  });
});
