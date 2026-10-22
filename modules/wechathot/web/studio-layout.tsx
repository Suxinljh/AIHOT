// The private studio shell: desktop sidebar, sticky top bar, phone tab bar and the session check every
// navigation goes through. The public reader chrome in root.tsx is bypassed for /studio.
import { Link, NavLink, Outlet, useLoaderData, useLocation, useNavigation, type LoaderFunctionArgs, type MetaFunction, type ShouldRevalidateFunction } from "react-router";
import type { AdminMe } from "@aihot/contracts/admin";
import { RingMark } from "@aihot/site/brand/Logo.tsx";
import { NavigationProgress } from "@aihot/web/components/shell/Chrome";
import { IconBell } from "@aihot/web/components/icons";
import { Toaster } from "@aihot/web/features/admin/toast";
import { adminGet } from "@aihot/web/lib/admin.server";
import { STUDIO_NAV, STUDIO_PRODUCT, studioNavFor } from "./studio-nav";

export async function loader({ request }: LoaderFunctionArgs) {
  return { me: await adminGet<AdminMe>(request, "/api/studio/me") };
}

// Verify the session on every navigation, not only when the layout first mounts.
export const shouldRevalidate: ShouldRevalidateFunction = () => true;

export const meta: MetaFunction = () => [{ name: "robots", content: "noindex, nofollow" }];

export const headers = () => ({
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Accel-Buffering": "no",
});

function Logout() {
  return (
    <form method="post" action="/api/auth/logout">
      <button type="submit" className="rounded-full px-2.5 py-1 text-[12px] text-ink-4 transition-colors hover:bg-bg-sunk hover:text-ink-2">
        退出登录
      </button>
    </form>
  );
}

function SidebarLink({ item }: { item: (typeof STUDIO_NAV)[number] }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      prefetch="intent"
      className={({ isActive }) => `group flex h-10 items-center gap-3 rounded-control px-3 text-[13.5px] transition-colors ${
        isActive ? "bg-surface font-semibold text-ink shadow-sm ring-1 ring-line" : "font-medium text-ink-3 hover:bg-bg-sunk hover:text-ink"
      }`}
    >
      {({ isActive }) => (
        <>
          <span className={isActive ? "text-accent" : "text-ink-4 group-hover:text-ink-3"}><Icon size={17} /></span>
          <span className="min-w-0 truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function TabLink({ item }: { item: (typeof STUDIO_NAV)[number] }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      prefetch="intent"
      className={({ isActive }) => `flex min-w-0 flex-col items-center justify-center gap-[2px] text-[10.5px] transition-colors ${
        isActive ? "font-semibold text-accent" : "text-ink-3 active:text-ink"
      }`}
    >
      {({ isActive }) => (
        <>
          <Icon size={22} />
          <span className="truncate">{item.short}</span>
        </>
      )}
    </NavLink>
  );
}

export default function StudioLayout() {
  const { me } = useLoaderData<typeof loader>();
  const { pathname } = useLocation();
  const navigation = useNavigation();
  const current = studioNavFor(pathname);
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <NavigationProgress active={navigation.state === "loading"} />
      <a href="#studio-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-control focus:bg-surface focus:px-3 focus:py-2">
        跳到工作台内容
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-line bg-bg-sunk/45 px-3 py-5 lg:flex">
        <Link to="/studio" className="flex items-center gap-2.5 px-2" aria-label={`${STUDIO_PRODUCT} Studio 首页`}>
          <RingMark className="size-7 text-accent" />
          <span className="text-[15px] font-black tracking-[-0.03em] text-ink">{STUDIO_PRODUCT}</span>
          <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-accent">Studio</span>
        </Link>

        <nav aria-label="工作台导航" className="scrollbar-thin mt-7 flex-1 space-y-1 overflow-y-auto">
          {STUDIO_NAV.map((item) => <SidebarLink key={item.to} item={item} />)}
        </nav>

        <div className="mt-4 border-t border-line px-3 pt-4">
          <div className="truncate text-[12.5px] font-medium text-ink-2">{me.name}</div>
          <div className="mt-0.5 text-[11px] text-ink-4">{me.dev ? "开发会话" : "单用户工作台"}</div>
          <div className="-ml-2.5 mt-2"><Logout /></div>
        </div>
      </aside>

      <div className="lg:pl-[232px]">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-3 px-4 lg:h-16 lg:px-8">
            <div className="flex min-w-0 items-center gap-2.5">
              <RingMark className="size-5 shrink-0 text-accent lg:hidden" />
              <div className="min-w-0">
                <div className="mono text-[9.5px] uppercase tracking-[0.16em] text-ink-4">WeChatHot Studio</div>
                <div className="truncate text-[13.5px] font-semibold text-ink">{current?.label ?? "工作台"}</div>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="hidden max-w-[160px] truncate text-[12px] text-ink-4 sm:inline">{me.name}</span>
              <Link
                to="/studio/alerts"
                aria-label="通知"
                title="通知"
                className="inline-flex size-8 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-bg-sunk hover:text-ink"
              >
                <IconBell size={17} />
              </Link>
              <Logout />
            </div>
          </div>
        </header>

        <main id="studio-main" className="mx-auto w-full max-w-[1120px] px-4 pb-[calc(84px+env(safe-area-inset-bottom))] pt-6 lg:px-8 lg:pb-16 lg:pt-10">
          <Outlet />
        </main>
      </div>

      <nav aria-label="工作台底部导航" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_var(--line)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid h-[58px] max-w-[640px] grid-cols-5">
          {STUDIO_NAV.map((item) => <TabLink key={item.to} item={item} />)}
        </div>
      </nav>

      <Toaster className="bottom-[calc(74px+env(safe-area-inset-bottom))] lg:bottom-4" />
    </div>
  );
}
