import { IconButtonTooltip } from "./IconButtonTooltip";
import { TabsIcon } from "./icons";

interface TabsToggleButtonProps {
  pressed: boolean;
  onToggle: () => void;
}

/** Shows or hides a song's tab blocks. */
export function TabsToggleButton({ pressed, onToggle }: TabsToggleButtonProps) {
  return (
    <IconButtonTooltip tooltip="Tablaturas">
      <button
        type="button"
        className="track-toolbar__toggle"
        aria-pressed={pressed}
        aria-label="Tablaturas"
        onClick={onToggle}
      >
        <TabsIcon />
      </button>
    </IconButtonTooltip>
  );
}
