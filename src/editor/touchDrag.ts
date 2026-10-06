/** How long a finger rests on an element before it picks it up. Shorter, and scrolling past it
 *  would grab it; any movement before then is left to the browser as a scroll. */
export const TOUCH_DRAG_HOLD_MS = 250;
const TOUCH_SLOP = 10;
/** The picked-up copy floats above the finger so the finger doesn't hide it. */
const GHOST_LIFT = 28;

/** Script-made DataTransfer, or a stand-in where the browser (or jsdom) can't construct one. */
function createDataTransfer(): DataTransfer {
  if (typeof DataTransfer === "function") {
    try {
      return new DataTransfer();
    } catch {
      // Falls through to the stand-in.
    }
  }
  const data = new Map<string, string>();
  return {
    dropEffect: "none",
    effectAllowed: "all",
    setData: (format: string, value: string) => void data.set(format, value),
    getData: (format: string) => data.get(format) ?? "",
    clearData: () => data.clear(),
    setDragImage: () => {},
    types: [],
    files: [],
    items: [],
  } as unknown as DataTransfer;
}

function dispatchDragEvent(
  target: EventTarget,
  type: string,
  point: { x: number; y: number },
  dataTransfer: DataTransfer,
) {
  const init = {
    bubbles: true,
    cancelable: type !== "dragleave" && type !== "dragend",
    composed: true,
    clientX: point.x,
    clientY: point.y,
  };
  const event: MouseEvent & { dataTransfer?: DataTransfer | null } =
    typeof DragEvent === "function"
      ? new DragEvent(type, { ...init, dataTransfer })
      : new MouseEvent(type, init);
  if (event.dataTransfer !== dataTransfer) {
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  }
  target.dispatchEvent(event);
  return event;
}

function createGhost(source: HTMLElement) {
  const rect = source.getBoundingClientRect();
  const computed = getComputedStyle(source);
  const ghost = source.cloneNode(true) as HTMLElement;
  ghost.removeAttribute("id");
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed",
    top: "0",
    left: "0",
    zIndex: "1000",
    width: `${rect.width}px`,
    margin: "0",
    font: computed.font,
    color: computed.color,
    pointerEvents: "none",
    transform: "translate(-9999px, -9999px)",
  });
  document.body.appendChild(ghost);
  return {
    moveTo({ x, y }: { x: number; y: number }) {
      ghost.style.transform = `translate(${x - rect.width / 2}px, ${y - rect.height - GHOST_LIFT}px) scale(1.6)`;
    },
    remove: () => ghost.remove(),
  };
}

/** A tap that ended a drag must not also count as a click on whatever was under the finger. */
function swallowNextClick() {
  const swallow = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };
  document.addEventListener("click", swallow, { capture: true, once: true });
  window.setTimeout(() => document.removeEventListener("click", swallow, { capture: true }), 400);
}

function isEditable(target: EventTarget | null): target is HTMLElement {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.closest("[contenteditable]")?.getAttribute("contenteditable") === "true" ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement)
  );
}

/** Inside an editable song, the browser answers a long press by putting a caret in the text, and
 *  the keyboard it opens resizes the page under the finger. Only a tap may open it: while a press
 *  is held, and for a moment after a drag ends, anything editable that takes focus loses it. */
function keepKeyboardClosed() {
  const refuse = ({ target }: FocusEvent) => {
    // Once the focus has settled: the editor's own focus handler would otherwise take it back.
    if (isEditable(target)) queueMicrotask(() => target.blur());
  };
  document.addEventListener("focusin", refuse, { capture: true });
  return {
    /** A press that becomes a drag closes a keyboard it opened before the drag began. */
    closeOpened(focusedBefore: Element | null) {
      const focused = document.activeElement;
      if (focused !== focusedBefore && isEditable(focused)) focused.blur();
    },
    release(lingerMs = 0) {
      const stop = () => document.removeEventListener("focusin", refuse, { capture: true });
      if (lingerMs > 0) window.setTimeout(stop, lingerMs);
      else stop();
    },
  };
}

