import { createFileRoute } from "@tanstack/react-router";
import { Plus, Landmark, Wallet, Coins, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { accounts as initial, formatTWD } from "@/lib/mock-data";
import { getAccounts, saveAccounts } from "@/lib/storage";
import type { Account, AccountType } from "@/lib/types";

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

const sanitizeAmount = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

function AccountsPage() {
  const [list, setList] = useState<Account[]>(initial);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const total = list.reduce((s, a) => s + a.balance, 0);
  const investable = list.reduce((s, a) => s + a.investable, 0);

  const grouped = ACCOUNT_TYPES.map((t) => ({
    type: t,
    items: list.filter((a) => a.type === t),
    total: list.filter((a) => a.type === t).reduce((s, a) => s + a.balance, 0),
  }));

  useEffect(() => {
    try {
      setList(getAccounts());
    } catch {
      setActionError("帳戶資料讀取失敗，請重新整理頁面。");
    }
  }, []);

  const handleSave = (a: Account) => {
    try {
      const isEditing = list.some((item) => item.id === a.id);
      setList((prev) => {
        const exists = prev.find((p) => p.id === a.id);
        const next = exists ? prev.map((p) => (p.id === a.id ? a : p)) : [...prev, a];
        saveAccounts(next);
        return next;
      });
      setActionError(null);
      toast.success(isEditing ? "帳戶已更新" : "新增帳戶成功");
      setShowForm(false);
      setEditing(null);
    } catch {
      setActionError("帳戶儲存失敗，請稍後再試。");
    }
  };

  const handleDelete = (id: string) => {
    try {
      setList((prev) => {
        const next = prev.filter((p) => p.id !== id);
        saveAccounts(next);
        return next;
      });
      setActionError(null);
      setOpenMenu(null);
    } catch {
      setActionError("帳戶刪除失敗，請稍後再試。");
    }
  };

  return (
    <div className="space-y-5 px-4 pt-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">帳戶管理</h1>
          <p className="mt-1 text-xs text-muted-foreground">{list.length} 個帳戶</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary shadow-glow"
        >
          <Plus className="h-5 w-5 text-primary-foreground" />
        </button>
      </header>

      <div className="rounded-3xl gradient-hero p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">資金總額</p>
        <p className="mt-1 font-display text-3xl font-bold tabular">{formatTWD(total)}</p>
        <div className="mt-4 rounded-2xl bg-background/40 p-3">
          <p className="text-xs text-muted-foreground">可投資金額</p>
          <p className="mt-0.5 font-display text-xl font-bold tabular text-primary">
            {formatTWD(investable)}
          </p>
        </div>
      </div>

      {actionError && (
        <div className="rounded-2xl border border-loss/30 bg-loss/10 px-4 py-3 text-xs text-loss">
          {actionError}
        </div>
      )}

      {grouped.map(({ type, items, total: gTotal }) => {
        const meta = TYPE_META[type];
        if (!items.length) return null;
        const Icon = meta.icon;
        return (
          <section key={type}>
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-md ${meta.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                </div>
                <h2 className="text-sm font-semibold">{meta.label}帳戶</h2>
              </div>
              <span className="font-mono text-xs tabular text-muted-foreground">
                {formatTWD(gTotal)}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((a) => (
                <div key={a.id} className="relative rounded-2xl bg-surface p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{a.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{a.institution}</p>
                    </div>
                    <button
                      onClick={() => setOpenMenu(openMenu === a.id ? null : a.id)}
                      className="text-muted-foreground"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-[11px] text-muted-foreground">餘額</p>
                      <p className="font-display text-lg font-bold tabular">
                        {formatTWD(a.balance)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">可投資</p>
                      <p className="font-mono text-sm font-semibold tabular text-primary">
                        {formatTWD(a.investable)}
                      </p>
                    </div>
                  </div>
                  {openMenu === a.id && (
                    <div className="absolute right-3 top-12 z-10 min-w-[120px] overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-card">
                      <button
                        onClick={() => {
                          setEditing(a);
                          setShowForm(true);
                          setOpenMenu(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted"
                      >
                        <Pencil className="h-3.5 w-3.5" /> 編輯
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
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

      {showForm && (
        <AccountForm
          initial={editing}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
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
  onSave: (a: Account) => void;
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
      onSave({
        ...form,
        name,
        institution,
        balance,
        investable,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-auto flex max-h-[calc(100vh-0.75rem)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-surface-elevated shadow-card">
        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-5">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-muted" />
          <h3 className="font-display text-lg font-semibold">
            {initial ? "編輯帳戶" : "新增帳戶"}
          </h3>
          <div className="mt-4 space-y-3 pb-6">
            {error && (
              <div className="rounded-xl border border-loss/30 bg-loss/10 px-3 py-2 text-xs text-loss">
                {error}
              </div>
            )}
            <Field label="帳戶名稱">
              <input
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setError(null);
                }}
                className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                placeholder="例：活存主帳戶"
              />
            </Field>
            <Field label="金融機構">
              <input
                value={form.institution}
                onChange={(e) => {
                  setForm({ ...form, institution: e.target.value });
                  setError(null);
                }}
                className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                placeholder="例：玉山銀行"
              />
            </Field>
            <Field label="類型">
              <div className="grid grid-cols-3 gap-2">
                {ACCOUNT_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => {
                      setForm({ ...form, type: t });
                      setError(null);
                    }}
                    className={`rounded-xl py-2.5 text-xs font-medium transition-colors ${
                      form.type === t
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground"
                    }`}
                  >
                    {TYPE_META[t].label}
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
                  onChange={(e) => {
                    setForm({ ...form, balance: sanitizeAmount(e.target.value) });
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
                  onChange={(e) => {
                    setForm({ ...form, investable: sanitizeAmount(e.target.value) });
                    setError(null);
                  }}
                  className="w-full rounded-xl bg-background px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </Field>
            </div>
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
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-xl gradient-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {isSubmitting ? "儲存中" : initial ? "儲存修改" : "新增帳戶"}
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
