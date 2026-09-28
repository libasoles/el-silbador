import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const auth = readFileSync(new URL("./auth.ts", import.meta.url), "utf8");

describe("signInWithMagicLink", () => {
  it("drops any hash from the redirect URL", () => {
    // A stale `#access_token=...` left over from a previous magic-link callback must never be
    // echoed back to Supabase, or it gets a second hash appended and produces an unparsable
    // double-fragment redirect URL.
    expect(auth).not.toContain("emailRedirectTo: window.location.href");
    expect(auth).toContain("emailRedirectTo: `${location.origin}${location.pathname}${location.search}`");
  });
});
