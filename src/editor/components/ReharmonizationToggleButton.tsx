import { Triangle } from "lucide-react";
import { IconButtonTooltip } from "./IconButtonTooltip";
import type { IconTooltipSide } from "./iconTooltipPlacement";

interface ReharmonizationToggleButtonProps {
  pressed: boolean;
  /** No vocal notes in the song: there is nothing to harmonize. */
  disabled: boolean;
  onToggle: () => void;
  tooltipSide?: IconTooltipSide;
}

/** Turns reharmonization on or off (admins only; the caller decides whether to render it). */
export function ReharmonizationToggleButton({
  pressed,
  disabled,
  onToggle,
  tooltipSide,
}: ReharmonizationToggleButtonProps) {
  return (
    <IconButtonTooltip
      side={tooltipSide}
      tooltip={disabled ? "Armonización · La canción no tiene notas de melodía" : "Armonización"}
    >
      <button
        type="button"
        className="track-toolbar__toggle"
        aria-pressed={pressed}
        aria-label="Rearmonización"
        disabled={disabled}
        onClick={onToggle}
      >
        <Triangle size={20} aria-hidden="true" />
      </button>
    </IconButtonTooltip>
  );
}
