export type AccountType = "bank" | "brokerage" | "cash";

export type TransactionType = "buy" | "sell" | "dividend" | "deposit" | "withdrawal" | "fee";

export type StrategyAction = "buy" | "hold" | "sell";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  investable: number;
  institution: string;
};

export type Holding = {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  price: number;
  prevClose: number;
  sector: string;
  latestPriceDate?: string | null;
  dataSource?: string | null;
  priceStatus?: "live" | "manual";
};

export type Transaction = {
  id: string;
  symbol?: string;
  accountId?: string;
  type: TransactionType;
  quantity?: number;
  price?: number;
  amount: number;
  fee: number;
  tax: number;
  note?: string;
  occurredAt: string;
};

export type Strategy = {
  symbol: string;
  name: string;
  action: StrategyAction;
  confidence: number;
  price: number;
  target: number;
  technical: string;
  fundamental: string;
  news: string;
  risk: string;
};

export type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  updatedAt: string;
};

export type WatchlistItem = {
  id: string;
  symbol: string;
  name: string;
  createdAt: string;
};

export type PortfolioSummary = {
  total: number;
  stockValue: number;
  bankBalance: number;
  brokerCash: number;
  cash: number;
  totalCash: number;
  investableCash: number;
  todayPnL: number;
  totalPnL: number;
  cost: number;
};
