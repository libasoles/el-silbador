import {
  Check, PanelLeftClose, PanelRightClose, RotateCcw, ArrowRight, ChevronDown, CircleAlert, CircleCheck, CircleHelp, Copy, Info,
  Lightbulb, Plus, Settings, Trash2, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// React portals render icons into placeholders owned by the imperative editor.
export const notebookIconComponents: Record<string, LucideIcon> = {
  check: Check,
  "panel-left-close": PanelLeftClose,
  "panel-right-close": PanelRightClose,
  "rotate-ccw": RotateCcw,
  "arrow-right": ArrowRight,
  "chevron-down": ChevronDown,
  "circle-alert": CircleAlert,
  "circle-check": CircleCheck,
  "circle-help": CircleHelp,
  copy: Copy,
  info: Info,
  lightbulb: Lightbulb,
  plus: Plus,
  settings: Settings,
  "trash-2": Trash2,
  x: X,
};

export const notebookIcons = Object.fromEntries(
  Object.keys(notebookIconComponents).map((name) => [
    name, `<span class="metrica-icon" data-metrica-icon="${name}" aria-hidden="true"></span>`,
  ]),
);
