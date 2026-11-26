import {
  BicepsFlexed, Check, ChevronLeft, ChevronRight, RotateCcw, ArrowRight, ChevronDown, CircleAlert, CircleCheck, CircleHelp, Copy, ExternalLink, Info,
  Lightbulb, Plus, Settings, Trash2, TriangleAlert, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// React portals render icons into placeholders owned by the imperative editor.
export const notebookIconComponents: Record<string, LucideIcon> = {
  check: Check,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "rotate-ccw": RotateCcw,
  "arrow-right": ArrowRight,
  "chevron-down": ChevronDown,
  "circle-alert": CircleAlert,
  "circle-check": CircleCheck,
  "circle-help": CircleHelp,
  copy: Copy,
  "external-link": ExternalLink,
  "biceps-flexed": BicepsFlexed,
  info: Info,
  lightbulb: Lightbulb,
  plus: Plus,
  settings: Settings,
  "trash-2": Trash2,
  "triangle-alert": TriangleAlert,
  x: X,
};

export const notebookIcons = Object.fromEntries(
  Object.keys(notebookIconComponents).map((name) => [
    name, `<span class="metrica-icon" data-metrica-icon="${name}" aria-hidden="true"></span>`,
  ]),
);
