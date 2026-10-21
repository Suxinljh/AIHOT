// The studio's five first-level entries, shared by the desktop sidebar, the phone tab bar and the top bar.
import type { ComponentType, SVGProps } from "react";
import { IconDoc, IconFlame, IconList, IconPlug } from "@aihot/web/components/icons";

export const STUDIO_PRODUCT = "WeChatHot";

export interface StudioNavItem {
  to: string;
  label: string;
  /** The phone tab bar's shorter name. */
  short: string;
  icon: ComponentType<{ size?: number }>;
  /** The entry is the exact page, not a section whose child pages share it. */
  end?: boolean;
}

function IconSettings({ size = 18, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6v.2h-4V21a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 00.3-1.9A1.7 1.7 0 003 14H2.8v-4H3a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 009 4.6a1.7 1.7 0 001-1.6v-.2h4V3a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 00-.3 1.9 1.7 1.7 0 001.6 1h.2v4H21a1.7 1.7 0 00-1.6 1z" />
    </svg>
  );
}

export const STUDIO_NAV: StudioNavItem[] = [
  { to: "/studio", label: "热点发现", short: "热点", icon: IconFlame, end: true },
  { to: "/studio/topics", label: "选题管理", short: "选题", icon: IconList },
  { to: "/studio/articles", label: "我的文章", short: "文章", icon: IconDoc },
  { to: "/studio/sources", label: "关注与信源", short: "信源", icon: IconPlug },
  { to: "/studio/settings", label: "设置", short: "设置", icon: IconSettings },
];

/** The entry a path belongs to; the index entry matches only /studio itself. */
export function studioNavFor(pathname: string): StudioNavItem | undefined {
  return STUDIO_NAV.find((item) => item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`));
}

export function studioTitle(title: string): string {
  return `${title} · ${STUDIO_PRODUCT} Studio`;
}

export function studioMeta(title: string) {
  return [{ title: studioTitle(title) }, { name: "robots", content: "noindex, nofollow" }];
}
