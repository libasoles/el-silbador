"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

const COPIED_FEEDBACK_MS = 2000;

/** Older mobile browsers, and pages not served over https, have no async clipboard. */
function copyWithSelection(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyWithSelection(text);
  }
}

/** A block of text to paste somewhere else, with a button that copies it exactly: leading
 *  spaces included, since they are what puts each chord over its syllable. */
export function CopyableText({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  // The blank lines around the text only give it room on the page.
  const content = text.replace(/^\n+|\n+$/g, "");

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  return (
    <figure className="article-copyable" aria-label={label}>
      <pre>{content}</pre>
      <button
        type="button"
        className="article-copyable__button"
        aria-label={copied ? "Copiado" : "Copiar"}
        onClick={async () => setCopied(await copyText(content))}
      >
        {copied ? (
          <Check aria-hidden="true" size={18} strokeWidth={1.75} />
        ) : (
          <Copy aria-hidden="true" size={18} strokeWidth={1.75} />
        )}
      </button>
    </figure>
  );
}
