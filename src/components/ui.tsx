import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The internal UI kit.
 *
 * No component library: the whole look is these seven primitives plus tokens. Keeping
 * them here means the app can never drift into somebody else's visual language.
 */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-white hover:bg-ink-2 border border-ink hover:border-ink-2",
  secondary:
    "bg-canvas text-ink border border-line hover:border-line-strong hover:bg-mist",
  ghost: "bg-transparent text-ink-2 hover:bg-mist border border-transparent",
  danger:
    "bg-canvas text-accent-ink border border-accent/40 hover:bg-accent-soft",
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-base",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(
    BUTTON_BASE,
    BUTTON_VARIANT[variant],
    BUTTON_SIZE[size],
    className,
  );
}

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} & ComponentProps<"button">;

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      {...rest}
    />
  );
}

type ButtonLinkProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} & ComponentProps<typeof Link>;

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

export function Chip({
  active = false,
  className,
  children,
  ...rest
}: { active?: boolean } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors duration-150",
        active
          ? "border-ink bg-ink text-white"
          : "border-line bg-canvas text-ink-2 hover:border-line-strong hover:bg-mist",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Pill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "live" | "soon" | "dead" | "warn" | "accent";
  className?: string;
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-mist text-ink-2 border-line",
    live: "bg-live-soft text-live border-live/25",
    soon: "bg-warn-soft text-warn border-warn/25",
    dead: "bg-mist text-dead border-line",
    warn: "bg-warn-soft text-warn border-warn/25",
    accent: "bg-accent-soft text-accent-ink border-accent/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-tight",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} aria-hidden />;
}

export function EmptyState({
  title,
  body,
  action,
  glyph = "◦",
}: {
  title: string;
  body: string;
  action?: ReactNode;
  glyph?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong px-6 py-12 text-center">
      <span className="text-2xl text-ink-4" aria-hidden>
        {glyph}
      </span>
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      <p className="max-w-sm text-[13px] leading-relaxed text-ink-3">{body}</p>
      {action}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">
      {children}
    </h2>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-line", className)} />;
}

/** A small coloured dot — the only place category colour is allowed to be a shape. */
export function CategoryDot({
  color,
  className,
}: {
  color: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}