/**
 * Lets a finger drag `source` the way a mouse drags a `draggable` element. Phones don't run
 * HTML5 drag and drop for touch, so a long press picks the element up and the usual drag events
 * (dragstart, dragenter, dragover, dragleave, drop, dragend) are dispatched to whatever is under
 * the finger: drop targets written for the mouse work unchanged.
 *
 * Returns a cleanup that stops listening for new presses.
 */
export function enableTouchDrag(source: HTMLElement): () => void {
  let active = false;
  let pending = false;

  function handlePointerDown(down: PointerEvent) {
    if (down.pointerType !== "touch" || !down.isPrimary || pending || active) return;
    const pointerId = down.pointerId;
    const start = { x: down.clientX, y: down.clientY };
    let point = start;
    let over: Element | null = null;
    let dropAllowed = false;
    let ghost: ReturnType<typeof createGhost> | null = null;
    const dataTransfer = createDataTransfer();
    const focusedBefore = document.activeElement;
    const keyboard = keepKeyboardClosed();
    pending = true;

    const hold = window.setTimeout(() => {
      pending = false;
      const dragStart = dispatchDragEvent(source, "dragstart", start, dataTransfer);
      if (dragStart.defaultPrevented) return finish();
      active = true;
      keyboard.closeOpened(focusedBefore);
      ghost = createGhost(source);
      ghost.moveTo(start);
      navigator.vibrate?.(10);
      dragOver();
    }, TOUCH_DRAG_HOLD_MS);

    function dragOver() {
      const under = document.elementFromPoint(point.x, point.y);
      if (under !== over) {
        // Same order as the browser's own: the new target hears about it before the old one.
        if (under) dispatchDragEvent(under, "dragenter", point, dataTransfer);
        if (over) dispatchDragEvent(over, "dragleave", point, dataTransfer);
        over = under;
      }
      dropAllowed = over
        ? dispatchDragEvent(over, "dragover", point, dataTransfer).defaultPrevented
        : false;
    }

    function handleMove(move: PointerEvent) {
      if (move.pointerId !== pointerId) return;
      point = { x: move.clientX, y: move.clientY };
      if (!active) {
        if (Math.hypot(point.x - start.x, point.y - start.y) > TOUCH_SLOP) finish();
        return;
      }
      ghost?.moveTo(point);
      dragOver();
    }

    function handleUp(up: PointerEvent) {
      if (up.pointerId !== pointerId) return;
      if (active) {
        point = { x: up.clientX, y: up.clientY };
        if (over && dropAllowed) dispatchDragEvent(over, "drop", point, dataTransfer);
        dispatchDragEvent(source, "dragend", point, dataTransfer);
        swallowNextClick();
      }
      finish();
    }

    function handleCancel(cancel: PointerEvent) {
      if (cancel.pointerId !== pointerId) return;
      if (active) {
        if (over) dispatchDragEvent(over, "dragleave", point, dataTransfer);
        dispatchDragEvent(source, "dragend", point, dataTransfer);
      }
      finish();
    }

    function finish() {
      window.clearTimeout(hold);
      keyboard.release(active ? 400 : 0);
      pending = false;
      active = false;
      ghost?.remove();
      ghost = null;
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      document.removeEventListener("pointercancel", handleCancel);
    }

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    document.addEventListener("pointercancel", handleCancel);
  }

  // Touch scrolling can only be stopped from a non-passive listener that was already in place
  // when the finger came down, and touchmove keeps targeting the element the touch started on.
  function handleTouchMove(event: TouchEvent) {
    if (active) event.preventDefault();
  }

  // The long press would otherwise open the browser's own menu, or start selecting text.
  function handleContextMenu(event: Event) {
    if (pending || active) event.preventDefault();
  }

  source.addEventListener("pointerdown", handlePointerDown);
  source.addEventListener("touchmove", handleTouchMove, { passive: false });
  source.addEventListener("contextmenu", handleContextMenu);
  return () => {
    source.removeEventListener("pointerdown", handlePointerDown);
    source.removeEventListener("touchmove", handleTouchMove);
    source.removeEventListener("contextmenu", handleContextMenu);
  };
}
