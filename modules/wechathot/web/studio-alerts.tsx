// The studio's notifications: what the followed brands and the sources have to say. Every alert can
// be read, muted or opened, and the state stays until it is changed.
import { Link, useLoaderData, useSearchParams, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { IconExternal, IconMessage } from "@aihot/web/components/icons";
import { adminGet } from "@aihot/web/lib/admin.server";
import { Badge, Button, FilterChips } from "@aihot/web/features/admin/ui";
import { relativeTime } from "@aihot/web/lib/format";
import type { StudioAlertList } from "../alerts.ts";
import { STUDIO_PRODUCT, studioMeta } from "./studio-nav";
import { useStudioAction } from "./studio-action";
import { EmptyPanel } from "./studio-brand-ui";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "all";
  return { alerts: await adminGet<StudioAlertList>(request, `/api/studio/alerts?status=${encodeURIComponent(status)}`) };
}

export const meta: MetaFunction = () => studioMeta("通知");

const KIND_LABEL: Record<string, string> = { new_event: "新事件", follow_update: "关注更新", source_error: "采集错误" };
const KIND_TONE: Record<string, "accent" | "info" | "bad"> = { new_event: "accent", follow_update: "info", source_error: "bad" };

export default function StudioAlerts() {
  const { alerts } = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const { run, pending } = useStudioAction();
  const status = params.get("status") ?? "all";

  return (
    <div>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mono text-[11px] uppercase tracking-[0.18em] text-ink-4">{STUDIO_PRODUCT} / Studio / 通知</div>
          <h1 className="mt-2 text-[28px] font-black leading-[1.2] tracking-[-0.03em] text-ink sm:text-[34px]">通知</h1>
          <p className="mt-3 max-w-[720px] text-[14px] leading-[1.8] text-ink-3">
            关注品牌的新事件和采集失败都在这里。同一事件只留一条通知，新进展会并进同一条。
          </p>
        </div>
        <Button
          tone="secondary"
          busy={pending === "alerts-read-all"}
          disabled={!alerts.unread}
          onClick={() => run("POST", "/api/studio/alerts/read-all", undefined, { label: "alerts-read-all", success: "全部标为已读" })}
        >
          全部标为已读
        </Button>
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <FilterChips param="status" options={[{ value: "", label: "全部" }, { value: "unread", label: "未读" }, { value: "read", label: "已读" }, { value: "muted", label: "已静音" }]} />
        <span className="text-[12px] text-ink-4">未读 {alerts.unread} 条</span>
      </div>

      {alerts.items.length === 0 ? (
        <div className="mt-5">
          <EmptyPanel
            icon={IconMessage}
            title={status === "unread" ? "没有未读通知" : "还没有通知"}
            body="关注品牌之后，符合规则的新事件会出现在这里；信源采集失败也会提醒你。"
            action={<Link to="/brands" className="text-[13px] text-accent hover:underline">去品牌库关注</Link>}
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {alerts.items.map((alert) => (
            <li key={alert.id} className={`rounded-panel bg-surface p-4 ring-1 ring-line ${alert.status === "unread" ? "" : "opacity-70"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={KIND_TONE[alert.kind] ?? "muted"}>{KIND_LABEL[alert.kind] ?? alert.kind}</Badge>
                {alert.brandName && <Badge tone="muted">{alert.brandName}</Badge>}
                <span className="text-[11.5px] text-ink-4">{relativeTime(alert.createdAt)}</span>
                {alert.status === "unread" && <Badge tone="accent">未读</Badge>}
                {alert.sentAt && <Badge tone="ok">已推送</Badge>}
                {alert.status === "muted" && <Badge tone="warn">已静音</Badge>}
              </div>
              <p className="mt-2 break-words text-[13px] leading-relaxed text-ink-2">{alert.reason}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {alert.storyPublicId && (
                  <Link to={`/events/${encodeURIComponent(alert.storyPublicId)}`} className="inline-flex items-center gap-1 text-[12.5px] text-accent hover:underline">
                    打开事件<IconExternal size={12} />
                  </Link>
                )}
                {alert.sourceId && (
                  <Link to={`/sources/${encodeURIComponent(alert.sourceId)}`} className="inline-flex items-center gap-1 text-[12.5px] text-accent hover:underline">
                    查看信源<IconExternal size={12} />
                  </Link>
                )}
                <Button
                  size="sm"
                  tone="secondary"
                  busy={pending === `alert-${alert.id}`}
                  onClick={() => run("PATCH", `/api/studio/alerts/${alert.id}`, { status: alert.status === "read" ? "unread" : "read" }, {
                    label: `alert-${alert.id}`,
                    success: alert.status === "read" ? "已标为未读" : "已标为已读",
                  })}
                >
                  {alert.status === "read" ? "标为未读" : "标为已读"}
                </Button>
                <Button
                  size="sm"
                  tone="ghost"
                  busy={pending === `alert-mute-${alert.id}`}
                  onClick={() => run("PATCH", `/api/studio/alerts/${alert.id}`, { status: alert.status === "muted" ? "read" : "muted" }, {
                    label: `alert-mute-${alert.id}`,
                    success: alert.status === "muted" ? "已取消静音" : "已静音",
                  })}
                >
                  {alert.status === "muted" ? "取消静音" : "静音"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
