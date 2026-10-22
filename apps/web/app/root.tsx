import { isRouteErrorResponse, Link, Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation, useRouteError, useRouteLoaderData } from "react-router";
import type { Route } from "./+types/root";
import "./app.css";
import { APPEARANCE_BOOT_SCRIPT, useAppearanceSync } from "./lib/local-state";
import { buttonClass } from "./components/ui/Controls";

/** The release this document was rendered by; entry.client reloads once a newer one is deployed. */
export function loader() {
  return { release: process.env.AIHOT_RELEASE ?? null };
}

/**
 * The document around every page. The public reading site is retired, so there is no reader chrome
 * here: the admin and the studio bring their own sidebars, top bars and footers.
 */
export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        {data?.release && <meta name="aihot-release" content={data.release} />}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#faf9f6" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#13191c" />
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOT_SCRIPT }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration getKey={(location) => location.key} />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  useAppearanceSync();
  // iOS Safari only shows :active (pressed) styles once the document listens for touches.
  return <Outlet />;
}

export function ErrorBoundary() {
  useAppearanceSync();
  const error = useRouteError();
  const { pathname, search, hash } = useLocation();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const notFound = status === 404;
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="max-w-sm text-center">
        <div className="mono text-[12px] text-ink-4">{status}</div>
        <h1 className="mt-1.5 text-[20px] font-bold text-ink">{notFound ? "页面不存在" : "暂时无法加载"}</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">
          {notFound ? "这个地址没有页面；产品入口是工作台。" : "页面暂时无法显示，请重新加载后再试。"}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {!notFound && (
            <Link reloadDocument to={pathname + search + hash} className={buttonClass("primary")}>
              重新加载
            </Link>
          )}
          <Link reloadDocument to="/studio" className={buttonClass(notFound ? "primary" : "secondary")}>
            回到工作台
          </Link>
        </div>
      </div>
    </div>
  );
}
