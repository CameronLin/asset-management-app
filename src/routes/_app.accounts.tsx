import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Landmark,
  Wallet,
  Coins,
  MoreVertical,
  Pencil,
  Trash2,
  CreditCard as CreditCardIcon,
  ReceiptText,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { accounts as initialAccounts, formatTWD } from "@/lib/mock-data";
import { getAccounts, saveAccounts } from "@/lib/storage";
import {
  getCreditCards,
  getCreditCardTransactions,
  getInstallmentPlans,
  saveCreditCards,
  saveCreditCardTransactions,
  saveInstallmentPlans,
} from "@/lib/creditCardStorage";
import type { Account, AccountType } from "@/lib/types";
import type {
  CreditCard,
  CreditCardTransaction,
  InstallmentPlan,
  InstallmentPayment,
} from "@/lib/creditCardTypes";

export const Route = createFileRoute("/_app/accounts")({
  head: () => ({ meta: [{ title: "帳戶管理" }] }),
  component: AccountsPage,
});

const TYPE_META = {
  bank: { label: "銀行", icon: Landmark, color: "text-warning", bg: "bg-warning/15" },
  brokerage: { label: "證券", icon: Wallet, color: "text-primary", bg: "bg-primary/10" },
  cash: { label: "現金", icon: Coins, color: "text-neutral", bg: "bg-muted" },
} as const;

const ACCOUNT_TYPES: AccountType[] = ["bank", "brokerage", "cash"];
const TABS = ["financial", "credit-card", "installment"] as const;
type TabKey = (typeof TABS)[number];

const sanitizeAmount = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

function AccountsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("financial");
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [creditCardTransactions, setCreditCardTransactions] = useState<CreditCardTransaction[]>([]);
  const [installmentPlans, setInstallmentPlans] = useState<InstallmentPlan[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showCreditCardForm, setShowCreditCardForm] = useState(false);
  const [showCreditCardTransactionForm, setShowCreditCardTransactionForm] = useState(false);
  const [showInstallmentForm, setShowInstallmentForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const accountTotal = accounts.reduce((sum, account) => sum + account.balance, 0);
  const investableTotal = accounts.reduce((sum, account) => sum + account.investable, 0);
  const totalCardOutstanding = creditCardTransactions
    .filter((transaction) => !transaction.isPaid)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalInstallmentRemaining = installmentPlans.reduce(
    (sum, plan) =>
      sum +
      plan.payments
        .filter((payment) => !payment.isPaid)
        .reduce((acc, payment) => acc + payment.amount, 0),
    0,
  );

  const groupedAccounts = ACCOUNT_TYPES.map((type) => ({
    type,
    items: accounts.filter((account) => account.type === type),
    total: accounts
      .filter((account) => account.type === type)
      .reduce((sum, account) => sum + account.balance, 0),
  }));

  useEffect(() => {
    try {
      setAccounts(getAccounts());
      setCreditCards(getCreditCards());
      setCreditCardTransactions(getCreditCardTransactions());
      setInstallmentPlans(getInstallmentPlans());
    } catch {
      setActionError("資料讀取失敗，請重新整理頁面。");
    }
  }, []);

  const handleSaveAccount = (account: Account) => {
    try {
      const isEditing = accounts.some((item) => item.id === account.id);
      setAccounts((prev) => {
        const exists = prev.find((item) => item.id === account.id);
        const next = exists
          ? prev.map((item) => (item.id === account.id ? account : item))
          : [...prev, account];
        saveAccounts(next);
        return next;
      });
      setActionError(null);
      toast.success(isEditing ? "帳戶已更新" : "新增帳戶成功");
      setShowAccountForm(false);
      setEditingAccount(null);
    } catch {
      setActionError("帳戶儲存失敗，請稍後再試。");
    }
  };

  const handleDeleteAccount = (id: string) => {
    try {
      setAccounts((prev) => {
        const next = prev.filter((item) => item.id !== id);
        saveAccounts(next);
        return next;
      });
      setActionError(null);
      setOpenMenu(null);
      toast.success("帳戶已刪除");
    } catch {
      setActionError("帳戶刪除失敗，請稍後再試。");
    }
  };

  const handleSaveCreditCard = (card: CreditCard) => {
    try {
      setCreditCards((prev) => {
        const next = [...prev, card];
        saveCreditCards(next);
        return next;
      });
      setActionError(null);
      setShowCreditCardForm(false);
      toast.success("新增信用卡成功");
    } catch {
      setActionError("信用卡儲存失敗，請稍後再試。");
    }
  };

  const handleSaveCreditCardTransaction = (transaction: CreditCardTransaction) => {
    try {
      setCreditCardTransactions((prev) => {
        const next = [transaction, ...prev];
        saveCreditCardTransactions(next);
        return next;
      });
      setActionError(null);
      setSelectedCardId(null);
      setShowCreditCardTransactionForm(false);
      toast.success("新增當期消費成功");
    } catch {
      setActionError("消費紀錄儲存失敗，請稍後再試。");
    }
  };

  const handleMarkTransactionPaid = (transactionId: string) => {
    try {
      setCreditCardTransactions((prev) => {
        const next = prev.map((transaction) =>
          transaction.id === transactionId
            ? { ...transaction, isPaid: true, paidAt: new Date().toISOString() }
            : transaction,
        );
        saveCreditCardTransactions(next);
        return next;
      });
      toast.success("已標記信用卡帳單為已繳");
    } catch {
      setActionError("更新信用卡帳單狀態失敗。");
    }
  };

  const handleSaveInstallmentPlan = (plan: InstallmentPlan) => {
    try {
      setInstallmentPlans((prev) => {
        const next = [plan, ...prev];
        saveInstallmentPlans(next);
        return next;
      });
      setActionError(null);
      setShowInstallmentForm(false);
      toast.success("新增分期項目成功");
    } catch {
      setActionError("分期項目儲存失敗，請稍後再試。");
    }
  };

  const handleMarkInstallmentPaid = (planId: string, paymentId: string) => {
    try {
      setInstallmentPlans((prev) => {
        const next = prev.map((plan) =>
          plan.id !== planId
            ? plan
            : {
                ...plan,
                payments: plan.payments.map((payment) =>
                  payment.id === paymentId
                    ? { ...payment, isPaid: true, paidAt: new Date().toISOString() }
                    : payment,
                ),
              },
        );
        saveInstallmentPlans(next);
        return next;
      });
      toast.success("已標記該期分期為已繳");
    } catch {
      setActionError("更新分期付款狀態失敗。");
    }
  };

  const activeSummary =
    activeTab === "financial"
      ? {
          title: "資金總額",
          primary: formatTWD(accountTotal),
          secondaryLabel: "可投資金額",
          secondaryValue: formatTWD(investableTotal),
        }
      : activeTab === "credit-card"
        ? {
            title: "本期未繳總額",
            primary: formatTWD(totalCardOutstanding),
            secondaryLabel: "信用卡張數",
            secondaryValue: `${creditCards.length} 張`,
          }
        : {
            title: "分期剩餘金額",
            primary: formatTWD(totalInstallmentRemaining),
            secondaryLabel: "分期方案",
            secondaryValue: `${installmentPlans.length} 筆`,
          };

  return (
    <div className="space-y-5 px-4 pb-28 pt-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">帳戶管理</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeTab === "financial"
              ? `${accounts.length} 個帳戶`
              : activeTab === "credit-card"
                ? `${creditCards.length} 張信用卡`
                : `${installmentPlans.length} 筆分期`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (activeTab === "financial") {
              setEditingAccount(null);
              setShowAccountForm(true);
              return;
            }
            if (activeTab === "credit-card") {
              setShowCreditCardForm(true);
              return;
            }
            setShowInstallmentForm(true);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary shadow-glow"
        >
          <Plus className="h-5 w-5 text-primary-foreground" />
        </button>
      </header>

      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-surface p-1">
        <TabButton
          active={activeTab === "financial"}
          label="金融帳戶"
          onClick={() => setActiveTab("financial")}
        />
        <TabButton
          active={activeTab === "credit-card"}
          label="信用卡帳單"
          onClick={() => setActiveTab("credit-card")}
        />
        <TabButton
          active={activeTab === "installment"}
          label="分期付款"
          onClick={() => setActiveTab("installment")}
        />
      </div>

      <div className="rounded-3xl gradient-hero p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {activeSummary.title}
        </p>
        <p className="mt-1 font-display text-3xl font-bold tabular">{activeSummary.primary}</p>
        <div className="mt-4 rounded-2xl bg-background/40 p-3">
          <p className="text-xs text-muted-foreground">{activeSummary.secondaryLabel}</p>
          <p className="mt-0.5 font-display text-xl font-bold tabular text-primary">
            {activeSummary.secondaryValue}
          </p>
        </div>
      </div>

      {actionError && (
        <div className="rounded-2xl border border-loss/30 bg-loss/10 px-4 py-3 text-xs text-loss">
          {actionError}
        </div>
      )}

      {activeTab === "financial" && (
        <>
          {groupedAccounts.map(({ type, items, total }) => {
            const meta = TYPE_META[type];
            if (!items.length) return null;
            const Icon = meta.icon;

            return (
              <section key={type}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-md ${meta.bg}`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                    </div>
                    <h2 className="text-sm font-semibold">{meta.label}帳戶</h2>
                  </div>
                  <span className="font-mono text-xs tabular text-muted-foreground">
                    {formatTWD(total)}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((account) => (
                    <div key={account.id} className="relative rounded-2xl bg-surface p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold">{account.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {account.institution}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOpenMenu(openMenu === account.id ? null : account.id)}
                          className="text-muted-foreground"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <p className="text-[11px] text-muted-foreground">餘額</p>
                          <p className="font-display text-lg font-bold tabular">
                            {formatTWD(account.balance)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-muted-foreground">可投資</p>
                          <p className="font-mono text-sm font-semibold tabular text-primary">
                            {formatTWD(account.investable)}
                          </p>
                        </div>
                      </div>
                      {openMenu === account.id && (
                        <div className="absolute right-3 top-12 z-10 min-w-[120px] overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-card">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAccount(account);
                              setShowAccountForm(true);
                              setOpenMenu(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted"
                          >
                            <Pencil className="h-3.5 w-3.5" /> 編輯
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(account.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-loss hover:bg-muted"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> 刪除
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}

      {activeTab === "credit-card" && (
        <div className="space-y-4">
          {creditCards.length === 0 ? (
            <EmptyState
              title="尚未新增信用卡"
              description="先建立信用卡，之後就能記錄當期消費與未繳金額。"
            />
          ) : (
            creditCards.map((card) => {
              const cardTransactions = creditCardTransactions.filter((tx) => tx.cardId === card.id);
              const outstanding = cardTransactions
                .filter((tx) => !tx.isPaid)
                .reduce((sum, tx) => sum + tx.amount, 0);

              return (
                <section key={card.id} className="rounded-2xl bg-surface p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CreditCardIcon className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold">{card.name}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {card.issuer} · **** {card.last4}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCardId(card.id);
                        setShowCreditCardTransactionForm(true);
                      }}
                      className="rounded-xl bg-background px-3 py-2 text-xs font-medium"
                    >
                      新增消費
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <MiniStat label="本期未繳" value={formatTWD(outstanding)} />
                    <MiniStat label="結帳日" value={`${card.billingDay} 日`} />
                    <MiniStat label="繳款日" value={`${card.dueDay} 日`} />
                  </div>

                  <div className="mt-4 space-y-2">
                    {cardTransactions.length === 0 ? (
                      <p className="rounded-xl bg-background/60 px-3 py-3 text-xs text-muted-foreground">
                        尚無當期消費紀錄
                      </p>
                    ) : (
                      cardTransactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between rounded-xl bg-background/60 px-3 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium">{transaction.merchantName}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {transaction.transactionDate}
                              {transaction.description ? ` · ${transaction.description}` : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm font-semibold tabular">
                              {formatTWD(transaction.amount)}
                            </p>
                            {transaction.isPaid ? (
                              <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary">
                                <CheckCircle2 className="h-3.5 w-3.5" /> 已繳
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleMarkTransactionPaid(transaction.id)}
                                className="mt-1 rounded-lg bg-primary/10 px-2 py-1 text-[11px] text-primary"
                              >
                                標記已繳
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}

      {activeTab === "installment" && (
        <div className="space-y-4">
          {installmentPlans.length === 0 ? (
            <EmptyState
              title="尚未新增分期項目"
              description="記錄分期方案後，系統會自動計算每期金額與剩餘期數。"
            />
          ) : (
            installmentPlans.map((plan) => {
              const paidCount = plan.payments.filter((payment) => payment.isPaid).length;
              const remainingPayments = plan.payments.filter((payment) => !payment.isPaid);
              const remainingAmount = remainingPayments.reduce(
                (sum, payment) => sum + payment.amount,
                0,
              );

              return (
                <section key={plan.id} className="rounded-2xl bg-surface p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <ReceiptText className="h-4 w-4 text-primary" />
                        <p className="text-sm font-semibold">{plan.itemName}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        開始日期 {plan.startDate} · 年利率 {plan.annualInterestRate.toFixed(2)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">每期應繳</p>
                      <p className="font-mono text-sm font-semibold tabular text-primary">
                        {formatTWD(plan.monthlyPayment)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <MiniStat label="已繳期數" value={`${paidCount} / ${plan.installmentMonths}`} />
                    <MiniStat label="剩餘期數" value={`${remainingPayments.length} 期`} />
                    <MiniStat label="剩餘金額" value={formatTWD(remainingAmount)} />
                  </div>

                  <div className="mt-4 space-y-2">
                    {plan.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between rounded-xl bg-background/60 px-3 py-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium">第 {payment.installmentNumber} 期</p>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            到期 {payment.dueDate} · 本金 {formatTWD(payment.principal)} · 利息{" "}
                            {formatTWD(payment.interest)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm font-semibold tabular">
                            {formatTWD(payment.amount)}
                          </p>
                          {payment.isPaid ? (
                            <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary">
                              <CheckCircle2 className="h-3.5 w-3.5" /> 已繳
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleMarkInstallmentPaid(plan.id, payment.id)}
                              className="mt-1 rounded-lg bg-primary/10 px-2 py-1 text-[11px] text-primary"
                            >
                              標記已繳
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}

      {showAccountForm && (
        <AccountForm
          initial={editingAccount}
          onCancel={() => {
            setShowAccountForm(false);
            setEditingAccount(null);
          }}
          onSave={handleSaveAccount}
        />
      )}

      {showCreditCardForm && (
        <CreditCardForm
          onCancel={() => setShowCreditCardForm(false)}
          onSave={handleSaveCreditCard}
        />
      )}

      {showCreditCardTransactionForm && selectedCardId && (
        <CreditCardTransactionForm
          cardId={selectedCardId}
          card={creditCards.find((card) => card.id === selectedCardId) ?? null}
          onCancel={() => {
            setShowCreditCardTransactionForm(false);
            setSelectedCardId(null);
          }}
          onSave={handleSaveCreditCardTransaction}
        />
      )}

      {showInstallmentForm && (
        <InstallmentPlanForm
          onCancel={() => setShowInstallmentForm(false)}
          onSave={handleSaveInstallmentPlan}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl bg-surface p-5 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background/40 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold tabular">{value}</p>
    </div>
  );
}

function AccountForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: Account | null;
  onCancel: () => void;
  onSave: (account: Account) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<Account>(
    initial ?? {
      id: `a${Date.now()}`,
      name: "",
      institution: "",
      type: "bank",
      balance: 0,
      investable: 0,
    },
  );

  const handleSubmit = () => {
    const name = form.name.trim();
    const institution = form.institution.trim();
    const balance = Number(form.balance);
    const investable = Number(form.investable);

    if (!name) {
      setError("帳戶名稱不可空白。");
      return;
    }

    if (!institution) {
      setError("金融機構不可空白。");
      return;
    }

    if (balance < 0 || investable < 0) {
      setError("金額不可小於 0。");
      return;
    }

    if (!Number.isFinite(balance) || !Number.isFinite(investable)) {
      setError("請輸入有效的金額。");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      onSave({ ...form, name, institution, balance, investable });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      title={initial ? "編輯帳戶" : "新增帳戶"}
      error={error}
      onCancel={onCancel}
      onConfirm={handleSubmit}
      confirmLabel={isSubmitting ? "儲存中" : initial ? "儲存修改" : "新增帳戶"}
      isSubmitting={isSubmitting}
    >
      <Field label="帳戶名稱">
        <input
          value={form.name}
          onChange={(event) => {
            setForm({ ...form, name: event.target.value });
            setError(null);
          }}
          className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          placeholder="例：活存主帳戶"
        />
      </Field>
      <Field label="金融機構">
        <input
          value={form.institution}
          onChange={(event) => {
            setForm({ ...form, institution: event.target.value });
            setError(null);
          }}
          className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          placeholder="例：玉山銀行"
        />
      </Field>
      <Field label="類型">
        <div className="grid grid-cols-3 gap-2">
          {ACCOUNT_TYPES.map((type) => (
            <button
              type="button"
              key={type}
              onClick={() => {
                setForm({ ...form, type });
                setError(null);
              }}
              className={`rounded-xl py-2.5 text-xs font-medium transition-colors ${
                form.type === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground"
              }`}
            >
              {TYPE_META[type].label}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="餘額">
          <input
            type="number"
            value={form.balance || ""}
            min={0}
            onChange={(event) => {
              setForm({ ...form, balance: sanitizeAmount(event.target.value) });
              setError(null);
            }}
            className="w-full rounded-xl bg-background px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
        <Field label="可投資">
          <input
            type="number"
            value={form.investable || ""}
            min={0}
            onChange={(event) => {
              setForm({ ...form, investable: sanitizeAmount(event.target.value) });
              setError(null);
            }}
            className="w-full rounded-xl bg-background px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
      </div>
    </BottomSheet>
  );
}

function CreditCardForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (card: CreditCard) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    issuer: "",
    last4: "",
    billingDay: "1",
    dueDay: "15",
    creditLimit: "",
  });

  const handleSubmit = () => {
    const name = form.name.trim();
    const issuer = form.issuer.trim();
    const last4 = form.last4.trim();
    const billingDay = Number(form.billingDay);
    const dueDay = Number(form.dueDay);
    const creditLimit = Number(form.creditLimit || 0);

    if (!name || !issuer || !last4) {
      setError("卡片名稱、發卡銀行與末四碼不可空白。");
      return;
    }

    if (last4.length !== 4 || !/^\d{4}$/.test(last4)) {
      setError("末四碼必須為 4 位數字。");
      return;
    }

    if (billingDay < 1 || billingDay > 31 || dueDay < 1 || dueDay > 31) {
      setError("結帳日與繳款日必須介於 1 到 31。");
      return;
    }

    if (creditLimit < 0) {
      setError("信用額度不可小於 0。");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      onSave({
        id: `card-${Date.now()}`,
        name,
        issuer,
        last4,
        billingDay,
        dueDay,
        creditLimit,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      title="新增信用卡"
      error={error}
      onCancel={onCancel}
      onConfirm={handleSubmit}
      confirmLabel={isSubmitting ? "儲存中" : "新增信用卡"}
      isSubmitting={isSubmitting}
    >
      <Field label="卡片名稱">
        <input
          value={form.name}
          onChange={(event) => {
            setForm({ ...form, name: event.target.value });
            setError(null);
          }}
          className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          placeholder="例：Cube 卡"
        />
      </Field>
      <Field label="發卡銀行">
        <input
          value={form.issuer}
          onChange={(event) => {
            setForm({ ...form, issuer: event.target.value });
            setError(null);
          }}
          className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          placeholder="例：國泰世華"
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="末四碼">
          <input
            value={form.last4}
            onChange={(event) => {
              setForm({ ...form, last4: event.target.value.replace(/\D/g, "").slice(0, 4) });
              setError(null);
            }}
            className="w-full rounded-xl bg-background px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="1234"
          />
        </Field>
        <Field label="結帳日">
          <input
            type="number"
            min={1}
            max={31}
            value={form.billingDay}
            onChange={(event) => {
              setForm({ ...form, billingDay: event.target.value });
              setError(null);
            }}
            className="w-full rounded-xl bg-background px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
        <Field label="繳款日">
          <input
            type="number"
            min={1}
            max={31}
            value={form.dueDay}
            onChange={(event) => {
              setForm({ ...form, dueDay: event.target.value });
              setError(null);
            }}
            className="w-full rounded-xl bg-background px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
      </div>
      <Field label="信用額度">
        <input
          type="number"
          min={0}
          value={form.creditLimit}
          onChange={(event) => {
            setForm({ ...form, creditLimit: event.target.value });
            setError(null);
          }}
          className="w-full rounded-xl bg-background px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
          placeholder="例：200000"
        />
      </Field>
    </BottomSheet>
  );
}

function CreditCardTransactionForm({
  cardId,
  card,
  onCancel,
  onSave,
}: {
  cardId: string;
  card: CreditCard | null;
  onCancel: () => void;
  onSave: (transaction: CreditCardTransaction) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    merchantName: "",
    amount: "",
    transactionDate: new Date().toISOString().slice(0, 10),
    description: "",
  });

  const handleSubmit = () => {
    const merchantName = form.merchantName.trim();
    const amount = Number(form.amount);

    if (!merchantName) {
      setError("消費項目不可空白。");
      return;
    }

    if (!form.transactionDate) {
      setError("消費日期不可空白。");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("消費金額必須大於 0。");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      onSave({
        id: `cc-tx-${Date.now()}`,
        cardId,
        merchantName,
        amount,
        transactionDate: form.transactionDate,
        description: form.description.trim() || undefined,
        isPaid: false,
        paidAt: null,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      title={`新增當期消費${card ? ` · ${card.name}` : ""}`}
      error={error}
      onCancel={onCancel}
      onConfirm={handleSubmit}
      confirmLabel={isSubmitting ? "儲存中" : "新增消費"}
      isSubmitting={isSubmitting}
    >
      <Field label="消費項目">
        <input
          value={form.merchantName}
          onChange={(event) => {
            setForm({ ...form, merchantName: event.target.value });
            setError(null);
          }}
          className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          placeholder="例：Apple Store"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="消費金額">
          <input
            type="number"
            min={0}
            value={form.amount}
            onChange={(event) => {
              setForm({ ...form, amount: event.target.value });
              setError(null);
            }}
            className="w-full rounded-xl bg-background px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
        <Field label="消費日期">
          <input
            type="date"
            value={form.transactionDate}
            onChange={(event) => {
              setForm({ ...form, transactionDate: event.target.value });
              setError(null);
            }}
            className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
      </div>
      <Field label="備註">
        <input
          value={form.description}
          onChange={(event) => {
            setForm({ ...form, description: event.target.value });
            setError(null);
          }}
          className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          placeholder="可填活動、品項或說明"
        />
      </Field>
    </BottomSheet>
  );
}

function InstallmentPlanForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (plan: InstallmentPlan) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    itemName: "",
    startDate: new Date().toISOString().slice(0, 10),
    totalAmount: "",
    installmentMonths: "12",
    annualInterestRate: "0",
  });

  const totalAmount = Number(form.totalAmount || 0);
  const installmentMonths = Number(form.installmentMonths || 0);
  const annualInterestRate = Number(form.annualInterestRate || 0);
  const preview = calculateInstallmentPreview(
    totalAmount,
    installmentMonths,
    annualInterestRate,
    form.startDate,
  );

  const handleSubmit = () => {
    const itemName = form.itemName.trim();

    if (!itemName) {
      setError("項目名稱不可空白。");
      return;
    }

    if (!form.startDate) {
      setError("開始日期不可空白。");
      return;
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      setError("總金額必須大於 0。");
      return;
    }

    if (!Number.isInteger(installmentMonths) || installmentMonths <= 0) {
      setError("分期期數必須為正整數。");
      return;
    }

    if (!Number.isFinite(annualInterestRate) || annualInterestRate < 0) {
      setError("年利率不可小於 0。");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      onSave({
        id: `plan-${Date.now()}`,
        itemName,
        startDate: form.startDate,
        totalAmount,
        installmentMonths,
        annualInterestRate,
        monthlyPayment: preview.monthlyPayment,
        payments: preview.payments,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      title="新增分期項目"
      error={error}
      onCancel={onCancel}
      onConfirm={handleSubmit}
      confirmLabel={isSubmitting ? "儲存中" : "新增分期"}
      isSubmitting={isSubmitting}
    >
      <Field label="項目名稱">
        <input
          value={form.itemName}
          onChange={(event) => {
            setForm({ ...form, itemName: event.target.value });
            setError(null);
          }}
          className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          placeholder="例：MacBook Pro"
        />
      </Field>
      <Field label="開始日期">
        <input
          type="date"
          value={form.startDate}
          onChange={(event) => {
            setForm({ ...form, startDate: event.target.value });
            setError(null);
          }}
          className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="總金額">
          <input
            type="number"
            min={0}
            value={form.totalAmount}
            onChange={(event) => {
              setForm({ ...form, totalAmount: event.target.value });
              setError(null);
            }}
            className="w-full rounded-xl bg-background px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
        <Field label="分期期數">
          <input
            type="number"
            min={1}
            value={form.installmentMonths}
            onChange={(event) => {
              setForm({ ...form, installmentMonths: event.target.value });
              setError(null);
            }}
            className="w-full rounded-xl bg-background px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
      </div>
      <Field label="年利率 (%)">
        <input
          type="number"
          min={0}
          step="0.01"
          value={form.annualInterestRate}
          onChange={(event) => {
            setForm({ ...form, annualInterestRate: event.target.value });
            setError(null);
          }}
          className="w-full rounded-xl bg-background px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
        />
      </Field>
      <div className="grid grid-cols-3 gap-3 rounded-2xl bg-background/60 p-3 text-xs">
        <MiniStat label="每期應繳" value={formatTWD(preview.monthlyPayment)} />
        <MiniStat label="總利息" value={formatTWD(preview.totalInterest)} />
        <MiniStat label="總期數" value={`${installmentMonths || 0} 期`} />
      </div>
    </BottomSheet>
  );
}

function BottomSheet({
  title,
  error,
  children,
  onCancel,
  onConfirm,
  confirmLabel,
  isSubmitting,
}: {
  title: string;
  error: string | null;
  children: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  isSubmitting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-auto flex max-h-[calc(100vh-0.75rem)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-surface-elevated shadow-card">
        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-5">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-muted" />
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <div className="mt-4 space-y-3 pb-6">
            {error && (
              <div className="rounded-xl border border-loss/30 bg-loss/10 px-3 py-2 text-xs text-loss">
                {error}
              </div>
            )}
            {children}
          </div>
        </div>
        <div className="border-t border-border bg-surface-elevated px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-xl bg-background py-3 text-sm font-medium disabled:opacity-60"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="rounded-xl gradient-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function calculateInstallmentPreview(
  totalAmount: number,
  installmentMonths: number,
  annualInterestRate: number,
  startDate: string,
) {
  const monthlyRate = annualInterestRate / 100 / 12;
  const principal = totalAmount > 0 ? totalAmount : 0;
  const months = installmentMonths > 0 ? installmentMonths : 1;
  const monthlyPayment =
    monthlyRate === 0
      ? principal / months
      : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));

  let remainingPrincipal = principal;

  const payments: InstallmentPayment[] = Array.from({ length: months }, (_, index) => {
    const interest = monthlyRate === 0 ? 0 : remainingPrincipal * monthlyRate;
    const principalPayment = Math.min(remainingPrincipal, monthlyPayment - interest);
    const amount =
      index === months - 1 ? remainingPrincipal + interest : principalPayment + interest;
    remainingPrincipal = Math.max(0, remainingPrincipal - principalPayment);

    return {
      id: `payment-${Date.now()}-${index + 1}`,
      installmentNumber: index + 1,
      dueDate: addMonths(startDate, index),
      amount: roundCurrency(amount),
      principal: roundCurrency(index === months - 1 ? amount - interest : principalPayment),
      interest: roundCurrency(interest),
      isPaid: false,
      paidAt: null,
    };
  });

  return {
    monthlyPayment: roundCurrency(monthlyPayment),
    totalInterest: roundCurrency(payments.reduce((sum, payment) => sum + payment.interest, 0)),
    payments,
  };
}

function addMonths(dateString: string, monthsToAdd: number) {
  const date = new Date(dateString);
  date.setMonth(date.getMonth() + monthsToAdd);
  return date.toISOString().slice(0, 10);
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
