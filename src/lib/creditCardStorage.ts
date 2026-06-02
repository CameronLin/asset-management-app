import type { CreditCard, CreditCardTransaction, InstallmentPlan } from "./creditCardTypes";

const STORAGE_KEYS = {
  creditCards: "stock-app.credit-cards",
  creditCardTransactions: "stock-app.credit-card-transactions",
  installmentPlans: "stock-app.installment-plans",
} as const;

const isBrowser = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

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

export const getCreditCards = () => readStorage<CreditCard[]>(STORAGE_KEYS.creditCards, []);

export const saveCreditCards = (cards: CreditCard[]) => {
  writeStorage(STORAGE_KEYS.creditCards, cards);
};

export const getCreditCardTransactions = () =>
  readStorage<CreditCardTransaction[]>(STORAGE_KEYS.creditCardTransactions, []);

export const saveCreditCardTransactions = (transactions: CreditCardTransaction[]) => {
  writeStorage(STORAGE_KEYS.creditCardTransactions, transactions);
};

export const getInstallmentPlans = () =>
  readStorage<InstallmentPlan[]>(STORAGE_KEYS.installmentPlans, []);

export const saveInstallmentPlans = (plans: InstallmentPlan[]) => {
  writeStorage(STORAGE_KEYS.installmentPlans, plans);
};
