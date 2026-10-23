// Integration settings: model access, Feishu, SMTP and the two safety valves. Secrets are write-only
// (the page only shows whether one is stored); saved values take effect after the api and worker
// restart, because they are applied to the environment at boot.
import { useState } from "react";
import { Link, useLoaderData, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { adminGet } from "@aihot/web/lib/admin.server";
import { Button, Field, Input } from "@aihot/web/features/admin/ui";
import { STUDIO_PRODUCT, studioMeta } from "./studio-nav";
import { useStudioAction } from "./studio-action";

interface SecretState { configured: boolean; last4: string | null; envFixed: boolean }
interface Integrations {
  values: Record<string, string>;
  secrets: Record<string, SecretState>;
  restartRequired?: boolean;
}

export async function loader({ request }: LoaderFunctionArgs) {
  return { integrations: await adminGet<Integrations>(request, "/api/studio/integrations") };
}

export const meta: MetaFunction = () => studioMeta("集成配置");

function SecretField({ name, label, hint, state, value, onChange }: {
  name: string; label: string; hint?: string; state: SecretState | undefined; value: string; onChange: (value: string) => void;
}) {
  return (
    <Field label={label} hint={state?.envFixed ? "由部署环境固定" : state?.configured ? `已配置 ${state.last4 ?? ""}，留空不修改` : hint}>
      <Input
        aria-label={label}
        type="password"
        autoComplete="new-password"
        disabled={state?.envFixed}
        placeholder={state?.configured ? "••••••••" : "未配置"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        name={name}
      />
    </Field>
  );
}

export default function StudioIntegrations() {
  const { integrations } = useLoaderData<typeof loader>();
  const { run, pending } = useStudioAction();
  const v = integrations.values;
  const [baseUrl, setBaseUrl] = useState(v.LLM_BASE_URL ?? "");
  const [model, setModel] = useState(v.LLM_MODEL ?? "");
  const [collect, setCollect] = useState(v.COLLECT_ENABLED === "true");
  const [modelCalls, setModelCalls] = useState(v.MODEL_CALLS_ENABLED === "true");
  const [feishuOn, setFeishuOn] = useState(v.FEISHU_INTERNAL_ENABLED === "true");
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const setSecret = (name: string) => (value: string) => setSecrets((current) => ({ ...current, [name]: value }));

  async function save() {
    setSaved(false);
    const response = await run<Integrations>("PATCH", "/api/studio/integrations", {
      plain: {
        LLM_BASE_URL: baseUrl.trim(),
        LLM_MODEL: model.trim(),
        COLLECT_ENABLED: collect,
        MODEL_CALLS_ENABLED: modelCalls,
        FEISHU_INTERNAL_ENABLED: feishuOn,
      },
      secrets: Object.fromEntries(Object.entries(secrets).filter(([, value]) => value.trim() !== "")),
    }, { label: "integrations-save", success: "配置已保存" });
    if (response) setSaved(true);
  }

  return (
    <div>
      <Link to="/settings" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-4 transition-colors hover:text-ink">← 设置</Link>
      <header className="mt-3">
        <div className="mono text-[11px] uppercase tracking-[0.18em] text-ink-4">{STUDIO_PRODUCT} / Studio / 集成</div>
        <h1 className="mt-2 text-[28px] font-black leading-[1.2] tracking-[-0.03em] text-ink sm:text-[34px]">集成配置</h1>
        <p className="mt-3 max-w-[52em] text-[14px] leading-[1.8] text-ink-3">
          大模型、飞书、邮件和采集开关。密钥只写不读；保存后重启 api 与 worker 生效。
        </p>
      </header>

      <section className="mt-5 rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
        <h2 className="text-[15px] font-semibold text-ink">大模型</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Base URL"><Input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.deepseek.com/v1" /></Field>
          <Field label="模型"><Input value={model} onChange={(event) => setModel(event.target.value)} placeholder="deepseek-flash" /></Field>
          <SecretField name="LLM_API_KEY" label="API Key" state={integrations.secrets.LLM_API_KEY} value={secrets.LLM_API_KEY ?? ""} onChange={setSecret("LLM_API_KEY")} />
        </div>
      </section>

      <section className="mt-4 rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
        <h2 className="text-[15px] font-semibold text-ink">飞书</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <SecretField name="FEISHU_APP_ID" label="App ID" state={integrations.secrets.FEISHU_APP_ID} value={secrets.FEISHU_APP_ID ?? ""} onChange={setSecret("FEISHU_APP_ID")} />
          <SecretField name="FEISHU_APP_SECRET" label="App Secret" state={integrations.secrets.FEISHU_APP_SECRET} value={secrets.FEISHU_APP_SECRET ?? ""} onChange={setSecret("FEISHU_APP_SECRET")} />
          <SecretField name="FEISHU_ALERT_CHAT_ID" label="提醒群 Chat ID" state={integrations.secrets.FEISHU_ALERT_CHAT_ID} value={secrets.FEISHU_ALERT_CHAT_ID ?? ""} onChange={setSecret("FEISHU_ALERT_CHAT_ID")} />
          <label className="flex items-center gap-2 self-end pb-2 text-[13px] text-ink-2"><input type="checkbox" checked={feishuOn} onChange={(event) => setFeishuOn(event.target.checked)} />启用飞书</label>
        </div>
      </section>

      <section className="mt-4 rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
        <h2 className="text-[15px] font-semibold text-ink">邮件</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <SecretField name="SMTP_URL" label="SMTP URL" hint="smtps://user:password@smtp.example.com:465" state={integrations.secrets.SMTP_URL} value={secrets.SMTP_URL ?? ""} onChange={setSecret("SMTP_URL")} />
          <SecretField name="SMTP_FROM" label="发件人" state={integrations.secrets.SMTP_FROM} value={secrets.SMTP_FROM ?? ""} onChange={setSecret("SMTP_FROM")} />
          <SecretField name="ALERT_EMAIL_TO" label="收件人" state={integrations.secrets.ALERT_EMAIL_TO} value={secrets.ALERT_EMAIL_TO ?? ""} onChange={setSecret("ALERT_EMAIL_TO")} />
        </div>
      </section>

      <section className="mt-4 rounded-panel bg-surface p-4 ring-1 ring-line sm:p-5">
        <h2 className="text-[15px] font-semibold text-ink">开关</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-[13px] text-ink-2"><input type="checkbox" checked={collect} onChange={(event) => setCollect(event.target.checked)} />允许采集</label>
          <label className="flex items-center gap-2 text-[13px] text-ink-2"><input type="checkbox" checked={modelCalls} onChange={(event) => setModelCalls(event.target.checked)} />允许模型调用</label>
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-4">
          保存写入数据库；重启 api 与 worker 后生效。部署时在环境变量里设置的值优先，页面会标为「由部署环境固定」。
        </p>
      </section>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button tone="primary" busy={pending === "integrations-save"} onClick={save}>保存配置</Button>
        {saved && <span className="text-[12px] text-ink-4">已保存，重启 api 与 worker 后生效</span>}
      </div>
    </div>
  );
}
