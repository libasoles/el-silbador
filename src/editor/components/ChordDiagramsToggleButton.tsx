import { Grid2X2 } from "lucide-react";
import { IconButtonTooltip } from "./IconButtonTooltip";

export function ChordDiagramsToggleButton({ pressed, onToggle }: { pressed: boolean; onToggle: () => void }) {
  return (
    <IconButtonTooltip tooltip="Diagramas de guitarra">
      <button type="button" className="track-toolbar__toggle" aria-pressed={pressed}
        aria-label="Diagramas de guitarra" onClick={onToggle}>
        <Grid2X2 size={20} />
      </button>
    </IconButtonTooltip>
  );
}
