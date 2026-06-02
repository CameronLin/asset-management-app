import type { InstallmentPayment, InstallmentPlan } from "./creditCardTypes";

export type FutureInstallmentBillItem = {
  planId: string;
  planName: string;
  installmentNumber: number;
  installmentMonths: number;
  dueDate: string;
  amount: number;
  isPaid: boolean;
};

export type FutureInstallmentBillMonth = {
  monthKey: string;
  year: number;
  month: number;
  label: string;
  totalAmount: number;
  items: FutureInstallmentBillItem[];
};

type FlattenedInstallmentPayment = {
  planId: string;
  planName: string;
  installmentMonths: number;
  payment: InstallmentPayment;
};

const toMonthKey = (date: string) => {
  const parsed = new Date(date);
  const year = parsed.getFullYear();
  const month = parsed.getMonth() + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
};

const toMonthLabel = (year: number, month: number) => `${year} 年 ${month} 月`;

export const groupInstallmentPaymentsByMonth = (
  payments: FlattenedInstallmentPayment[],
): FutureInstallmentBillMonth[] => {
  const grouped = new Map<string, FutureInstallmentBillMonth>();

  payments.forEach(({ planId, planName, installmentMonths, payment }) => {
    const parsed = new Date(payment.dueDate);
    const year = parsed.getFullYear();
    const month = parsed.getMonth() + 1;
    const monthKey = toMonthKey(payment.dueDate);
    const current = grouped.get(monthKey) ?? {
      monthKey,
      year,
      month,
      label: toMonthLabel(year, month),
      totalAmount: 0,
      items: [],
    };

    current.items.push({
      planId,
      planName,
      installmentNumber: payment.installmentNumber,
      installmentMonths,
      dueDate: payment.dueDate,
      amount: payment.amount,
      isPaid: payment.isPaid,
    });
    current.totalAmount += payment.amount;
    grouped.set(monthKey, current);
  });

  return Array.from(grouped.values())
    .map((monthGroup) => ({
      ...monthGroup,
      items: monthGroup.items.sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      ),
    }))
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
};

export const getFutureInstallmentBills = (
  plans: InstallmentPlan[],
  payments?: InstallmentPayment[],
): FutureInstallmentBillMonth[] => {
  const now = new Date();
  const currentMonthKey = toMonthKey(now.toISOString());
  const paymentLookup = payments ? new Map(payments.map((payment) => [payment.id, payment])) : null;

  const flattenedPayments = plans.flatMap((plan) =>
    plan.payments
      .map((payment) => {
        const resolvedPayment = paymentLookup?.get(payment.id) ?? payment;
        return {
          planId: plan.id,
          planName: plan.itemName,
          installmentMonths: plan.installmentMonths,
          payment: resolvedPayment,
        };
      })
      .filter(({ payment }) => !payment.isPaid)
      .filter(({ payment }) => toMonthKey(payment.dueDate) >= currentMonthKey),
  );

  return groupInstallmentPaymentsByMonth(flattenedPayments);
};
