import { PrivacyLockedIcon } from "./components/icons";
import type { ToastOptions } from "./toastContext";

/** Confirms a save that finished after signing in. A new song starts private, hence the lock. */
export const SONG_SAVED_TOAST: ToastOptions = {
  variant: "success",
  icon: <PrivacyLockedIcon />,
  title: "Canción guardada",
  description: "Para compartir el enlace, hacela pública con el candado.",
};
