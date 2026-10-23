// Per-step model selection in the workbench settings. The values live in `settings.models.*`, are
// audited by the admin API, and apply to new work within a minute without restarting the worker.
import type { AdminModels } from "@aihot/contracts/admin";
import { useStudioAction } from "./studio-action";

const SOURCE_LABEL: Record<string, string> = { admin: "设置页", env: "环境变量", default: "代码默认" };

export function ModelsSection({ models }: { models: AdminModels }) {
  const { run, pending } = useStudioAction();

  function change(capability: AdminModels["capabilities"][number], value: string) {
    void run(
      "POST",
      `/api/admin/models/${encodeURIComponent(capability.key)}`,
      { model: value === "__default" ? null : value, reason: "工作台设置页切换模型" },
      { label: `model-${capability.key}`, success: `${capability.label} 已切换，下一次调用生效` },
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[17px] font-semibold text-ink">模型</h2>
          <p className="mt-1 text-[13px] text-ink-3">按步骤单独选模型。只影响之后的新任务，约 1 分钟生效，不需要重启。</p>
        </div>
        <span className="mono rounded-full border border-line bg-bg-sunk px-3 py-1 text-[11px] text-ink-4">{models.capabilities.length} 个步骤</span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-panel bg-surface ring-1 ring-line">
        <table className="w-full min-w-[720px] text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-left text-[11.5px] text-ink-4">
              <th className="px-4 py-2.5 font-medium">步骤</th>
              <th className="px-4 py-2.5 font-medium">当前模型</th>
              <th className="px-4 py-2.5 font-medium">切换到</th>
            </tr>
          </thead>
          <tbody>
            {models.capabilities.map((capability) => {
              const choices = models.choices.filter((choice) => !capability.vision || choice.vision);
              return (
                <tr key={capability.key} className="border-b border-line-soft last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{capability.label}</div>
                    <div className="mono mt-0.5 text-[10.5px] text-ink-4">{capability.key} · {capability.env}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="mono text-[11.5px] text-ink-2">{capability.current.model}</div>
                    <div className="mt-0.5 text-[10.5px] text-ink-4">
                      {SOURCE_LABEL[capability.current.source] ?? capability.current.source}
                      {capability.current.source !== "admin" ? ` · 默认 ${capability.defaultModel}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`${capability.label} 模型`}
                      className="h-8 w-full max-w-[260px] rounded-control bg-surface px-2 text-[12px] text-ink ring-1 ring-line-strong outline-none disabled:opacity-50"
                      value={capability.current.model}
                      disabled={pending === `model-${capability.key}`}
                      onChange={(event) => change(capability, event.target.value)}
                    >
                      {choices.map((choice) => (
                        <option key={choice.key} value={choice.key}>{choice.key}（{choice.service}）</option>
                      ))}
                      <option value="__default">恢复默认（{capability.env} 或 {capability.defaultModel}）</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
