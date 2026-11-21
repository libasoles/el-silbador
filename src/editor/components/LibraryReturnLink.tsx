"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { claimLibraryNavigation, LIBRARY_RETURN_STATE_KEY } from "../libraryNavigation";

export function LibraryReturnLink({ children, className }: {
  children: ReactNode;
  className: string;
}) {
  useEffect(() => {
    if (!claimLibraryNavigation()) return;
    // Bind the return action to this history entry. It also survives reload and forward.
    window.history.replaceState(
      { ...window.history.state, [LIBRARY_RETURN_STATE_KEY]: true },
      "",
      window.location.href,
    );
  }, []);

  return (
    <Link
      href="/"
      className={className}
      aria-label="Volver al índice"
      onNavigate={(event) => {
        if (!window.history.state?.[LIBRARY_RETURN_STATE_KEY]) return;
        event.preventDefault();
        window.history.back();
      }}
    >
      {children}
    </Link>
  );
}
