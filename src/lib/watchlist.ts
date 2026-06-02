import { normalizeTaiwanStockSymbol } from "./marketData";
import type { WatchlistItem } from "./types";

const STORAGE_KEY = "stock-app.watchlist";

const isBrowser = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const normalizeWatchlistItem = (item: WatchlistItem): WatchlistItem => ({
  ...item,
  symbol: normalizeTaiwanStockSymbol(item.symbol) || item.symbol.trim().toUpperCase(),
  name: item.name.trim(),
  createdAt: item.createdAt || new Date().toISOString(),
});

const readStorage = (): WatchlistItem[] => {
  if (!isBrowser()) return [];

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored == null) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  }

  try {
    return JSON.parse(stored) as WatchlistItem[];
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  }
};

export function getWatchlist() {
  const normalized = readStorage().map(normalizeWatchlistItem);
  saveWatchlist(normalized);
  return clone(normalized);
}

export function saveWatchlist(items: WatchlistItem[]) {
  if (!isBrowser()) return;
  const normalized = items.map(normalizeWatchlistItem);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function addWatchlistItem(item: WatchlistItem) {
  const current = getWatchlist();
  if (current.some((entry) => entry.symbol === normalizeWatchlistItem(item).symbol)) {
    return current;
  }

  const next = [...current, normalizeWatchlistItem(item)];
  saveWatchlist(next);
  return next;
}

export function removeWatchlistItem(id: string) {
  const next = getWatchlist().filter((item) => item.id !== id);
  saveWatchlist(next);
  return next;
}
