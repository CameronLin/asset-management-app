import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { holdings as mockHoldings, formatTWD, formatPct } from "@/lib/mock-data";
import {
  fetchTaiwanStockHistory,
  MarketDataError,
  normalizeTaiwanStockSymbol,
  type TaiwanStockPricePoint,
} from "@/lib/marketData";
import { getTaiwanStockColor } from "@/lib/stockColor";
import { getHoldings } from "@/lib/storage";
import { CandleChart, VolumeChart } from "@/components/CandleChart";

export const Route = createFileRoute("/_app/holdings/$symbol")({
  head: () => ({ meta: [{ title: "股票詳情" }] }),
  component: DetailPage,
});

function DetailPage() {
  const { symbol: rawSymbol } = Route.useParams();
  const symbol = normalizeTaiwanStockSymbol(rawSymbol);
  const router = useRouter();
  const [holdings, setHoldings] = useState(mockHoldings);
  const holding = holdings.find((x) => x.symbol === symbol);
  const [history, setHistory] = useState<TaiwanStockPricePoint[]>([]);
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

  const latestHistory = history.at(-1) ?? null;
  const latestClose = latestHistory?.close ?? null;
  const latestDate = latestHistory?.date ?? null;
  const closePriceColor = getTaiwanStockColor(
    history.length >= 2
      ? history[history.length - 1]!.close - history[history.length - 2]!.close
      : 0,
  );
  const candles = history.map((item) => ({
    o: item.open,
    h: item.high,
    l: item.low,
    c: item.close,
    v: item.volume,
  }));
  const last7 = history.slice(-7);
  const last30 = history.slice(-30);
  const sevenDayPct = calculateRangePct(last7);
  const thirtyDayPct = calculateRangePct(last30);
  const sevenDayColor = getTaiwanStockColor(sevenDayPct);
  const thirtyDayColor = getTaiwanStockColor(thirtyDayPct);
  const thirtyDayHigh = last30.length ? Math.max(...last30.map((item) => item.high)) : null;
  const thirtyDayLow = last30.length ? Math.min(...last30.map((item) => item.low)) : null;
  const averageVolume = last30.length
    ? last30.reduce((sum, item) => sum + item.volume, 0) / last30.length
    : null;
  const pnl =
    holding && latestClose != null ? (latestClose - holding.avgCost) * holding.shares : null;
  const pnlPct =
    holding && latestClose != null && holding.avgCost !== 0
      ? ((latestClose - holding.avgCost) / holding.avgCost) * 100
      : null;
  const pnlColor = getTaiwanStockColor(pnl ?? 0);

  return (
    <div className="space-y-5 pb-28">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/90 px-4 py-3 backdrop-blur">
        <button
          onClick={() => router.history.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="font-display text-base font-semibold">{holding?.name ?? "股票詳情"}</p>
          <p className="font-mono text-[11px] text-muted-foreground">{symbol || rawSymbol}</p>
        </div>
        <div className="w-9" />
      </header>

      <section className="px-4">
        <div className="rounded-3xl bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-2xl font-semibold">{holding?.name ?? symbol}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{symbol}</p>
            </div>
            <span className="rounded-full bg-surface-elevated px-3 py-1 text-[11px] text-muted-foreground">
              FinMind
            </span>
          </div>
          <div className="mt-4 flex items-end gap-3">
            <p className="font-display text-4xl font-bold tabular">
              {latestClose != null ? latestClose.toFixed(2) : "--"}
            </p>
            {latestClose != null && history.length >= 2 && (
              <p
                className={`flex items-center gap-1 pb-1.5 font-mono text-sm tabular ${closePriceColor.textClass}`}
              >
                {closePriceColor.color === "red" ? (
                  <TrendingUp className={`h-4 w-4 ${closePriceColor.iconClass}`} />
                ) : closePriceColor.color === "green" ? (
                  <TrendingDown className={`h-4 w-4 ${closePriceColor.iconClass}`} />
                ) : (
                  <Minus className={`h-4 w-4 ${closePriceColor.iconClass}`} />
                )}
                {formatTWD(
                  history[history.length - 1]!.close - history[history.length - 2]!.close,
                  {
                    sign: true,
                  },
                )}
              </p>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <InfoCell label="股票代號" value={symbol || "--"} />
            <InfoCell label="股票名稱" value={holding?.name ?? "--"} />
            <InfoCell label="資料日期" value={latestDate ?? "--"} />
            <InfoCell label="資料來源" value="FinMind" />
          </div>
        </div>
      </section>

      <section className="px-4">
        <div className="rounded-2xl bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">K 線圖</h3>
            <span className="text-[10px] text-muted-foreground">近 30 日 OHLC</span>
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
              查無近期交易資料
            </div>
          ) : (
            <>
              <CandleChart data={candles} />
              <p className="mt-3 text-[11px] text-muted-foreground">收盤價趨勢與每日高低區間</p>
              <div className="mt-3 border-t border-border pt-3">
                <p className="mb-1 text-[11px] text-muted-foreground">成交量（股）</p>
                <VolumeChart data={candles} />
              </div>
            </>
          )}
        </div>
      </section>

      <section className="px-4">
        <div className="mb-2 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">趨勢指標</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stat
            label="近 7 日漲跌幅"
            value={formatMetricPct(sevenDayPct)}
            className={sevenDayColor.textClass}
          />
          <Stat
            label="近 30 日漲跌幅"
            value={formatMetricPct(thirtyDayPct)}
            className={thirtyDayColor.textClass}
          />
          <Stat label="30 日最高價" value={formatMetricNumber(thirtyDayHigh)} />
          <Stat label="30 日最低價" value={formatMetricNumber(thirtyDayLow)} />
          <Stat label="30 日平均成交量" value={formatVolume(averageVolume)} />
          <Stat label="最新收盤價" value={formatMetricNumber(latestClose)} />
        </div>
      </section>

      {holding && (
        <section className="px-4">
          <h3 className="mb-2 text-sm font-semibold">我的持倉</h3>
          <div className="rounded-2xl bg-surface p-4">
            <div className="grid grid-cols-2 gap-y-3">
              <PosCell label="持有股數" value={`${holding.shares}`} />
              <PosCell label="平均成本" value={holding.avgCost.toFixed(2)} />
              <PosCell
                label="總市值"
                value={latestClose != null ? formatTWD(latestClose * holding.shares) : "--"}
              />
              <PosCell
                label="損益"
                value={
                  pnl != null && pnlPct != null
                    ? `${formatTWD(pnl, { sign: true })} (${formatPct(pnlPct)})`
                    : "--"
                }
                className={pnlColor.textClass}
              />
            </div>
          </div>
        </section>
      )}

      {!holding && !isLoadingHistory && !historyError && !hasNoHistory && (
        <section className="px-4">
          <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            這檔股票目前不在你的持股清單中，但已顯示近期交易資料。
          </div>
        </section>
      )}

      {!holding && hasNoHistory && (
        <div className="px-4 text-center">
          <Link to="/holdings" className="inline-block text-sm text-primary">
            回持股清單
          </Link>
        </div>
      )}
    </div>
  );
}

function calculateRangePct(points: TaiwanStockPricePoint[]) {
  if (points.length < 2) return 0;
  const start = points[0]?.close ?? 0;
  const end = points[points.length - 1]?.close ?? 0;
  if (start === 0) return 0;
  return ((end - start) / start) * 100;
}

function formatMetricNumber(value: number | null) {
  return value == null ? "--" : value.toFixed(2);
}

function formatMetricPct(value: number) {
  return Number.isFinite(value) ? formatPct(value) : "--";
}

function formatVolume(value: number | null) {
  return value == null ? "--" : `${Math.round(value).toLocaleString("zh-TW")} 股`;
}

function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-base font-semibold tabular ${className}`}>{value}</p>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background/40 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold tabular">{value}</p>
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
