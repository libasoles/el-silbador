const labels = {
  nums: "Mostrar numeración de las sílabas",
  "other-accents": "Mostrar todos los acentos",
  restart: "Reiniciar la numeración en cada grupo",
  notes: "Mostrar aclaraciones bajo los versos",
} as const;

type SettingId = keyof typeof labels;
type NotebookSettings = Record<SettingId, boolean>;
type Subscriber = (settings: Readonly<NotebookSettings>) => void;
const storageKey = "el-silbador-metrica-settings";

// One page-level preference store for every form, variant and custom scheme.
export function mountNotebookSettings(page: HTMLElement, icon: string, signal: AbortSignal) {
  const settings: NotebookSettings = {
    nums: true, "other-accents": false, restart: false, notes: false,
  };
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved && typeof saved === "object") {
      for (const id of Object.keys(labels) as SettingId[]) {
        const value: unknown = Reflect.get(saved, id);
        if (typeof value === "boolean") settings[id] = value;
      }
    }
  } catch { /* Storage can be unavailable; settings still work for this visit. */ }

  const subscribers = new Set<Subscriber>();
  const menu = document.createElement("details");
  menu.className = "composer-settings metrica-settings";
  menu.innerHTML = `<summary aria-label="Configuración del editor" title="Configuración del editor">${icon}</summary><div class="composer-settings-menu"></div>`;
  const controls = menu.querySelector(".composer-settings-menu")!;
  for (const id of Object.keys(labels) as SettingId[]) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = settings[id];
    label.append(input, document.createTextNode(labels[id]));
    controls.append(label);
    input.addEventListener("change", () => {
      settings[id] = input.checked;
      try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch { /* Keep session preferences. */ }
      subscribers.forEach(subscriber => subscriber(settings));
    }, { signal });
  }
  page.prepend(menu);
  document.addEventListener("pointerdown", event => {
    if (event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
  }, { signal });
  menu.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    menu.open = false;
    menu.querySelector("summary")?.focus();
  }, { signal });

  return {
    subscribe(subscriber: Subscriber) {
      subscribers.add(subscriber);
      subscriber(settings);
      return () => { subscribers.delete(subscriber); };
    },
  };
}
