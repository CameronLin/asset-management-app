import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { formatPct } from "@/lib/mock-data";
import {
  fetchTaiwanStockHistory,
  fetchTaiwanStockLatestPrice,
  MarketDataError,
} from "@/lib/marketData";
import { getTaiwanStockColor } from "@/lib/stockColor";
import { getHoldings } from "@/lib/storage";
import type { Holding } from "@/lib/types";
import { Sparkline } from "@/components/Sparkline";

export const Route = createFileRoute("/_app/market")({
  head: () => ({ meta: [{ title: "市場行情" }] }),
  component: MarketPage,
});

type MarketHolding = {
  symbol: string;
  name: string;
  close: number;
  change: number;
  changePct: number;
  date: string;
  source: string;
  sparkline: number[];
};

function MarketPage() {
  const [watchlist, setWatchlist] = useState<Holding[]>([]);
  const [marketItems, setMarketItems] = useState<MarketHolding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partialError, setPartialError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const holdings = getHoldings();
      const uniqueHoldings = holdings.filter(
        (holding, index, list) =>
          list.findIndex((item) => item.symbol === holding.symbol) === index,
      );
      setWatchlist(uniqueHoldings);
    } catch {
      setError("持股清單讀取失敗，請重新整理頁面。");
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (watchlist.length === 0) {
      setMarketItems([]);
      setError(null);
      setPartialError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadMarketData = async () => {
      setIsLoading(true);
      setError(null);
      setPartialError(null);

      const results = await Promise.allSettled(
        watchlist.map(async (holding) => {
          const [latest, history] = await Promise.all([
            fetchTaiwanStockLatestPrice(holding.symbol),
            fetchTaiwanStockHistory(holding.symbol, 30),
          ]);

          const previousClose =
            history.length >= 2 ? history[history.length - 2]!.close : latest.close;
          const change = latest.close - previousClose;
          const changePct = previousClose === 0 ? 0 : (change / previousClose) * 100;

          return {
            symbol: holding.symbol,
            name: holding.name,
            close: latest.close,
            change,
            changePct,
            date: latest.date,
            source: "FinMind",
            sparkline: history.map((item) => item.close),
          } satisfies MarketHolding;
        }),
      );

      if (cancelled) return;

      const items = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      const failures = results.flatMap((result, index) => {
        if (result.status === "fulfilled") return [];
        const symbol = watchlist[index]?.symbol ?? "未知代號";
        const message =
          result.reason instanceof MarketDataError
            ? result.reason.message
            : result.reason instanceof Error
              ? result.reason.message
              : "未知錯誤";
        return [`${symbol}：${message}`];
      });

      setMarketItems(items);

      if (items.length === 0) {
        setError(failures.length > 0 ? failures.join("；") : "查無行情資料");
      } else if (failures.length > 0) {
        setPartialError(`以下股票行情載入失敗：${failures.join("；")}`);
      }

      setIsLoading(false);
    };

    void loadMarketData();

    return () => {
      cancelled = true;
    };
  }, [watchlist]);

  return (
    <div className="space-y-5 px-4 pb-28 pt-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">市場行情</h1>
        <p className="mt-1 text-xs text-muted-foreground">持股關注清單與近期行情</p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold">我的關注</h2>

        {isLoading ? (
          <div className="rounded-2xl bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
            載入行情中
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-loss/30 bg-loss/10 px-4 py-4 text-sm text-loss">
            {error}
          </div>
        ) : marketItems.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-muted-foreground">
            尚未加入關注股票
          </div>
        ) : (
          <div className="space-y-2">
            {partialError && (
              <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
                {partialError}
              </div>
            )}

            {marketItems.map((item) => {
              const stockColor = getTaiwanStockColor(item.change);
              const Icon =
                stockColor.color === "red"
                  ? TrendingUp
                  : stockColor.color === "green"
                    ? TrendingDown
                    : Minus;

              return (
                <Link
                  key={item.symbol}
                  to="/holdings/$symbol"
                  params={{ symbol: item.symbol }}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{item.symbol}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {item.date} · {item.source}
                    </p>
                  </div>

                  <div className="h-10 w-20 shrink-0">
                    <Sparkline data={item.sparkline} change={item.change} height={40} />
                  </div>

                  <div className="w-28 shrink-0 text-right">
                    <p className="font-mono text-sm font-bold tabular">{item.close.toFixed(2)}</p>
                    <p
                      className={`mt-0.5 flex items-center justify-end gap-1 font-mono text-[11px] tabular ${stockColor.textClass}`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${stockColor.iconClass}`} />
                      {item.change >= 0 ? "+" : ""}
                      {item.change.toFixed(2)}
                    </p>
                    <p className={`font-mono text-[11px] tabular ${stockColor.textClass}`}>
                      {formatPct(item.changePct)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
