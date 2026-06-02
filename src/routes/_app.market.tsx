import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp, TrendingDown, Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatPct } from "@/lib/mock-data";
import {
  fetchTaiwanStockHistory,
  fetchTaiwanStockLatestPrice,
  MarketDataError,
  normalizeTaiwanStockSymbol,
} from "@/lib/marketData";
import { getTaiwanStockColor } from "@/lib/stockColor";
import { getHoldings } from "@/lib/storage";
import { addWatchlistItem, getWatchlist, removeWatchlistItem } from "@/lib/watchlist";
import type { Holding, WatchlistItem } from "@/lib/types";
import { Sparkline } from "@/components/Sparkline";

export const Route = createFileRoute("/_app/market")({
  head: () => ({ meta: [{ title: "市場行情" }] }),
  component: MarketPage,
});

type SourceItem = {
  id: string;
  symbol: string;
  name: string;
  removable: boolean;
};

function buildSourceItems(watchlist: WatchlistItem[], fallbackHoldings: Holding[]): SourceItem[] {
  if (watchlist.length > 0) {
    return watchlist.map((item) => ({
      id: item.id,
      symbol: item.symbol,
      name: item.name,
      removable: true,
    }));
  }

  return fallbackHoldings
    .filter(
      (holding, index, list) => list.findIndex((item) => item.symbol === holding.symbol) === index,
    )
    .map((holding) => ({
      id: holding.symbol,
      symbol: holding.symbol,
      name: holding.name,
      removable: false,
    }));
}

type AvailableMarketItem = {
  id: string;
  symbol: string;
  name: string;
  removable: boolean;
  status: "available";
  close: number;
  change: number;
  changePct: number;
  date: string;
  source: string;
  sparkline: number[];
};

type UnavailableMarketItem = {
  id: string;
  symbol: string;
  name: string;
  removable: boolean;
  status: "unavailable";
  message: string;
};

type MarketItem = AvailableMarketItem | UnavailableMarketItem;

function MarketPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [fallbackHoldings, setFallbackHoldings] = useState<Holding[]>([]);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const sourceItems = buildSourceItems(watchlist, fallbackHoldings);

  useEffect(() => {
    try {
      setWatchlist(getWatchlist());
      setFallbackHoldings(getHoldings());
    } catch {
      setError("關注清單讀取失敗，請重新整理頁面。");
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const nextSourceItems = buildSourceItems(watchlist, fallbackHoldings);

    if (nextSourceItems.length === 0) {
      setMarketItems([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadMarketData = async () => {
      setIsLoading(true);
      setError(null);

      const results = await Promise.allSettled(
        nextSourceItems.map(async (item) => {
          const [latest, history] = await Promise.all([
            fetchTaiwanStockLatestPrice(item.symbol),
            fetchTaiwanStockHistory(item.symbol, 30),
          ]);

          const previousClose =
            history.length >= 2 ? history[history.length - 2]!.close : latest.close;
          const change = latest.close - previousClose;
          const changePct = previousClose === 0 ? 0 : (change / previousClose) * 100;

          return {
            id: item.id,
            symbol: item.symbol,
            name: item.name,
            removable: item.removable,
            status: "available",
            close: latest.close,
            change,
            changePct,
            date: latest.date,
            source: "FinMind",
            sparkline: history.map((row) => row.close),
          } satisfies AvailableMarketItem;
        }),
      );

      if (cancelled) return;

      const nextItems = results.map((result, index) => {
        const item = nextSourceItems[index]!;

        if (result.status === "fulfilled") {
          return result.value;
        }

        const message =
          result.reason instanceof MarketDataError
            ? result.reason.message
            : result.reason instanceof Error
              ? result.reason.message
              : "暫時無法取得行情";

        return {
          id: item.id,
          symbol: item.symbol,
          name: item.name,
          removable: item.removable,
          status: "unavailable",
          message: "暫時無法取得行情",
        } satisfies UnavailableMarketItem;
      });

      setMarketItems(nextItems);
      setIsLoading(false);
    };

    void loadMarketData();

    return () => {
      cancelled = true;
    };
  }, [watchlist, fallbackHoldings]);

  const handleAddWatchlist = (item: WatchlistItem) => {
    try {
      const next = addWatchlistItem(item);
      setWatchlist(next);
      setShowForm(false);
      toast.success("新增關注成功");
    } catch {
      setError("新增關注失敗，請稍後再試。");
    }
  };

  const handleRemoveWatchlist = (id: string) => {
    try {
      const next = removeWatchlistItem(id);
      setWatchlist(next);
      toast.success("已移除關注股票");
    } catch {
      setError("移除關注失敗，請稍後再試。");
    }
  };

  return (
    <div className="space-y-5 px-4 pb-28 pt-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">市場行情</h1>
        <p className="mt-1 text-xs text-muted-foreground">持股關注清單與近期行情</p>
      </header>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">我的關注</h2>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full gradient-primary shadow-glow"
          >
            <Plus className="h-4 w-4 text-primary-foreground" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-2xl border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-2xl bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
            載入行情中
          </div>
        ) : marketItems.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-muted-foreground">
            尚未加入關注股票
          </div>
        ) : (
          <div className="space-y-2">
            {marketItems.map((item) => {
              if (item.status === "unavailable") {
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-3"
                  >
                    <Link
                      to="/holdings/$symbol"
                      params={{ symbol: item.symbol }}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{item.symbol}</p>
                      <p className="mt-1 text-[11px] text-warning">{item.message}</p>
                    </Link>
                    {item.removable && (
                      <button
                        type="button"
                        onClick={() => handleRemoveWatchlist(item.id)}
                        className="text-muted-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              }

              const stockColor = getTaiwanStockColor(item.change);
              const Icon =
                stockColor.color === "red"
                  ? TrendingUp
                  : stockColor.color === "green"
                    ? TrendingDown
                    : Minus;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-3"
                >
                  <Link
                    to="/holdings/$symbol"
                    params={{ symbol: item.symbol }}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3"
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

                  {item.removable && (
                    <button
                      type="button"
                      onClick={() => handleRemoveWatchlist(item.id)}
                      className="shrink-0 text-muted-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showForm && (
        <WatchlistForm
          existingSymbols={watchlist.map((item) => item.symbol)}
          onCancel={() => setShowForm(false)}
          onSave={handleAddWatchlist}
        />
      )}
    </div>
  );
}

function WatchlistForm({
  existingSymbols,
  onCancel,
  onSave,
}: {
  existingSymbols: string[];
  onCancel: () => void;
  onSave: (item: WatchlistItem) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ symbol: "", name: "" });

  const handleSubmit = async () => {
    const symbol = normalizeTaiwanStockSymbol(form.symbol);
    const name = form.name.trim();

    if (!symbol) {
      setError("股票代號不可空白。");
      return;
    }

    if (!name) {
      setError("股票名稱不可空白。");
      return;
    }

    if (existingSymbols.includes(symbol)) {
      setError("此股票已在關注清單中。");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      onSave({
        id: `watch-${Date.now()}`,
        symbol,
        name,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-auto flex max-h-[calc(100vh-0.75rem)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-surface-elevated shadow-card">
        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-5">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-muted" />
          <h3 className="font-display text-lg font-semibold">新增關注股票</h3>
          <div className="mt-4 space-y-3 pb-6">
            {error && (
              <div className="rounded-xl border border-loss/30 bg-loss/10 px-3 py-2 text-xs text-loss">
                {error}
              </div>
            )}

            <Field label="股票代號">
              <input
                value={form.symbol}
                onChange={(event) => {
                  setForm({ ...form, symbol: event.target.value });
                  setError(null);
                }}
                className="w-full rounded-xl bg-background px-3 py-2.5 text-sm uppercase outline-none focus:ring-2 focus:ring-primary"
                placeholder="例：2330"
              />
            </Field>

            <Field label="股票名稱">
              <input
                value={form.name}
                onChange={(event) => {
                  setForm({ ...form, name: event.target.value });
                  setError(null);
                }}
                className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                placeholder="例：台積電"
              />
            </Field>
          </div>
        </div>

        <div className="border-t border-border bg-surface-elevated px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-xl bg-background py-3 text-sm font-medium disabled:opacity-60"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-xl gradient-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {isSubmitting ? "新增中" : "新增關注"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
