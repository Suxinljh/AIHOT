// Client-side studio commands: same-origin fetch to /api/studio/* with the signed-in admin's CSRF
// token, and a loader revalidation on success.
import { useCallback, useState } from "react";
import { useRevalidator, useRouteLoaderData } from "react-router";
import type { AdminMe } from "@aihot/contracts/admin";
import { toast } from "@aihot/web/features/admin/toast";

class StudioError extends Error {}

function useStudioMe(): AdminMe {
  return (useRouteLoaderData("studio-layout") as { me: AdminMe } | undefined)?.me ?? { name: "", csrf: "", dev: false };
}

export function useStudioAction() {
  const me = useStudioMe();
  const revalidator = useRevalidator();
  const [pending, setPending] = useState<string | null>(null);

  const run = useCallback(
    async <T = unknown>(
      method: "POST" | "PATCH" | "PUT" | "DELETE",
      path: string,
      body?: unknown,
      opts: { success?: string; label?: string; revalidate?: boolean } = {},
    ): Promise<T | null> => {
      const label = opts.label ?? `${method} ${path}`;
      setPending(label);
      try {
        const res = await fetch(path, {
          method,
          credentials: "same-origin",
          headers: { "content-type": "application/json", "x-csrf-token": me.csrf },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (res.status === 401) {
          window.location.href = `/api/auth/login?return=${encodeURIComponent(window.location.pathname + window.location.search)}`;
          return null;
        }
        const text = await res.text();
        const json = text ? JSON.parse(text) : null;
        if (!res.ok) throw new StudioError(json?.detail ?? `请求失败（${res.status}）`);
        if (opts.success) toast(opts.success, "ok");
        if (opts.revalidate !== false) revalidator.revalidate();
        return (json ?? {}) as T;
      } catch (error) {
        toast(error instanceof StudioError ? error.message : "网络错误，请稍后再试", "error");
        return null;
      } finally {
        setPending(null);
      }
    },
    [me.csrf, revalidator],
  );

  return { run, pending, busy: pending !== null || revalidator.state === "loading" };
}
