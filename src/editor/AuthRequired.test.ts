import { describe, expect, it } from "vitest";
import { authModalReducer } from "./authModalState";

describe("authModalReducer", () => {
  it("closes the login dialog after authentication so a later logout does not reopen it", () => {
    const openedForLogin = authModalReducer(false, "open");
    const closedAfterLogin = authModalReducer(openedForLogin, "authenticated");

    expect(closedAfterLogin).toBe(false);
  });
});
