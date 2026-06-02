import type { CreditCardTransaction, InstallmentPlan } from "./creditCardTypes";
import type {
  Account,
  AssetAllocationItem,
  Holding,
  IndustryAllocationItem,
  LiabilitySummary,
  NetAssetSummary,
  PortfolioSummary,
} from "./types";

export const calculateHoldingMarketValue = (holding: Holding) => holding.price * holding.shares;

export const calculateHoldingProfitLoss = (holding: Holding) =>
  (holding.price - holding.avgCost) * holding.shares;

export const calculateHoldingReturnRate = (holding: Holding) => {
  if (holding.avgCost === 0) return 0;
  return ((holding.price - holding.avgCost) / holding.avgCost) * 100;
};

export const calculateTotalStockValue = (holdings: Holding[]) =>
  holdings.reduce((sum, holding) => sum + calculateHoldingMarketValue(holding), 0);

export const calculateTotalCashValue = (accounts: Account[]) =>
  accounts.reduce((sum, account) => sum + account.balance, 0);

export const calculateTotalAssets = (accounts: Account[], holdings: Holding[]) =>
  calculateTotalCashValue(accounts) + calculateTotalStockValue(holdings);

export const calculatePortfolioSummary = (
  accounts: Account[],
  holdings: Holding[],
): PortfolioSummary => {
  const stockValue = calculateTotalStockValue(holdings);
  const bankBalance = accounts
    .filter((account) => account.type === "bank")
    .reduce((sum, account) => sum + account.balance, 0);
  const brokerCash = accounts
    .filter((account) => account.type === "brokerage")
    .reduce((sum, account) => sum + account.balance, 0);
  const cash = accounts
    .filter((account) => account.type === "cash")
    .reduce((sum, account) => sum + account.balance, 0);
  const investableCash = accounts.reduce((sum, account) => sum + account.investable, 0);
  const cost = holdings.reduce((sum, holding) => sum + holding.avgCost * holding.shares, 0);
  const todayPnL = holdings.reduce(
    (sum, holding) => sum + (holding.price - holding.prevClose) * holding.shares,
    0,
  );
  const totalPnL = holdings.reduce((sum, holding) => sum + calculateHoldingProfitLoss(holding), 0);
  const totalCash = bankBalance + brokerCash + cash;

  return {
    total: stockValue + totalCash,
    stockValue,
    bankBalance,
    brokerCash,
    cash,
    totalCash,
    investableCash,
    todayPnL,
    totalPnL,
    cost,
  };
};

const ETF_SYMBOLS = new Set(["0050", "00878", "00919", "00713"]);

const getHoldingAssetBucket = (holding: Holding) => {
  // TODO: Split bond ETF into its own bucket after bond_etf is fully supported
  // across holdings, market data, and valuation flows.
  if (holding.symbol.toUpperCase().includes("B")) return "etf" as const;
  if (ETF_SYMBOLS.has(holding.symbol.toUpperCase())) return "etf" as const;
  return "stock" as const;
};

export const calculateCreditCardOutstanding = (transactions: CreditCardTransaction[]) =>
  transactions
    .filter((transaction) => !transaction.isPaid)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

export const calculateInstallmentRemaining = (plans: InstallmentPlan[]) =>
  plans.reduce(
    (sum, plan) =>
      sum +
      plan.payments
        .filter((payment) => !payment.isPaid)
        .reduce((acc, payment) => acc + payment.amount, 0),
    0,
  );

export const calculateThisMonthInstallmentDue = (
  plans: InstallmentPlan[],
  baseDate = new Date(),
) => {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  return plans.reduce((sum, plan) => {
    return (
      sum +
      plan.payments
        .filter((payment) => {
          if (payment.isPaid) return false;
          const dueDate = new Date(payment.dueDate);
          return dueDate.getFullYear() === year && dueDate.getMonth() === month;
        })
        .reduce((acc, payment) => acc + payment.amount, 0)
    );
  }, 0);
};

export const calculateLiabilitySummary = (
  creditCardTransactions: CreditCardTransaction[],
  installmentPlans: InstallmentPlan[],
): LiabilitySummary => {
  const creditCardOutstanding = calculateCreditCardOutstanding(creditCardTransactions);
  const installmentRemaining = calculateInstallmentRemaining(installmentPlans);
  const thisMonthInstallmentDue = calculateThisMonthInstallmentDue(installmentPlans);

  return {
    creditCardOutstanding,
    installmentRemaining,
    thisMonthDue: creditCardOutstanding + thisMonthInstallmentDue,
    totalLiabilities: creditCardOutstanding + installmentRemaining,
  };
};

export const calculateNetAssetSummary = (
  accounts: Account[],
  holdings: Holding[],
  creditCardTransactions: CreditCardTransaction[],
  installmentPlans: InstallmentPlan[],
): NetAssetSummary => {
  const portfolio = calculatePortfolioSummary(accounts, holdings);
  const liabilities = calculateLiabilitySummary(creditCardTransactions, installmentPlans);

  return {
    totalAssets: portfolio.total,
    totalLiabilities: liabilities.totalLiabilities,
    netAssets: portfolio.total - liabilities.totalLiabilities,
  };
};

export const calculateAssetAllocation = (
  accounts: Account[],
  holdings: Holding[],
): AssetAllocationItem[] => {
  const stockBuckets = holdings.reduce(
    (acc, holding) => {
      const amount = calculateHoldingMarketValue(holding);
      const bucket = getHoldingAssetBucket(holding);
      acc[bucket] += amount;
      return acc;
    },
    { stock: 0, etf: 0 },
  );

  const cashAmount = accounts
    .filter((account) => account.type === "cash")
    .reduce((sum, account) => sum + account.balance, 0);
  const financialAccountAmount = accounts
    .filter((account) => account.type !== "cash")
    .reduce((sum, account) => sum + account.balance, 0);

  const totalAssets = stockBuckets.stock + stockBuckets.etf + cashAmount + financialAccountAmount;
  const safeTotal = totalAssets === 0 ? 1 : totalAssets;

  return [
    {
      key: "stock",
      label: "股票",
      amount: stockBuckets.stock,
      ratio: stockBuckets.stock / safeTotal,
    },
    { key: "etf", label: "ETF", amount: stockBuckets.etf, ratio: stockBuckets.etf / safeTotal },
    { key: "cash", label: "現金", amount: cashAmount, ratio: cashAmount / safeTotal },
    {
      key: "financial_account",
      label: "金融帳戶",
      amount: financialAccountAmount,
      ratio: financialAccountAmount / safeTotal,
    },
  ];
};

export const calculateIndustryAllocation = (holdings: Holding[]): IndustryAllocationItem[] => {
  const totalStockValue = calculateTotalStockValue(holdings);
  const safeTotal = totalStockValue === 0 ? 1 : totalStockValue;
  const grouped = holdings.reduce<Record<string, number>>((acc, holding) => {
    const industry = holding.sector?.trim() || "其他";
    acc[industry] = (acc[industry] ?? 0) + calculateHoldingMarketValue(holding);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([industry, amount]) => ({
      industry,
      amount,
      ratio: amount / safeTotal,
    }))
    .sort((a, b) => b.amount - a.amount);
};
