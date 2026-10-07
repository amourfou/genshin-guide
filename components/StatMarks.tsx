import type { CSSProperties } from "react";
import { STAT_LABEL } from "@/lib/stats";
import type { StatMark } from "@/lib/graduation";
import { cn } from "@/lib/utils";

const COLUMNS = {
  "--mark-semi": "5.75rem",
  "--mark-grad": "5rem",
} as CSSProperties;

const SEMI_EDGE = "(100% - var(--mark-grad) - var(--mark-semi) / 2)";
const GRAD_EDGE = "(100% - var(--mark-grad) / 2)";

function formatMark(value: number, percent: boolean): string {
  const text = percent
    ? Number.isInteger(value)
      ? value.toFixed(0)
      : value.toFixed(1)
    : Math.round(value).toLocaleString("ko-KR");
  return percent ? `${text}%` : text;
}

function fillWidth(mark: StatMark): string {
  const { value, semi, grad, max } = mark;
  if (value <= semi || grad <= semi) {
    const ratio = semi <= 0 ? 0 : Math.min(1, Math.max(0, value / semi));
    return `calc(${ratio.toFixed(4)} * ${SEMI_EDGE})`;
  }
  if (value <= grad) {
    const ratio = (value - semi) / (grad - semi);
    return `calc(${(1 - ratio).toFixed(4)} * ${SEMI_EDGE} + ${ratio.toFixed(4)} * ${GRAD_EDGE})`;
  }
  const ceiling = Math.max(max, grad + 1);
  const ratio = Math.min(1, Math.max(0, (value - grad) / (ceiling - grad)));
  return `calc(${(1 - ratio).toFixed(4)} * ${GRAD_EDGE} + ${ratio.toFixed(4)} * 100%)`;
}

export function StatMarks({ marks }: { marks: StatMark[] }) {
  if (marks.length === 0) return null;
  return (
    <div className="mt-3 space-y-3" style={COLUMNS}>
      {marks.map((mark) => (
        <div key={mark.key}>
          <div className="grid items-baseline" style={{ gridTemplateColumns: "minmax(0,1fr) var(--mark-semi) var(--mark-grad)" }}>
            <p className="flex min-w-0 items-baseline gap-1.5 text-sm">
              <span className="truncate">{STAT_LABEL[mark.key]}</span>
              <span
                className={cn(
                  "shrink-0 font-semibold tabular-nums",
                  mark.status === "grad" && "text-accent",
                  mark.status === "semi" && "text-primary",
                  mark.status === "before" && "text-foreground"
                )}
              >
                {formatMark(mark.value, mark.percent)}
              </span>
            </p>
            <p data-mark="semi" className="text-center text-xs tabular-nums text-muted-foreground">
              준졸업{formatMark(mark.semi, mark.percent)}
            </p>
            <p data-mark="grad" className="text-center text-xs tabular-nums text-muted-foreground">
              졸업{formatMark(mark.grad, mark.percent)}
            </p>
          </div>
          <div className="relative mt-1 h-3.5" aria-hidden>
            <div className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full rounded-full",
                  mark.status === "grad" && "bg-accent",
                  mark.status === "semi" && "bg-primary",
                  mark.status === "before" && "bg-primary/45"
                )}
                style={{ width: fillWidth(mark) }}
              />
            </div>
            <span
              data-tick="semi"
              className="absolute top-0 h-full w-0.5 -translate-x-1/2 rounded-full bg-foreground/55"
              style={{ left: `calc${SEMI_EDGE}` }}
            />
            <span
              data-tick="grad"
              className="absolute top-0 h-full w-0.5 -translate-x-1/2 rounded-full bg-foreground"
              style={{ left: `calc${GRAD_EDGE}` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
