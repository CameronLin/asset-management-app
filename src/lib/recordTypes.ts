export type RecordType =
  | "buy"
  | "sell"
  | "dividend"
  | "income"
  | "expense"
  | "credit_card_payment"
  | "installment_payment";

export type FinanceRecord = {
  id: string;
  type: RecordType;
  date: string;
  title: string;
  amount: number;
  category?: string;
  note?: string;
  stockSymbol?: string;
  stockName?: string;
  shares?: number;
  price?: number;
  fee?: number;
  tax?: number;
  accountId?: string;
  creditCardId?: string;
  installmentPlanId?: string;
  createdAt: string;
  updatedAt: string;
};
