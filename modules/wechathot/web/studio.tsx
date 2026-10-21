import { buttonClass } from "@aihot/web/components/ui/Controls";

export const meta = () => [
  { title: "Studio · WeChatHot" },
  { name: "robots", content: "noindex, nofollow" },
];

export const headers = () => ({
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
});

/** The module's placeholder while the workbench shell and its first lists are built. */
export default function StudioPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center py-14">
      <div className="w-full max-w-[560px]">
        <div className="mono text-[12px] uppercase tracking-[0.18em] text-ink-4">WeChatHot / Studio</div>
        <h1 className="mt-3 text-[30px] font-black leading-[1.2] tracking-[-0.03em] text-ink sm:text-[36px]">
          工作台底座已就位
        </h1>
        <p className="mt-4 max-w-[46em] text-[14.5px] leading-[1.85] text-ink-3">
          模块已经注册到 API、worker 和网页。热点发现、选题、写作与排版会从这里逐步接入；现在先确认包边界和
          <code className="mx-1 rounded bg-bg-sunk px-1.5 py-0.5 text-[12.5px] text-ink-2">/studio</code>
          路由可以加载。
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {[
            ["M0", "模块与数据表"],
            ["P0-A", "热点与信源"],
            ["P0-B", "选题与写作"],
          ].map(([stage, label]) => (
            <div key={stage} className="card px-4 py-3">
              <div className="mono text-[11px] text-ink-4">{stage}</div>
              <div className="mt-1 text-[13px] font-medium text-ink-2">{label}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-2.5">
          <a href="/admin" className={buttonClass("secondary")}>
            进入现有后台
          </a>
          <a href="/" className={buttonClass("secondary")}>
            返回公开站
          </a>
        </div>
        <p className="mt-6 text-[12px] leading-relaxed text-ink-4">
          占位页不调用模型，也不读写工作台数据。登录与根路径重定向在 WCH-3 接入。
        </p>
      </div>
    </div>
  );
}
