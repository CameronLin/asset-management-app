import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, ArrowUpDown, Plus, MoreVertical, Pencil, Trash2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { holdings as mockHoldings, formatTWD, formatPct } from "@/lib/mock-data";
import {
  calculateHoldingMarketValue,
  calculateHoldingProfitLoss,
  calculateHoldingReturnRate,
} from "@/lib/calculations";
import {
  fetchTaiwanStockLatestPrice,
  MarketDataError,
  normalizeTaiwanStockSymbol,
} from "@/lib/marketData";
import { getTaiwanStockColor } from "@/lib/stockColor";
import { getHoldings, saveHoldings } from "@/lib/storage";
import type { Holding } from "@/lib/types";

export const Route = createFileRoute("/_app/holdings")({
  head: () => ({ meta: [{ title: "持股管理" }] }),
  component: HoldingsPage,
});

function HoldingsPage() {
  const [holdings, setHoldings] = useState(mockHoldings);
  const [sort, setSort] = useState<"pnl" | "value" | "pct">("value");
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Holding | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();
  const enriched = holdings
    .map((h) => {
      const marketValue = calculateHoldingMarketValue(h);
      const profitLoss = calculateHoldingProfitLoss(h);
      const returnRate = calculateHoldingReturnRate(h);
      const costBasis = h.shares * h.avgCost;

      return { ...h, marketValue, costBasis, profitLoss, returnRate };
    })
    .filter((h) => {
      if (!normalizedQuery) return true;
      return (
        h.symbol.toLowerCase().includes(normalizedQuery) ||
        h.name.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((a, b) =>
      sort === "value"
        ? b.marketValue - a.marketValue
        : sort === "pnl"
          ? b.profitLoss - a.profitLoss
          : b.returnRate - a.returnRate,
    );

  const totalValue = enriched.reduce((sum, holding) => sum + holding.marketValue, 0);
  const totalPnL = enriched.reduce((sum, holding) => sum + holding.profitLoss, 0);
  const totalPnLColor = getTaiwanStockColor(totalPnL);

  useEffect(() => {
    try {
      setHoldings(getHoldings());
    } catch {
      setActionError("持股資料讀取失敗，請重新整理頁面。");
    }
  }, []);

  const handleSave = async (holding: Holding) => {
    try {
      let nextHolding = holding;
      let nextActionError: string | null = null;

      if (!editing) {
        try {
          const latest = await fetchTaiwanStockLatestPrice(holding.symbol);
          nextHolding = {
            ...holding,
            price: latest.close,
            prevClose: latest.close,
            latestPriceDate: latest.date,
            dataSource: "FinMind",
            priceStatus: "live",
          };
        } catch (error) {
          if (error instanceof MarketDataError && error.code === "NOT_FOUND") {
            nextActionError = `查無股票代號 ${holding.symbol} 的行情資料，已先以手動價格建立持股，狀態為尚未取得即時股價。`;
          } else {
            nextActionError = `尚未取得 ${holding.symbol} 的即時股價，已先使用手動輸入價格。`;
          }

          nextHolding = {
            ...holding,
            latestPriceDate: null,
            dataSource: "Manual",
            priceStatus: "manual",
          };
        }
      }

      setHoldings((prev) => {
        const next = editing
          ? prev.map((item) => (item.symbol === editing.symbol ? nextHolding : item))
          : [...prev, nextHolding];
        saveHoldings(next);
        return next;
      });
      setActionError(nextActionError);
      setShowForm(false);
      setEditing(null);
    } catch {
      setActionError("持股儲存失敗，請稍後再試。");
    }
  };

  const handleDelete = (symbol: string) => {
    try {
      setHoldings((prev) => {
        const next = prev.filter((item) => item.symbol !== symbol);
        saveHoldings(next);
        return next;
      });
      setActionError(null);
      setOpenMenu(null);
    } catch {
      setActionError("持股刪除失敗，請稍後再試。");
    }
  };

  const handleUpdateAllPrices = async () => {
    if (holdings.length === 0 || isUpdatingPrices) return;

    setIsUpdatingPrices(true);
    setActionError(null);

    const results = await Promise.allSettled(
      holdings.map(async (holding) => {
        const latest = await fetchTaiwanStockLatestPrice(holding.symbol);
        return {
          symbol: holding.symbol,
          nextPrice: latest.close,
        };
      }),
    );

    try {
      const nextHoldings = holdings.map((holding, index) => {
        const result = results[index];
        if (result?.status !== "fulfilled") {
          return holding;
        }

        return {
          ...holding,
          prevClose: holding.price,
          price: result.value.nextPrice,
          latestPriceDate: result.value.date,
          dataSource: "FinMind",
          priceStatus: "live",
        };
      });

      saveHoldings(nextHoldings);
      setHoldings(nextHoldings);

      const failedSymbols = results.flatMap((result, index) => {
        if (result.status === "fulfilled") return [];
        return holdings[index]?.symbol ? [holdings[index].symbol] : [];
      });

      if (failedSymbols.length > 0) {
        setActionError(`以下股票更新失敗，已保留原股價：${failedSymbols.join("、")}`);
      }
    } catch {
      setActionError("股價更新失敗，請稍後再試。");
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  return (
    <div className="space-y-4 px-4 pt-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">持股管理</h1>
          <p className="mt-1 text-xs text-muted-foreground">共 {holdings.length} 檔個股</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary shadow-glow"
        >
          <Plus className="h-5 w-5 text-primary-foreground" />
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-xs text-muted-foreground">總市值</p>
          <p className="mt-1 font-display text-lg font-bold tabular">{formatTWD(totalValue)}</p>
        </div>
        <div className={`rounded-2xl p-4 ${totalPnLColor.bgClass}`}>
          <p className="text-xs text-muted-foreground">未實現損益</p>
          <p className={`mt-1 font-display text-lg font-bold tabular ${totalPnLColor.textClass}`}>
            {formatTWD(totalPnL, { sign: true })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-surface px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋股票代號或名稱"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="button"
          onClick={() => setSort(sort === "value" ? "pnl" : sort === "pnl" ? "pct" : "value")}
          className="flex items-center gap-1 rounded-xl bg-surface px-3 py-2 text-xs"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sort === "value" ? "市值" : sort === "pnl" ? "損益" : "報酬率"}
        </button>
        <button
          type="button"
          onClick={handleUpdateAllPrices}
          disabled={isUpdatingPrices || holdings.length === 0}
          className="flex items-center gap-1 rounded-xl bg-surface px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isUpdatingPrices ? "animate-spin" : ""}`} />
          {isUpdatingPrices ? "更新中" : "更新股價"}
        </button>
      </div>

      {actionError && (
        <div className="rounded-2xl border border-loss/30 bg-loss/10 px-4 py-3 text-xs text-loss">
          {actionError}
        </div>
      )}

      <div className="space-y-2">
        {enriched.map((holding) => {
          const stockColor = getTaiwanStockColor(holding.profitLoss);

          return (
            <div key={holding.symbol} className="relative rounded-2xl bg-surface p-4">
              <div className="flex items-start justify-between">
                <Link
                  to="/holdings/$symbol"
                  params={{ symbol: holding.symbol }}
                  className="flex min-w-0 flex-1 items-start gap-3 active:scale-[0.99] transition-transform"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold ${stockColor.bgClass} ${stockColor.textClass}`}
                  >
                    {holding.symbol}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{holding.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{holding.sector}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {holding.latestPriceDate
                        ? `價格日期 ${holding.latestPriceDate}`
                        : "尚未取得即時股價"}
                    </p>
                  </div>
                </Link>
                <div className="ml-3 flex items-start gap-2">
                  <div className="text-right">
                    <p className="font-mono text-base font-bold tabular">
                      {holding.price.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {holding.dataSource ?? "Manual"}
                    </p>
                    <p className={`font-mono text-xs tabular ${stockColor.textClass}`}>
                      {formatPct(holding.returnRate)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenMenu(openMenu === holding.symbol ? null : holding.symbol)}
                    className="text-muted-foreground"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 border-t border-border pt-3 text-[11px]">
                <Cell label="持有" value={`${holding.shares}`} />
                <Cell label="均價" value={holding.avgCost.toFixed(1)} />
                <Cell label="市值" value={formatTWD(holding.marketValue)} />
                <Cell
                  label="損益"
                  value={formatTWD(holding.profitLoss, { sign: true })}
                  className={stockColor.textClass}
                />
              </div>

              {openMenu === holding.symbol && (
                <div className="absolute right-3 top-12 z-10 min-w-[120px] overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-card">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(holding);
                      setShowForm(true);
                      setOpenMenu(null);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5" /> 編輯
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(holding.symbol)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-loss hover:bg-muted"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> 刪除
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm && (
        <HoldingForm
          initial={editing}
          existingSymbols={holdings.map((holding) => holding.symbol)}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function HoldingForm({
  initial,
  existingSymbols,
  onCancel,
  onSave,
}: {
  initial: Holding | null;
  existingSymbols: string[];
  onCancel: () => void;
  onSave: (holding: Holding) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    stockSymbol: initial?.symbol ?? "",
    stockName: initial?.name ?? "",
    shares: initial ? String(initial.shares) : "",
    avgCost: initial ? String(initial.avgCost) : "",
    currentPrice: initial ? String(initial.price) : "",
  });

  const shares = Number(form.shares || 0);
  const avgCost = Number(form.avgCost || 0);
  const currentPrice = Number(form.currentPrice || 0);
  const marketValue = shares * currentPrice;
  const costBasis = shares * avgCost;
  const profitLoss = marketValue - costBasis;
  const returnRate = costBasis === 0 ? 0 : (profitLoss / costBasis) * 100;
  const stockColor = getTaiwanStockColor(profitLoss);

  const handleSubmit = async () => {
    const stockSymbol = normalizeTaiwanStockSymbol(form.stockSymbol);
    const stockName = form.stockName.trim();

    if (!stockSymbol) {
      setError("股票代號不可空白。");
      return;
    }

    if (!stockName) {
      setError("股票名稱不可空白。");
      return;
    }

    if (shares <= 0) {
      setError("持有股數必須大於 0。");
      return;
    }

    if (avgCost < 0 || currentPrice < 0) {
      setError("價格不可小於 0。");
      return;
    }

    if (!Number.isFinite(shares) || !Number.isFinite(avgCost) || !Number.isFinite(currentPrice)) {
      setError("請輸入有效的數字。");
      return;
    }

    if (!initial && existingSymbols.includes(stockSymbol)) {
      setError("股票代號已存在。");
      return;
    }

    if (initial && stockSymbol !== initial.symbol) {
      setError("編輯時不可修改股票代號，避免明細頁連結失效。");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onSave({
        symbol: stockSymbol,
        name: stockName,
        shares,
        avgCost,
        price: currentPrice,
        prevClose: initial?.prevClose ?? currentPrice,
        sector: initial?.sector ?? "未分類",
        latestPriceDate: initial?.latestPriceDate ?? null,
        dataSource: initial?.dataSource ?? "Manual",
        priceStatus: initial?.priceStatus ?? "manual",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-md rounded-t-3xl bg-surface-elevated p-5 pb-8">
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-muted" />
        <h3 className="font-display text-lg font-semibold">{initial ? "編輯持股" : "新增持股"}</h3>
        <div className="mt-4 space-y-3">
          {error && (
            <div className="rounded-xl border border-loss/30 bg-loss/10 px-3 py-2 text-xs text-loss">
              {error}
            </div>
          )}
          <Field label="股票代號">
            <input
              value={form.stockSymbol}
              onChange={(e) => {
                setForm({ ...form, stockSymbol: e.target.value });
                setError(null);
              }}
              disabled={initial != null}
              className="w-full rounded-xl bg-background px-3 py-2.5 text-sm uppercase outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              placeholder="例：2330"
            />
          </Field>
          <Field label="股票名稱">
            <input
              value={form.stockName}
              onChange={(e) => {
                setForm({ ...form, stockName: e.target.value });
                setError(null);
              }}
              className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="例：台積電"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="持有股數">
              <input
                type="number"
                min={0}
                value={form.shares}
                onChange={(e) => {
                  setForm({ ...form, shares: e.target.value });
                  setError(null);
                }}
                className="w-full rounded-xl bg-background px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
            <Field label="平均成本">
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.avgCost}
                onChange={(e) => {
                  setForm({ ...form, avgCost: e.target.value });
                  setError(null);
                }}
                className="w-full rounded-xl bg-background px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
          </div>
          <Field label="目前價格">
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.currentPrice}
              onChange={(e) => {
                setForm({ ...form, currentPrice: e.target.value });
                setError(null);
              }}
              className="w-full rounded-xl bg-background px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </Field>
          {!initial && (
            <p className="text-[11px] text-muted-foreground">
              儲存後會先嘗試從 FinMind 取得最新股價；若失敗，會先使用你手動輸入的價格。
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-background/60 p-3 text-xs">
            <SummaryCell label="市值" value={formatTWD(marketValue)} />
            <SummaryCell label="成本" value={formatTWD(costBasis)} />
            <SummaryCell
              label="損益"
              value={formatTWD(profitLoss, { sign: true })}
              className={stockColor.textClass}
            />
            <SummaryCell
              label="報酬率"
              value={formatPct(returnRate)}
              className={stockColor.textClass}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-xl bg-background py-3 text-sm font-medium"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-xl gradient-primary py-3 text-sm font-semibold text-primary-foreground"
            >
              {isSubmitting ? "儲存中" : "儲存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Cell({
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
      <p className="text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-mono font-medium tabular ${className}`}>{value}</p>
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

function SummaryCell({
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
      <p className="text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-sm font-semibold tabular ${className}`}>{value}</p>
    </div>
  );
}
