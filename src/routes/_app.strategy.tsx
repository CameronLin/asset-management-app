import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Activity,
  TrendingUp,
  Newspaper,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { strategies } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/strategy")({
  head: () => ({ meta: [{ title: "投資策略" }] }),
  component: StrategyPage,
});

const ACTION = {
  buy: { label: "買進", cls: "bg-price-red/10 text-price-red", ring: "ring-price-red/30" },
  hold: { label: "觀望", cls: "bg-price-gray/10 text-price-gray", ring: "ring-price-gray/30" },
  sell: { label: "賣出", cls: "bg-price-green/10 text-price-green", ring: "ring-price-green/30" },
} as const;

function StrategyPage() {
  const buys = strategies.filter((s) => s.action === "buy").length;
  const holds = strategies.filter((s) => s.action === "hold").length;
  const sells = strategies.filter((s) => s.action === "sell").length;

  return (
    <div className="space-y-5 px-4 pt-6">
      <header className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="font-display text-2xl font-semibold">投資策略</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">AI 每日精選 · 2026/06/01</p>
        </div>
      </header>

      <div className="rounded-3xl gradient-hero p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">今日觀察池</p>
        <p className="mt-1 font-display text-3xl font-bold tabular">{strategies.length} 檔</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="買進" value={buys} cls="text-price-red" />
          <Stat label="觀望" value={holds} cls="text-price-gray" />
          <Stat label="賣出" value={sells} cls="text-price-green" />
        </div>
      </div>

      <div className="rounded-2xl border border-warning/30 bg-warning/15 p-3">
        <div className="flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <p className="text-xs text-muted-foreground">
            策略內容僅供參考，並非投資建議。投資前請審慎評估自身風險承受度。
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {strategies.map((s) => {
          const meta = ACTION[s.action];
          return (
            <article
              key={s.symbol}
              className={`overflow-hidden rounded-2xl bg-surface ring-1 ${meta.ring}`}
            >
              <div className="flex items-center justify-between border-b border-border bg-surface-elevated/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-lg px-2.5 py-1 font-display text-xs font-bold ${meta.cls}`}
                  >
                    {meta.label}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {s.symbol} · 現價 {s.price} → 目標 {s.target}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">信心度</p>
                  <p className="font-mono text-sm font-bold tabular text-primary">
                    {s.confidence}%
                  </p>
                </div>
              </div>

              <div className="space-y-2 p-4">
                <Reason icon={Activity} label="技術面" text={s.technical} />
                <Reason icon={TrendingUp} label="基本面" text={s.fundamental} />
                <Reason icon={Newspaper} label="新聞面" text={s.news} />
                <div className="flex gap-2 rounded-xl bg-warning/15 p-3">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                  <p className="text-xs text-muted-foreground">{s.risk}</p>
                </div>
              </div>

              <Link
                to="/holdings/$symbol"
                params={{ symbol: s.symbol }}
                className="flex items-center justify-between border-t border-border bg-background/40 px-4 py-3 text-xs text-primary"
              >
                <span>查看完整分析</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="rounded-xl bg-background/40 p-3 text-center">
      <p className={`font-display text-xl font-bold tabular ${cls}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Reason({
  icon: Icon,
  label,
  text,
}: {
  icon: React.ElementType;
  label: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
