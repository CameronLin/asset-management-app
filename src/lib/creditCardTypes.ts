export type CreditCard = {
  id: string;
  name: string;
  issuer: string;
  last4: string;
  billingDay: number;
  dueDay: number;
  creditLimit: number;
  createdAt: string;
};

export type CreditCardTransaction = {
  id: string;
  cardId: string;
  merchantName: string;
  amount: number;
  transactionDate: string;
  description?: string;
  isPaid: boolean;
  paidAt?: string | null;
  createdAt: string;
};

export type InstallmentPayment = {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  principal: number;
  interest: number;
  isPaid: boolean;
  paidAt?: string | null;
};

export type InstallmentPlan = {
  id: string;
  itemName: string;
  startDate: string;
  totalAmount: number;
  installmentMonths: number;
  annualInterestRate: number;
  monthlyPayment: number;
  payments: InstallmentPayment[];
  createdAt: string;
};
