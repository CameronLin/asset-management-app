import { accounts as mockAccounts, holdings as mockHoldings } from "./mock-data";
import { normalizeTaiwanStockSymbol } from "./marketData";
import type { Account, Holding, Transaction } from "./types";

const STORAGE_KEYS = {
  accounts: "stock-app.accounts",
  holdings: "stock-app.holdings",
  transactions: "stock-app.transactions",
} as const;

const DEFAULT_TRANSACTIONS: Transaction[] = [];

const isBrowser = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const normalizeAccount = (
  account: Account | (Omit<Account, "type"> & { type: string }),
): Account => ({
  ...account,
  type: account.type === "broker" ? "brokerage" : account.type,
});

const normalizeAccounts = (accounts: Array<Account | (Omit<Account, "type"> & { type: string })>) =>
  accounts.map(normalizeAccount);

const normalizeHolding = (holding: Holding): Holding => {
  const normalizedSymbol = normalizeTaiwanStockSymbol(holding.symbol);
  const normalizedPrice = Number.isFinite(holding.price) ? holding.price : 0;
  const normalizedPrevClose = Number.isFinite(holding.prevClose)
    ? holding.prevClose
    : normalizedPrice;

  return {
    ...holding,
    symbol: normalizedSymbol || holding.symbol,
    price: normalizedPrice,
    prevClose: normalizedPrevClose,
    sector: holding.sector?.trim() || "其他",
    latestPriceDate: holding.latestPriceDate ?? null,
    dataSource: holding.dataSource ?? null,
    priceStatus: holding.priceStatus ?? "manual",
  };
};

const normalizeHoldings = (holdings: Holding[]) => holdings.map(normalizeHolding);

const readStorage = <T>(key: string, fallback: T): T => {
  if (!isBrowser()) return clone(fallback);

  const stored = window.localStorage.getItem(key);
  if (stored == null) {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return clone(fallback);
  }

  try {
    return JSON.parse(stored) as T;
  } catch {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return clone(fallback);
  }
};

const writeStorage = <T>(key: string, value: T) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const getAccounts = () => {
  const accounts = readStorage<Array<Account | (Omit<Account, "type"> & { type: string })>>(
    STORAGE_KEYS.accounts,
    mockAccounts,
  );
  const normalized = normalizeAccounts(accounts);
  writeStorage(STORAGE_KEYS.accounts, normalized);
  return normalized;
};

export const saveAccounts = (accounts: Account[]) => {
  writeStorage(STORAGE_KEYS.accounts, normalizeAccounts(accounts));
};

export const getHoldings = () => {
  const holdings = readStorage<Holding[]>(STORAGE_KEYS.holdings, mockHoldings);
  const normalized = normalizeHoldings(holdings);
  writeStorage(STORAGE_KEYS.holdings, normalized);
  return normalized;
};

export const saveHoldings = (holdings: Holding[]) => {
  writeStorage(STORAGE_KEYS.holdings, normalizeHoldings(holdings));
};

export const getTransactions = () =>
  readStorage<Transaction[]>(STORAGE_KEYS.transactions, DEFAULT_TRANSACTIONS);

export const saveTransactions = (transactions: Transaction[]) => {
  writeStorage(STORAGE_KEYS.transactions, transactions);
};
