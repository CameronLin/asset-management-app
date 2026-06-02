import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Briefcase, Wallet, Newspaper, LineChart } from "lucide-react";

const items = [
  { to: "/", label: "總覽", icon: Home },
  { to: "/holdings", label: "持股", icon: Briefcase },
  { to: "/accounts", label: "帳戶", icon: Wallet },
  { to: "/strategy", label: "新聞", icon: Newspaper },
  { to: "/market", label: "行情", icon: LineChart },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-border bg-surface/95 backdrop-blur-xl">
      <ul className="grid grid-cols-5 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to}>
              <Link
                to={to}
                className="group flex flex-col items-center gap-1 rounded-xl py-2 transition-colors"
              >
                <div
                  className={`flex h-9 w-12 items-center justify-center rounded-xl transition-all ${
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                </div>
                <span
                  className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
