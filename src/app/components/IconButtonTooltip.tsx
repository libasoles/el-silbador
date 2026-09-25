import type { ReactNode } from "react";

interface IconButtonTooltipProps {
  tooltip: string;
  children: ReactNode;
}

/** Wraps an icon button with a hover/focus tooltip, shared by every page that uses icon-only
 *  actions (the song editor's toolbars, the library's + and star buttons). */
export function IconButtonTooltip({ tooltip, children }: IconButtonTooltipProps) {
  return (
    <span className="icon-button-tooltip" data-tooltip={tooltip}>
      {children}
    </span>
  );
}
