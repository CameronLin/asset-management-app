import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { holdings, formatPct, genSeries } from "@/lib/mock-data";
import { getTaiwanStockColor } from "@/lib/stockColor";
import { Sparkline } from "@/components/Sparkline";

export const Route = createFileRoute("/_app/market")({
  head: () => ({ meta: [{ title: "市場行情" }] }),
  component: MarketPage,
});

const INDICES = [
  { name: "台股加權", value: 22834.5, change: 156.2, pct: 0.69 },
  { name: "櫃買指數", value: 268.4, change: -1.8, pct: -0.67 },
  { name: "台灣50", value: 198.6, change: 2.4, pct: 1.22 },
];

function MarketPage() {
  return (
    <div className="space-y-5 px-4 pt-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">市場行情</h1>
        <p className="mt-1 text-xs text-muted-foreground">即時指數與個股動態</p>
      </header>

      <div className="grid grid-cols-1 gap-2">
        {INDICES.map((idx) => {
          const stockColor = getTaiwanStockColor(idx.change);
          const Icon =
            stockColor.color === "red"
              ? TrendingUp
              : stockColor.color === "green"
                ? TrendingDown
                : Minus;
          return (
            <div
              key={idx.name}
              className="flex items-center justify-between rounded-2xl bg-surface p-4"
            >
              <div>
                <p className="text-sm font-semibold">{idx.name}</p>
                <p className="mt-1 font-display text-xl font-bold tabular">
                  {idx.value.toLocaleString()}
                </p>
              </div>
              <div
                className={`flex items-center gap-1 rounded-lg px-3 py-2 ${stockColor.bgClass} ${stockColor.textClass}`}
              >
                <Icon className={`h-4 w-4 ${stockColor.iconClass}`} />
                <div className="text-right">
                  <p className="font-mono text-xs tabular">
                    {idx.change > 0 ? "+" : ""}
                    {idx.change.toFixed(2)}
                  </p>
                  <p className="font-mono text-[11px] tabular">{formatPct(idx.pct)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold">我的關注</h2>
        <div className="space-y-2">
          {holdings.map((h) => {
            const change = h.price - h.prevClose;
            const pct = (change / h.prevClose) * 100;
            const stockColor = getTaiwanStockColor(change);
            return (
              <Link
                key={h.symbol}
                to="/holdings/$symbol"
                params={{ symbol: h.symbol }}
                className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{h.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{h.symbol}</p>
                </div>
                <div className="h-10 w-20 shrink-0">
                  <Sparkline data={genSeries(h.price, 20, 0.02)} change={change} height={40} />
                </div>
                <div className="w-20 shrink-0 text-right">
                  <p className="font-mono text-sm font-bold tabular">{h.price.toFixed(2)}</p>
                  <p className={`font-mono text-[11px] tabular ${stockColor.textClass}`}>
                    {formatPct(pct)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
