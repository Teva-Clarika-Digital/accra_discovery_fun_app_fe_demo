import { adviceTone, type Advice } from "@/lib/best-time";
import { cn } from "@/lib/utils";

/**
 * The "go now" line — the product's signature element.
 *
 * One sentence, one tone, no numbers to decode. Rendered server-side too: the
 * placeholder is time-agnostic so there is no hydration mismatch, and the live
 * variant upgrades itself on the client.
 */

const TONE_STYLE: Record<ReturnType<typeof adviceTone>, string> = {
  live: "border-live/25 bg-live-soft text-live",
  soon: "border-warn/25 bg-warn-soft text-warn",
  later: "border-line bg-mist text-ink-2",
  dead: "border-line bg-mist text-dead line-through decoration-dead/60",
};

const TONE_GLYPH: Record<ReturnType<typeof adviceTone>, string> = {
  live: "●",
  soon: "◐",
  later: "○",
  dead: "⊘",
};

export function AdviceLine({
  advice,
  className,
}: {
  advice: Advice;
  className?: string;
}) {
  const tone = adviceTone(advice);
  return (
    <p
      className={cn(
        "inline-flex w-fit max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-[12px] font-medium",
        TONE_STYLE[tone],
        className,
      )}
    >
      <span aria-hidden className="text-[9px] leading-none">
        {TONE_GLYPH[tone]}
      </span>
      <span className="truncate">{advice.label}</span>
      <span className="text-current/65">— {advice.detail}</span>
    </p>
  );
}
