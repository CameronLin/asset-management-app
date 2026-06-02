import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Pencil,
  Trash2,
  TrendingDown,
  TrendingUp,
  HandCoins,
  Wallet,
  ReceiptText,
  CreditCard,
  Layers3,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatTWD } from "@/lib/mock-data";
import { normalizeTaiwanStockSymbol } from "@/lib/marketData";
import {
  addFinanceRecord,
  deleteFinanceRecord,
  getFinanceRecords,
  updateFinanceRecord,
} from "@/lib/recordStorage";
import type { FinanceRecord, RecordType } from "@/lib/recordTypes";

export const Route = createFileRoute("/_app/strategy")({
  head: () => ({ meta: [{ title: "交易紀錄" }] }),
  component: RecordsPage,
});

const TABS = [
  { key: "all", label: "全部" },
  { key: "buy", label: "買進" },
  { key: "sell", label: "賣出" },
  { key: "dividend", label: "股利" },
  { key: "income", label: "收入" },
  { key: "expense", label: "支出" },
  { key: "credit_card_payment", label: "信用卡" },
  { key: "installment_payment", label: "分期" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TYPE_META: Record<
  RecordType,
  {
    label: string;
    icon: React.ElementType;
    badgeClass: string;
    amountClass: string;
  }
> = {
  buy: {
    label: "買進",
    icon: TrendingDown,
    badgeClass: "bg-primary/10 text-primary",
    amountClass: "text-warning",
  },
  sell: {
    label: "賣出",
    icon: TrendingUp,
    badgeClass: "bg-warning/15 text-warning",
    amountClass: "text-primary",
  },
  dividend: {
    label: "股利",
    icon: HandCoins,
    badgeClass: "bg-primary/10 text-primary",
    amountClass: "text-primary",
  },
  income: {
    label: "收入",
    icon: Wallet,
    badgeClass: "bg-primary/10 text-primary",
    amountClass: "text-primary",
  },
  expense: {
    label: "支出",
    icon: ReceiptText,
    badgeClass: "bg-warning/15 text-warning",
    amountClass: "text-warning",
  },
  credit_card_payment: {
    label: "信用卡",
    icon: CreditCard,
    badgeClass: "bg-muted text-muted-foreground",
    amountClass: "text-warning",
  },
  installment_payment: {
    label: "分期",
    icon: Layers3,
    badgeClass: "bg-muted text-muted-foreground",
    amountClass: "text-warning",
  },
};

type RecordFormState = {
  type: RecordType;
  date: string;
  title: string;
  amount: string;
  category: string;
  note: string;
  stockSymbol: string;
  stockName: string;
  shares: string;
  price: string;
  fee: string;
  tax: string;
  accountId: string;
  creditCardId: string;
  installmentPlanId: string;
};

const defaultFormState = (): RecordFormState => ({
  type: "expense",
  date: new Date().toISOString().slice(0, 10),
  title: "",
  amount: "",
  category: "",
  note: "",
  stockSymbol: "",
  stockName: "",
  shares: "",
  price: "",
  fee: "",
  tax: "",
  accountId: "",
  creditCardId: "",
  installmentPlanId: "",
});

const sanitizeNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const isTradeType = (type: RecordType) => type === "buy" || type === "sell";
const isDividendType = (type: RecordType) => type === "dividend";

function RecordsPage() {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinanceRecord | null>(null);
  const [form, setForm] = useState<RecordFormState>(defaultFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setRecords(getFinanceRecords());
    } catch {
      setPageError("紀錄讀取失敗，請重新整理頁面。");
    }
  }, []);

  const filteredRecords = useMemo(() => {
    const base =
      activeTab === "all" ? records : records.filter((record) => record.type === activeTab);
    return [...base].sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [activeTab, records]);

  const monthSummary = useMemo(() => {
    const now = new Date();
    const monthRecords = records.filter((record) => {
      const recordDate = new Date(record.date);
      return (
        recordDate.getFullYear() === now.getFullYear() && recordDate.getMonth() === now.getMonth()
      );
    });

    const income = monthRecords
      .filter((record) => record.type === "income")
      .reduce((sum, record) => sum + record.amount, 0);
    const expense = monthRecords
      .filter((record) =>
        ["expense", "credit_card_payment", "installment_payment"].includes(record.type),
      )
      .reduce((sum, record) => sum + record.amount, 0);
    const buy = monthRecords
      .filter((record) => record.type === "buy")
      .reduce((sum, record) => sum + record.amount, 0);
    const dividend = monthRecords
      .filter((record) => record.type === "dividend")
      .reduce((sum, record) => sum + record.amount, 0);

    return {
      income,
      expense,
      buy,
      dividend,
      net: income - expense - buy + dividend,
    };
  }, [records]);

  const openCreateForm = () => {
    setEditingRecord(null);
    setForm(defaultFormState());
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (record: FinanceRecord) => {
    setEditingRecord(record);
    setForm({
      type: record.type,
      date: record.date,
      title: record.title,
      amount: String(record.amount),
      category: record.category ?? "",
      note: record.note ?? "",
      stockSymbol: record.stockSymbol ?? "",
      stockName: record.stockName ?? "",
      shares: record.shares != null ? String(record.shares) : "",
      price: record.price != null ? String(record.price) : "",
      fee: record.fee != null ? String(record.fee) : "",
      tax: record.tax != null ? String(record.tax) : "",
      accountId: record.accountId ?? "",
      creditCardId: record.creditCardId ?? "",
      installmentPlanId: record.installmentPlanId ?? "",
    });
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRecord(null);
    setForm(defaultFormState());
    setFormError(null);
  };

  const handleDelete = (id: string) => {
    try {
      const next = deleteFinanceRecord(id);
      setRecords(next);
      setPageError(null);
      toast.success("紀錄已刪除");
    } catch {
      setPageError("刪除紀錄失敗，請稍後再試。");
    }
  };

  const handleSubmit = () => {
    const title = form.title.trim();
    if (!title) {
      setFormError("請輸入標題。");
      return;
    }

    if (!form.date) {
      setFormError("請選擇日期。");
      return;
    }

    const amount = sanitizeNumber(form.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      setFormError("請輸入有效的金額。");
      return;
    }

    const nextType = form.type;
    const normalizedSymbol = form.stockSymbol.trim()
      ? normalizeTaiwanStockSymbol(form.stockSymbol) || form.stockSymbol.trim().toUpperCase()
      : undefined;
    const normalizedStockName = form.stockName.trim() || undefined;

    let shares: number | undefined;
    let price: number | undefined;
    let fee: number | undefined;
    let tax: number | undefined;

    if (isTradeType(nextType)) {
      if (!normalizedSymbol || !normalizedStockName) {
        setFormError("買進 / 賣出紀錄需要股票代號與股票名稱。");
        return;
      }

      shares = sanitizeNumber(form.shares);
      price = sanitizeNumber(form.price);
      fee = form.fee ? sanitizeNumber(form.fee) : 0;
      tax = form.tax ? sanitizeNumber(form.tax) : 0;

      if (!Number.isFinite(shares) || shares <= 0) {
        setFormError("請輸入有效的股數。");
        return;
      }

      if (!Number.isFinite(price) || price <= 0) {
        setFormError("請輸入有效的成交價格。");
        return;
      }

      if (!Number.isFinite(fee!) || fee! < 0 || !Number.isFinite(tax!) || tax! < 0) {
        setFormError("手續費與稅不可小於 0。");
        return;
      }
    }

    if (isDividendType(nextType)) {
      if (!normalizedSymbol || !normalizedStockName) {
        setFormError("股利紀錄需要股票代號與股票名稱。");
        return;
      }

      shares = sanitizeNumber(form.shares);
      price = sanitizeNumber(form.price);

      if (!Number.isFinite(shares) || shares <= 0) {
        setFormError("請輸入有效的持有股數。");
        return;
      }

      if (!Number.isFinite(price) || price < 0) {
        setFormError("請輸入有效的每股股利。");
        return;
      }
    }

    const now = new Date().toISOString();
    const record: FinanceRecord = {
      id: editingRecord?.id ?? crypto.randomUUID(),
      type: nextType,
      date: form.date,
      title,
      amount,
      category: form.category.trim() || undefined,
      note: form.note.trim() || undefined,
      stockSymbol: normalizedSymbol,
      stockName: normalizedStockName,
      shares,
      price,
      fee,
      tax,
      accountId: form.accountId.trim() || undefined,
      creditCardId: form.creditCardId.trim() || undefined,
      installmentPlanId: form.installmentPlanId.trim() || undefined,
      createdAt: editingRecord?.createdAt ?? now,
      updatedAt: now,
    };

    try {
      // TODO: Derive holdings from buy/sell records instead of mutating holdings manually.
      const next = editingRecord ? updateFinanceRecord(record) : addFinanceRecord(record);
      setRecords(next);
      setPageError(null);
      closeForm();
      toast.success(editingRecord ? "紀錄已更新" : "新增紀錄成功");
    } catch {
      setFormError("紀錄儲存失敗，請稍後再試。");
    }
  };

  return (
    <div className="space-y-5 px-4 pb-28 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">交易紀錄</h1>
          <p className="mt-1 text-xs text-muted-foreground">管理投資交易、股利與日常現金流</p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-95"
          aria-label="新增紀錄"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <SummaryCard label="本月收入" value={monthSummary.income} icon={Wallet} tone="positive" />
        <SummaryCard
          label="本月支出"
          value={monthSummary.expense}
          icon={ReceiptText}
          tone="negative"
        />
        <SummaryCard
          label="本月投資買入金額"
          value={monthSummary.buy}
          icon={TrendingDown}
          tone="negative"
        />
        <SummaryCard
          label="本月股利收入"
          value={monthSummary.dividend}
          icon={HandCoins}
          tone="positive"
        />
        <SummaryCard
          label="本月淨現金流"
          value={monthSummary.net}
          icon={monthSummary.net >= 0 ? TrendingUp : TrendingDown}
          tone={monthSummary.net >= 0 ? "positive" : "negative"}
          className="col-span-2"
        />
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-surface text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {pageError ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          {pageError}
        </div>
      ) : null}

      {filteredRecords.length === 0 ? (
        <div className="rounded-2xl bg-surface px-4 py-8 text-center text-sm text-muted-foreground">
          尚未新增任何紀錄
        </div>
      ) : (
        <div className="space-y-3 pb-4">
          {filteredRecords.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onEdit={() => openEditForm(record)}
              onDelete={() => handleDelete(record.id)}
            />
          ))}
        </div>
      )}

      {showForm ? (
        <RecordFormSheet
          editingRecord={editingRecord}
          form={form}
          formError={formError}
          onChange={setForm}
          onClose={closeForm}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
  className = "",
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: "positive" | "negative";
  className?: string;
}) {
  const accentClass = tone === "positive" ? "text-primary" : "text-warning";
  const bgClass = tone === "positive" ? "bg-primary/10" : "bg-warning/15";

  return (
    <div className={`rounded-2xl bg-surface p-4 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className={`mt-2 font-display text-lg font-bold tabular ${accentClass}`}>
            {formatTWD(value)}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${bgClass}`}>
          <Icon className={`h-4.5 w-4.5 ${accentClass}`} />
        </div>
      </div>
    </div>
  );
}

function RecordCard({
  record,
  onEdit,
  onDelete,
}: {
  record: FinanceRecord;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = TYPE_META[record.type];
  const Icon = meta.icon;
  const descriptor = record.stockSymbol
    ? `${record.stockSymbol}${record.stockName ? ` · ${record.stockName}` : ""}`
    : (record.category ?? "未分類");

  return (
    <article className="rounded-2xl bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.badgeClass}`}>
              {meta.label}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">{record.date}</span>
          </div>
          <h2 className="mt-2 truncate text-base font-semibold">{record.title}</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-background/60">
            <Icon className={`h-4 w-4 ${meta.amountClass}`} />
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-background/60 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="編輯紀錄"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-background/60 text-muted-foreground transition-colors hover:text-warning"
            aria-label="刪除紀錄"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-3 rounded-2xl bg-background/40 p-3">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">股票代號 / 分類</p>
          <p className="mt-1 truncate text-sm font-medium">{descriptor}</p>
          {record.note ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {record.note}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">尚未填寫備註</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">金額</p>
          <p className={`mt-1 font-mono text-base font-bold tabular ${meta.amountClass}`}>
            {formatTWD(record.amount)}
          </p>
        </div>
      </div>
    </article>
  );
}

function RecordFormSheet({
  editingRecord,
  form,
  formError,
  onChange,
  onClose,
  onSubmit,
}: {
  editingRecord: FinanceRecord | null;
  form: RecordFormState;
  formError: string | null;
  onChange: React.Dispatch<React.SetStateAction<RecordFormState>>;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const dividendPreview =
    isDividendType(form.type) &&
    Number.isFinite(sanitizeNumber(form.price)) &&
    Number.isFinite(sanitizeNumber(form.shares))
      ? sanitizeNumber(form.price) * sanitizeNumber(form.shares)
      : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/60 backdrop-blur-sm">
      <div className="mx-auto flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <div>
            <p className="text-sm font-semibold">{editingRecord ? "編輯紀錄" : "新增紀錄"}</p>
            <p className="mt-1 text-xs text-muted-foreground">記錄投資交易、股利與日常現金流</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-surface text-muted-foreground"
            aria-label="關閉表單"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-16 pt-4 [-webkit-overflow-scrolling:touch]">
          <div className="space-y-4 pb-10">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="類型">
                <select
                  value={form.type}
                  onChange={(event) =>
                    onChange((prev) => ({ ...prev, type: event.target.value as RecordType }))
                  }
                  className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm outline-none transition focus:border-primary"
                >
                  {Object.entries(TYPE_META).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="日期">
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => onChange((prev) => ({ ...prev, date: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm outline-none transition focus:border-primary"
                />
              </Field>
            </div>

            <Field label="標題">
              <input
                type="text"
                value={form.title}
                onChange={(event) => onChange((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="例如：買進台積電、六月薪資、餐飲支出"
                className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm outline-none transition focus:border-primary"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={isDividendType(form.type) ? "總股利金額" : "金額"}>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={form.amount}
                  onChange={(event) =>
                    onChange((prev) => ({ ...prev, amount: event.target.value }))
                  }
                  placeholder="0"
                  className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm outline-none transition focus:border-primary"
                />
              </Field>

              <Field label="分類">
                <input
                  type="text"
                  value={form.category}
                  onChange={(event) =>
                    onChange((prev) => ({ ...prev, category: event.target.value }))
                  }
                  placeholder="例如：投資、生活、薪資"
                  className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm outline-none transition focus:border-primary"
                />
              </Field>
            </div>

            {(isTradeType(form.type) || isDividendType(form.type)) && (
              <div className="space-y-4 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                <p className="text-sm font-semibold">股票資訊</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="股票代號">
                    <input
                      type="text"
                      value={form.stockSymbol}
                      onChange={(event) =>
                        onChange((prev) => ({ ...prev, stockSymbol: event.target.value }))
                      }
                      placeholder="例如：2330"
                      className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm outline-none transition focus:border-primary"
                    />
                  </Field>

                  <Field label="股票名稱">
                    <input
                      type="text"
                      value={form.stockName}
                      onChange={(event) =>
                        onChange((prev) => ({ ...prev, stockName: event.target.value }))
                      }
                      placeholder="例如：台積電"
                      className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm outline-none transition focus:border-primary"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={isDividendType(form.type) ? "持有股數" : "股數"}>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={form.shares}
                      onChange={(event) =>
                        onChange((prev) => ({ ...prev, shares: event.target.value }))
                      }
                      placeholder="0"
                      className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm outline-none transition focus:border-primary"
                    />
                  </Field>

                  <Field label={isDividendType(form.type) ? "每股股利" : "成交價格"}>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={form.price}
                      onChange={(event) =>
                        onChange((prev) => ({ ...prev, price: event.target.value }))
                      }
                      placeholder="0"
                      className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm outline-none transition focus:border-primary"
                    />
                  </Field>
                </div>

                {isTradeType(form.type) ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="手續費">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={form.fee}
                        onChange={(event) =>
                          onChange((prev) => ({ ...prev, fee: event.target.value }))
                        }
                        placeholder="0"
                        className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm outline-none transition focus:border-primary"
                      />
                    </Field>

                    <Field label="稅">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={form.tax}
                        onChange={(event) =>
                          onChange((prev) => ({ ...prev, tax: event.target.value }))
                        }
                        placeholder="0"
                        className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm outline-none transition focus:border-primary"
                      />
                    </Field>
                  </div>
                ) : null}

                {isDividendType(form.type) && dividendPreview != null ? (
                  <div className="rounded-2xl bg-background/50 px-4 py-3">
                    <p className="text-[11px] text-muted-foreground">依每股股利與持有股數試算</p>
                    <p className="mt-1 font-mono text-sm font-semibold tabular text-primary">
                      {formatTWD(dividendPreview)}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            <Field label="備註">
              <textarea
                value={form.note}
                onChange={(event) => onChange((prev) => ({ ...prev, note: event.target.value }))}
                rows={4}
                placeholder="補充交易背景、用途或備註"
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary"
              />
            </Field>

            {formError ? (
              <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                {formError}
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-border bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 backdrop-blur">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl bg-surface px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.99]"
            >
              {editingRecord ? "儲存紀錄" : "新增紀錄"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
