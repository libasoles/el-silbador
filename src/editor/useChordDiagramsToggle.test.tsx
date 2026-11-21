import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useChordDiagramsToggle } from "./useChordDiagramsToggle";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("per-song diagram preference", () => {
  it("keeps a new song's choice when it gets its permanent ID", () => {
    const onShow = vi.fn();
    const initialProps: { id: string | undefined } = { id: undefined };
    const { result, rerender } = renderHook(
      ({ id }: { id: string | undefined }) => useChordDiagramsToggle(id, onShow),
      { initialProps },
    );
    act(() => result.current.toggle());
    expect(result.current.pressed).toBe(true);
    rerender({ id: "new-song" });
    expect(result.current.pressed).toBe(true);
    expect(localStorage.getItem("el-silbador:chord-diagrams:new-song")).toBe("true");
    rerender({ id: "another-song" });
    expect(result.current.pressed).toBe(false);
  });

  it("still toggles when browser storage cannot be written", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("unavailable"); });
    const onShow = vi.fn();
    const { result } = renderHook(() => useChordDiagramsToggle("restricted-song", onShow));
    act(() => result.current.toggle());
    expect(result.current.pressed).toBe(true);
    expect(onShow).toHaveBeenCalled();
    act(() => result.current.toggle());
    expect(result.current.pressed).toBe(false);
  });
});
