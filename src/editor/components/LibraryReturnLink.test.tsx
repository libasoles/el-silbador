import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { LibraryReturnLink } from "./LibraryReturnLink";
import { rememberLibraryNavigation } from "../libraryNavigation";

// Model Next Link's onNavigate contract without starting a router: only same-tab clicks
// invoke it, and preventDefault cancels the new navigation.
const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ onNavigate, children, ...props }: {
    onNavigate: (event: { preventDefault: () => void }) => void;
    children: ReactNode;
    href: string;
  }) => (
    <a {...props} onClick={(event) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) return;
      let prevented = false;
      onNavigate({ preventDefault: () => { prevented = true; } });
      if (!prevented) navigation.push(props.href);
    }}>{children}</a>
  ),
}));

function renderClose() {
  return render(<LibraryReturnLink className="app-close">Cerrar</LibraryReturnLink>);
}

afterEach(() => {
  vi.restoreAllMocks();
  navigation.push.mockClear();
  window.history.replaceState(null, "", "/");
});

describe("returning to the library", () => {
  it("returns to the existing history entry instead of pushing a fresh index", () => {
    window.history.replaceState({ nextState: "preserved" }, "", "/cancion/zamba");
    rememberLibraryNavigation("/cancion/zamba");
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    const view = renderClose();
    expect(window.history.state.nextState).toBe("preserved");
    fireEvent.click(screen.getByRole("link", { name: "Volver al índice" }));
    expect(back).toHaveBeenCalledOnce();
    expect(navigation.push).not.toHaveBeenCalled();

    // Reloading/remounting the song still points back to the same index entry.
    view.unmount();
    renderClose();
    fireEvent.click(screen.getByRole("link", { name: "Volver al índice" }));
    expect(back).toHaveBeenCalledTimes(2);
  });

  it("opens the index for a song loaded directly, even with previous browser history", () => {
    window.history.replaceState(null, "", "/cancion/directa");
    const back = vi.spyOn(window.history, "back");
    renderClose();
    fireEvent.click(screen.getByRole("link", { name: "Volver al índice" }));
    expect(navigation.push).toHaveBeenCalledWith("/");
    expect(back).not.toHaveBeenCalled();
  });

  it("does not use a pending return for a different song", () => {
    rememberLibraryNavigation("/cancion/zamba");
    window.history.replaceState(null, "", "/cancion/otra");
    renderClose();
    fireEvent.click(screen.getByRole("link", { name: "Volver al índice" }));
    expect(navigation.push).toHaveBeenCalledWith("/");
  });

  it("keeps the index href and normal new-tab behavior", () => {
    window.history.replaceState(null, "", "/cancion/zamba");
    rememberLibraryNavigation("/cancion/zamba");
    const back = vi.spyOn(window.history, "back");
    renderClose();
    const link = screen.getByRole("link", { name: "Volver al índice" });
    expect(link).toHaveAttribute("href", "/");
    fireEvent.click(link, { ctrlKey: true });
    expect(back).not.toHaveBeenCalled();
  });
});
