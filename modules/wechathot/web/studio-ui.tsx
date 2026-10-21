// The page body shared by the studio's first five entries: a page heading and one empty state until its
// feature arrives. The shell (sidebar, top bar, tab bar) lives in studio-layout.tsx.
import type { ComponentType, ReactNode } from "react";
import { STUDIO_PRODUCT } from "./studio-nav";

export interface StudioPageProps {
  title: string;
  description: string;
  icon: ComponentType<{ size?: number }>;
  emptyTitle: string;
  emptyBody: string;
  /** The milestone that will fill this page. */
  stage: string;
  /** A real entry point that exists before the page's own feature arrives. */
  action?: ReactNode;
}

export function StudioPage({ title, description, icon: Icon, emptyTitle, emptyBody, stage, action }: StudioPageProps) {
  return (
    <div>
      <header className="max-w-[760px]">
        <div className="mono text-[11px] uppercase tracking-[0.18em] text-ink-4">{STUDIO_PRODUCT} / Studio</div>
        <h1 className="mt-2 text-[28px] font-black leading-[1.2] tracking-[-0.03em] text-ink sm:text-[34px]">{title}</h1>
        <p className="mt-3 text-[14px] leading-[1.8] text-ink-3">{description}</p>
        {action && <div className="mt-4 flex flex-wrap items-center gap-2">{action}</div>}
      </header>

      <section className="mt-8 rounded-card border border-dashed border-line-strong bg-surface/60 px-5 py-12 text-center sm:px-8 sm:py-16">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon size={22} />
        </div>
        <h2 className="mt-4 text-[17px] font-semibold text-ink">{emptyTitle}</h2>
        <p className="mx-auto mt-2 max-w-[38em] text-[13.5px] leading-[1.8] text-ink-3">{emptyBody}</p>
        <div className="mono mt-5 inline-flex items-center rounded-full border border-line bg-bg-sunk px-3 py-1 text-[11px] text-ink-4">{stage}</div>
      </section>
    </div>
  );
}
