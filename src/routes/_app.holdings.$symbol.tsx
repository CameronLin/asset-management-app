import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  Newspaper,
  Brain,
  Minus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { holdings as mockHoldings, strategies, formatTWD, formatPct } from "@/lib/mock-data";
import { fetchTaiwanStockHistory, MarketDataError } from "@/lib/marketData";
import { getTaiwanStockColor } from "@/lib/stockColor";
import { getHoldings } from "@/lib/storage";
import { CandleChart, VolumeChart } from "@/components/CandleChart";

export const Route = createFileRoute("/_app/holdings/$symbol")({
  head: () => ({ meta: [{ title: "股票詳情" }] }),
  component: DetailPage,
});

function DetailPage() {
  const { symbol } = Route.useParams();
  const router = useRouter();
  const [holdings, setHoldings] = useState(mockHoldings);
  const h = holdings.find((x) => x.symbol === symbol);
  const [range, setRange] = useState<"7" | "30">("30");
  const [history, setHistory] = useState<
    Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [hasNoHistory, setHasNoHistory] = useState(false);

  useEffect(() => {
    setHoldings(getHoldings());
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      setHistoryError(null);
      setHasNoHistory(false);

      try {
        const records = await fetchTaiwanStockHistory(symbol, 30);
        if (cancelled) return;

        setHistory(records);
        setHasNoHistory(records.length === 0);
      } catch (error) {
        if (cancelled) return;

        if (error instanceof MarketDataError && error.code === "NOT_FOUND") {
          setHistory([]);
          setHasNoHistory(true);
          setHistoryError(null);
        } else {
          setHistory([]);
          setHasNoHistory(false);
          setHistoryError(error instanceof Error ? error.message : "股價歷史資料載入失敗。");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (!h) {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-muted-foreground">找不到這檔股票</p>
        <Link to="/holdings" className="mt-4 inline-block text-primary">
          回持股清單
        </Link>
      </div>
    );
  }

  const pnl = (h.price - h.avgCost) * h.shares;
  const pct = ((h.price - h.avgCost) / h.avgCost) * 100;
  const selectedHistory = history.slice(-(range === "7" ? 7 : 30));
  const trendStart = selectedHistory.at(0);
  const trendEnd = selectedHistory.at(-1);
  const trendChange =
    trendStart && trendEnd ? trendEnd.close - trendStart.close : h.price - h.prevClose;
  const trendPct =
    trendStart && trendStart.close !== 0 ? (trendChange / trendStart.close) * 100 : 0;
  const trendColor = getTaiwanStockColor(trendChange);
  const candles = selectedHistory.map((item) => ({
    o: item.open,
    h: item.high,
    l: item.low,
    c: item.close,
    v: item.volume,
  }));
  const strat = strategies.find((s) => s.symbol === h.symbol);
  const latestHistory = history.at(-1);
  const priceToDisplay = latestHistory?.close ?? h.price;
  const pnlColor = getTaiwanStockColor(pnl);
  const TrendIcon =
    trendColor.color === "red" ? TrendingUp : trendColor.color === "green" ? TrendingDown : Minus;

  return (
    <div className="space-y-5 pb-6">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/90 px-4 py-3 backdrop-blur">
        <button
          onClick={() => router.history.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="font-display text-base font-semibold">{h.name}</p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {h.symbol} · {h.sector}
          </p>
        </div>
        <div className="w-9" />
      </header>

      <section className="px-4">
        <div className="flex items-end gap-3">
          <p className="font-display text-4xl font-bold tabular">{priceToDisplay.toFixed(2)}</p>
          <p
            className={`flex items-center gap-1 pb-1.5 font-mono text-sm tabular ${trendColor.textClass}`}
          >
            <TrendIcon className={`h-4 w-4 ${trendColor.iconClass}`} />
            {trendChange >= 0 ? "+" : ""}
            {trendChange.toFixed(2)} ({formatPct(trendPct)})
          </p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {latestHistory ? `最後更新 ${latestHistory.date}` : "最後更新 --"}
        </p>
      </section>

      <div className="px-4">
        <div className="inline-flex rounded-xl bg-surface p-1">
          {(["7", "30"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              近 {r} 日
            </button>
          ))}
        </div>
      </div>

      <section className="px-4">
        <div className="rounded-2xl bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">K 線圖</h3>
            <span className="text-[10px] text-muted-foreground">日 K</span>
          </div>
          {isLoadingHistory ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              載入歷史股價中...
            </div>
          ) : historyError ? (
            <div className="rounded-xl border border-loss/30 bg-loss/10 px-4 py-6 text-center text-sm text-loss">
              {historyError}
            </div>
          ) : hasNoHistory || candles.length === 0 ? (
            <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-6 text-center text-sm text-warning">
              查無歷史股價資料
            </div>
          ) : (
            <>
              <CandleChart data={candles} />
              <div className="mt-3 border-t border-border pt-3">
                <p className="mb-1 text-[11px] text-muted-foreground">成交量（股）</p>
                <VolumeChart data={candles} />
              </div>
            </>
          )}
        </div>
      </section>

      <section className="px-4">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="本益比 (P/E)" value="18.4" />
          <Stat label="殖利率" value="2.85%" />
          <Stat label="52週高" value={(h.price * 1.18).toFixed(2)} />
          <Stat label="52週低" value={(h.price * 0.72).toFixed(2)} />
        </div>
      </section>

      <section className="px-4">
        <h3 className="mb-2 text-sm font-semibold">我的持倉</h3>
        <div className="rounded-2xl bg-surface p-4">
          <div className="grid grid-cols-2 gap-y-3">
            <PosCell label="持有股數" value={`${h.shares}`} />
            <PosCell label="平均成本" value={h.avgCost.toFixed(2)} />
            <PosCell label="總市值" value={formatTWD(h.price * h.shares)} />
            <PosCell
              label="損益"
              value={`${formatTWD(pnl, { sign: true })} (${formatPct(pct)})`}
              className={pnlColor.textClass}
            />
          </div>
        </div>
      </section>

      {strat && (
        <section className="px-4">
          <div className="mb-2 flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">AI 策略分析</h3>
          </div>
          <div className="space-y-2 rounded-2xl gradient-card p-4">
            <ActionBadge
              action={strat.action}
              confidence={strat.confidence}
              target={strat.target}
            />
            <Reason icon={Activity} label="技術面" text={strat.technical} />
            <Reason icon={TrendingUp} label="基本面" text={strat.fundamental} />
            <Reason icon={Newspaper} label="新聞面" text={strat.news} />
            <div className="mt-2 rounded-xl bg-warning/15 p-3 text-xs">
              <p className="font-medium text-warning">⚠ 風險提醒</p>
              <p className="mt-1 text-muted-foreground">{strat.risk}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-base font-semibold tabular">{value}</p>
    </div>
  );
}

function PosCell({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-mono text-sm font-semibold tabular ${className}`}>{value}</p>
    </div>
  );
}

function ActionBadge({
  action,
  confidence,
  target,
}: {
  action: "buy" | "hold" | "sell";
  confidence: number;
  target: number;
}) {
  const map = {
    buy: { label: "建議買進", cls: "bg-price-red/10 text-price-red" },
    hold: { label: "建議觀望", cls: "bg-price-gray/10 text-price-gray" },
    sell: { label: "建議賣出", cls: "bg-price-green/10 text-price-green" },
  } as const;

  return (
    <div className="flex items-center justify-between rounded-xl bg-background/40 p-3">
      <div>
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${map[action].cls}`}>
          {map[action].label}
        </span>
        <p className="mt-2 text-[11px] text-muted-foreground">AI 信心度 {confidence}%</p>
      </div>
      <div className="text-right">
        <p className="text-[11px] text-muted-foreground">目標價</p>
        <p className="font-mono text-base font-bold tabular text-primary">{target}</p>
      </div>
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
    <div className="flex gap-3 rounded-xl bg-background/30 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="text-xs">
        <p className="font-semibold">{label}</p>
        <p className="mt-1 leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
