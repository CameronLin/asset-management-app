import type { FinanceRecord } from "./recordTypes";

const STORAGE_KEY = "stock-app.finance-records";

const isBrowser = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const normalizeRecord = (record: FinanceRecord): FinanceRecord => ({
  ...record,
  title: record.title.trim(),
  category: record.category?.trim() || undefined,
  note: record.note?.trim() || undefined,
  stockSymbol: record.stockSymbol?.trim().toUpperCase() || undefined,
  stockName: record.stockName?.trim() || undefined,
  amount: Number(record.amount) || 0,
  shares: record.shares != null ? Number(record.shares) || 0 : undefined,
  price: record.price != null ? Number(record.price) || 0 : undefined,
  fee: record.fee != null ? Number(record.fee) || 0 : undefined,
  tax: record.tax != null ? Number(record.tax) || 0 : undefined,
  createdAt: record.createdAt || new Date().toISOString(),
  updatedAt: record.updatedAt || new Date().toISOString(),
});

const readStorage = (): FinanceRecord[] => {
  if (!isBrowser()) return [];

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored == null) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  }

  try {
    return JSON.parse(stored) as FinanceRecord[];
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  }
};

export function getFinanceRecords() {
  const normalized = readStorage().map(normalizeRecord);
  saveFinanceRecords(normalized);
  return clone(normalized);
}

export function saveFinanceRecords(records: FinanceRecord[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.map(normalizeRecord)));
}

export function addFinanceRecord(record: FinanceRecord) {
  const next = [...getFinanceRecords(), normalizeRecord(record)];
  saveFinanceRecords(next);
  return clone(next);
}

export function updateFinanceRecord(record: FinanceRecord) {
  const normalized = normalizeRecord(record);
  const next = getFinanceRecords().map((item) => (item.id === normalized.id ? normalized : item));
  saveFinanceRecords(next);
  return clone(next);
}

export function deleteFinanceRecord(id: string) {
  const next = getFinanceRecords().filter((item) => item.id !== id);
  saveFinanceRecords(next);
  return clone(next);
}
