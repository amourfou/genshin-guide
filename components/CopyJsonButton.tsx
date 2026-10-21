"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Old-school copy that also works on iOS Safari. Must run inside the user gesture. */
function legacyCopy(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.contentEditable = "true";
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "0";
  area.style.opacity = "0";
  area.style.fontSize = "16px"; // prevents iOS zoom
  document.body.appendChild(area);
  try {
    const range = document.createRange();
    range.selectNodeContents(area);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    area.focus();
    area.select();
    area.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    window.getSelection()?.removeAllRanges();
    document.body.removeChild(area);
  }
}

export function CopyJsonButton({ build, label = "복사", className }: { build: () => string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (manual && manualRef.current) {
      manualRef.current.focus();
      manualRef.current.select();
    }
  }, [manual]);

  function done() {
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  function onClick() {
    const text = build(); // built synchronously, before any clipboard call
    const fallback = () => {
      if (legacyCopy(text)) done();
      else setManual(text);
    };
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText && window.isSecureContext) {
      try {
        navigator.clipboard.writeText(text).then(done, fallback);
        return;
      } catch {
        // fall through
      }
    }
    fallback();
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-live="polite"
        className={cn(
          "inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-border px-3 text-sm",
          copied && "border-primary text-primary",
          className
        )}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "복사됨" : label}
      </button>
      {manual !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-3xl bg-card p-4">
            <p className="text-sm leading-6">자동 복사가 안 돼요. 아래 글을 길게 눌러 전체 선택 후 복사해 주세요.</p>
            <textarea
              ref={manualRef}
              readOnly
              value={manual}
              className="mt-3 h-72 w-full rounded-2xl border border-input bg-background p-3 font-mono text-xs"
              onFocus={(event) => event.currentTarget.select()}
            />
            <button type="button" onClick={() => setManual(null)} className="mt-3 h-11 w-full rounded-2xl bg-primary text-primary-foreground">
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
