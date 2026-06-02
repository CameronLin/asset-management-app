import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Bell,
  Eye,
  EyeOff,
  TrendingUp,
  Wallet,
  Landmark,
  Coins,
  CreditCard,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  accounts as mockAccounts,
  holdings as mockHoldings,
  formatTWD,
  formatPct,
  genSeries,
} from "@/lib/mock-data";
import {
  calculateAssetAllocation,
  calculateHoldingProfitLoss,
  calculateHoldingReturnRate,
  calculateIndustryAllocation,
  calculateLiabilitySummary,
  calculateNetAssetSummary,
  calculatePortfolioSummary,
} from "@/lib/calculations";
import { getTaiwanStockColor } from "@/lib/stockColor";
import { getAccounts, getHoldings } from "@/lib/storage";
import { getCreditCardTransactions, getInstallmentPlans } from "@/lib/creditCardStorage";
import { Sparkline } from "@/components/Sparkline";
import type { CreditCardTransaction, InstallmentPlan } from "@/lib/creditCardTypes";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "資產總覽 — Fortune" }] }),
  component: Overview,
});

function Overview() {
  const [hide, setHide] = useState(false);
  const [accounts, setAccounts] = useState(mockAccounts);
  const [holdings, setHoldings] = useState(mockHoldings);
  const [creditCardTransactions, setCreditCardTransactions] = useState<CreditCardTransaction[]>([]);
  const [installmentPlans, setInstallmentPlans] = useState<InstallmentPlan[]>([]);
  const t = calculatePortfolioSummary(accounts, holdings);
  const netAssetSummary = calculateNetAssetSummary(
    accounts,
    holdings,
    creditCardTransactions,
    installmentPlans,
  );
  const liabilitySummary = calculateLiabilitySummary(creditCardTransactions, installmentPlans);
  const assetAllocation = calculateAssetAllocation(accounts, holdings);
  const industryAllocation = calculateIndustryAllocation(holdings);
  const todayPct =
    t.stockValue - t.todayPnL === 0 ? 0 : (t.todayPnL / (t.stockValue - t.todayPnL)) * 100;
  const totalPct = t.cost === 0 ? 0 : (t.totalPnL / t.cost) * 100;
  const financialAccountBalance = t.bankBalance + t.brokerCash;
  const cashRemaining = t.cash;
  const compositionTotal = netAssetSummary.totalAssets === 0 ? 1 : netAssetSummary.totalAssets;
  const series = genSeries(t.total, 30, 0.012);

  useEffect(() => {
    setAccounts(getAccounts());
    setHoldings(getHoldings());
    setCreditCardTransactions(getCreditCardTransactions());
    setInstallmentPlans(getInstallmentPlans());
  }, []);

  const fmt = (n: number, sign = false) => (hide ? "NT$ ••••••" : formatTWD(n, { sign }));

  const cards = [
    { label: "股票市值", value: t.stockValue, icon: TrendingUp, tint: "text-primary" },
    { label: "金融帳戶餘額", value: financialAccountBalance, icon: Landmark, tint: "text-warning" },
    { label: "現金剩餘", value: cashRemaining, icon: Coins, tint: "text-neutral" },
    { label: "可投資金額", value: t.investableCash, icon: Wallet, tint: "text-profit" },
  ];

  return (
    <div className="space-y-5 px-4 pb-28 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">早安，老大</p>
          <h1 className="font-display text-xl font-semibold">投資組合</h1>
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-surface">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </button>
      </header>

      {/* Total assets hero */}
      <div className="relative overflow-hidden rounded-3xl gradient-hero p-5 shadow-card">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              總資產 NTD
            </span>
            <button onClick={() => setHide(!hide)} className="text-muted-foreground">
              {hide ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 font-display text-4xl font-bold tabular tracking-tight">
            {fmt(t.total)}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <PnLPill label="今日損益" value={t.todayPnL} pct={todayPct} hidden={hide} />
            <PnLPill label="總損益" value={t.totalPnL} pct={totalPct} hidden={hide} />
          </div>

          <div className="-mx-2 mt-4">
            <Sparkline data={series} change={t.todayPnL} height={50} className="w-full" />
          </div>
        </div>
      </div>

      {/* Composition */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map(({ label, value, icon: Icon, tint }) => (
          <div key={label} className="rounded-2xl bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <Icon className={`h-4 w-4 ${tint}`} />
            </div>
            <p className="mt-2 font-display text-lg font-semibold tabular">{fmt(value)}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold">淨資產</h2>
            <p className="mt-1 text-xs text-muted-foreground">總資產扣除信用卡與分期負債後的餘額</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-4.5 w-4.5 text-primary" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <NetStat
            label="總資產"
            value={netAssetSummary.totalAssets}
            className="text-foreground"
            hide={hide}
          />
          <NetStat
            label="總負債"
            value={netAssetSummary.totalLiabilities}
            className="text-warning"
            hide={hide}
          />
          <NetStat
            label="淨資產"
            value={netAssetSummary.netAssets}
            className="text-primary"
            hide={hide}
          />
        </div>
      </section>

      {/* Top holdings */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">持股表現</h2>
          <Link to="/holdings" className="text-xs text-primary">
            查看全部
          </Link>
        </div>
        <div className="space-y-2">
          {holdings.slice(0, 3).map((h) => {
            const pnl = calculateHoldingProfitLoss(h);
            const pct = calculateHoldingReturnRate(h);
            const stockColor = getTaiwanStockColor(pnl);
            return (
              <Link
                key={h.symbol}
                to="/holdings/$symbol"
                params={{ symbol: h.symbol }}
                className="flex items-center justify-between rounded-2xl bg-surface p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl font-mono text-xs font-semibold ${stockColor.bgClass} ${stockColor.textClass}`}
                  >
                    {h.symbol}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{h.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.shares} 股 · 均價 {h.avgCost}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold tabular">{h.price.toFixed(2)}</p>
                  <p className={`text-xs tabular ${stockColor.textClass}`}>{formatPct(pct)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Account quick view */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">資金分布</h2>
          <Link to="/accounts" className="text-xs text-primary">
            管理
          </Link>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-xs text-muted-foreground">可投資金額</p>
          <p className="mt-1 font-display text-2xl font-bold tabular text-primary">
            {fmt(t.investableCash)}
          </p>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-background">
            {[
              { w: (t.stockValue / compositionTotal) * 100, c: "var(--primary)" },
              { w: (financialAccountBalance / compositionTotal) * 100, c: "var(--warning)" },
              { w: (cashRemaining / compositionTotal) * 100, c: "var(--neutral)" },
            ].map((s, i) => (
              <div key={i} style={{ width: `${s.w}%`, backgroundColor: s.c }} />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-y-1 text-xs">
            <Legend
              color="var(--primary)"
              label="股票"
              pct={(t.stockValue / compositionTotal) * 100}
            />
            <Legend
              color="var(--warning)"
              label="金融帳戶"
              pct={(financialAccountBalance / compositionTotal) * 100}
            />
            <Legend
              color="var(--neutral)"
              label="現金剩餘"
              pct={(cashRemaining / compositionTotal) * 100}
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">資產配置</h2>
          <span className="text-xs text-muted-foreground">依總資產比例</span>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <div className="space-y-4">
            {assetAllocation.map((item) => (
              <AllocationRow
                key={item.key}
                label={item.label}
                amount={item.amount}
                ratio={item.ratio}
                hidden={hide}
              />
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">產業配置</h2>
          <span className="text-xs text-muted-foreground">依股票總市值比例</span>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <div className="space-y-4">
            {industryAllocation.map((item) => (
              <IndustryRow
                key={item.industry}
                label={item.industry}
                amount={item.amount}
                ratio={item.ratio}
                hidden={hide}
              />
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">負債摘要</h2>
          <span className="text-xs text-muted-foreground">本月應繳與剩餘負債</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <DebtCard
            label="信用卡未繳總額"
            value={liabilitySummary.creditCardOutstanding}
            icon={CreditCard}
            hide={hide}
          />
          <DebtCard
            label="分期剩餘總額"
            value={liabilitySummary.installmentRemaining}
            icon={Layers3}
            hide={hide}
          />
          <DebtCard
            label="本月預計應繳金額"
            value={liabilitySummary.thisMonthDue}
            icon={Wallet}
            hide={hide}
          />
        </div>
      </section>
    </div>
  );
}

function PnLPill({
  label,
  value,
  pct,
  hidden,
}: {
  label: string;
  value: number;
  pct: number;
  hidden: boolean;
}) {
  const stockColor = getTaiwanStockColor(value);
  const Icon =
    stockColor.color === "red"
      ? ArrowUpRight
      : stockColor.color === "green"
        ? ArrowDownRight
        : Minus;
  return (
    <div className={`rounded-2xl p-3 ${stockColor.bgClass}`}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-1">
        <Icon className={`h-4 w-4 ${stockColor.iconClass}`} />
        <span className={`font-mono text-base font-semibold tabular ${stockColor.textClass}`}>
          {hidden ? "••••" : formatTWD(value, { sign: true })}
        </span>
      </div>
      <p className={`text-[11px] tabular ${stockColor.textClass}`}>{formatPct(pct)}</p>
    </div>
  );
}

function Legend({ color, label, pct }: { color: string; label: string; pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto pr-3 tabular text-foreground">{pct.toFixed(1)}%</span>
    </div>
  );
}

function NetStat({
  label,
  value,
  className,
  hide,
}: {
  label: string;
  value: number;
  className: string;
  hide: boolean;
}) {
  return (
    <div className="rounded-2xl bg-background/40 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`mt-2 font-mono text-sm font-bold tabular ${className}`}>
        {hide ? "NT$ ••••••" : formatTWD(value)}
      </p>
    </div>
  );
}

function AllocationRow({
  label,
  amount,
  ratio,
  hidden,
}: {
  label: string;
  amount: number;
  ratio: number;
  hidden: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-1 font-mono text-xs tabular text-muted-foreground">
            {hidden ? "NT$ ••••••" : formatTWD(amount)}
          </p>
        </div>
        <p className="font-mono text-sm font-semibold tabular text-foreground">
          {(ratio * 100).toFixed(1)}%
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.max(ratio * 100, amount > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function IndustryRow({
  label,
  amount,
  ratio,
  hidden,
}: {
  label: string;
  amount: number;
  ratio: number;
  hidden: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-1 font-mono text-xs tabular text-muted-foreground">
            {hidden ? "NT$ ••••••" : formatTWD(amount)}
          </p>
        </div>
        <p className="font-mono text-sm font-semibold tabular text-foreground">
          {(ratio * 100).toFixed(1)}%
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
        <div
          className="h-full rounded-full bg-warning"
          style={{ width: `${Math.max(ratio * 100, amount > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function DebtCard({
  label,
  value,
  icon: Icon,
  hide,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  hide: boolean;
}) {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-warning" />
      </div>
      <p className="mt-2 font-display text-lg font-semibold tabular text-warning">
        {hide ? "NT$ ••••••" : formatTWD(value)}
      </p>
    </div>
  );
}
