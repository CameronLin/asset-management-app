import { createFileRoute } from "@tanstack/react-router";
import { Flame, Landmark, Cpu, Newspaper, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { mockNews } from "@/lib/mockNews";
import type { NewsCategory, NewsItem } from "@/lib/newsTypes";
import { getHoldings } from "@/lib/storage";
import type { Holding } from "@/lib/types";

export const Route = createFileRoute("/_app/strategy")({
  head: () => ({ meta: [{ title: "股市新聞" }] }),
  component: NewsPage,
});

const TABS: NewsCategory[] = ["熱門", "台股", "美股", "半導體", "金融", "我的持股"];

function NewsPage() {
  const [activeTab, setActiveTab] = useState<NewsCategory>("熱門");
  const [holdings, setHoldings] = useState<Holding[]>([]);

  useEffect(() => {
    setHoldings(getHoldings());
  }, []);

  const holdingSymbols = useMemo(
    () => new Set(holdings.map((holding) => holding.symbol)),
    [holdings],
  );

  const filteredNews = useMemo(() => {
    if (activeTab === "我的持股") {
      return mockNews.filter((item) =>
        item.relatedSymbols.some((symbol) => holdingSymbols.has(symbol)),
      );
    }

    if (activeTab === "熱門") {
      return mockNews.filter((item) => item.tags.includes("熱門"));
    }

    return mockNews.filter((item) => item.category === activeTab || item.tags.includes(activeTab));
  }, [activeTab, holdingSymbols]);

  const holdingRelatedNews = useMemo(
    () =>
      mockNews.filter((item) => item.relatedSymbols.some((symbol) => holdingSymbols.has(symbol))),
    [holdingSymbols],
  );

  const openNews = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-5 px-4 pb-28 pt-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">股市新聞</h1>
        <p className="mt-1 text-xs text-muted-foreground">掌握熱門財經與持股相關消息</p>
      </header>

      <div className="rounded-3xl gradient-hero p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">新聞狀態</p>
        <p className="mt-1 font-display text-3xl font-bold tabular">{filteredNews.length} 則</p>
        <div className="mt-4 rounded-2xl bg-background/40 p-3">
          <p className="text-xs text-muted-foreground">資料來源</p>
          <p className="mt-0.5 font-display text-xl font-bold text-primary">示範資料</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            尚未串接新聞 API，以下內容僅供版面與互動展示。
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "bg-surface text-muted-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "我的持股" && (
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">我的持股相關新聞</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">目前依你的持股清單比對示範新聞資料。</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {holdingRelatedNews.length > 0
              ? `符合 ${holdingRelatedNews.length} 則`
              : "目前沒有與持股相關的示範新聞"}
          </p>
        </section>
      )}

      {filteredNews.length === 0 ? (
        <div className="rounded-2xl bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
          目前沒有相關新聞
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNews.map((item) => (
            <NewsCard key={item.id} item={item} onOpen={openNews} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewsCard({ item, onOpen }: { item: NewsItem; onOpen: (url: string) => void }) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item.url)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(item.url);
        }
      }}
      className="rounded-2xl bg-surface p-4 transition-transform active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
          <h2 className="text-base font-semibold leading-snug">{item.title}</h2>
        </div>
        <Newspaper className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MetaRow label="來源" value={item.source} icon={Landmark} />
        <MetaRow label="發布時間" value={item.publishedAt} icon={Flame} />
      </div>

      <div className="mt-4 rounded-2xl bg-background/40 p-3">
        <p className="text-[11px] text-muted-foreground">相關股票</p>
        <p className="mt-1 font-mono text-xs text-foreground">
          {item.relatedSymbols.length > 0 ? item.relatedSymbols.join("、") : "無"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {item.relatedStockNames.length > 0 ? item.relatedStockNames.join("、") : "無"}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Cpu className="h-3.5 w-3.5" />
          <span>{item.category}</span>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(item.url);
          }}
          className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-2 text-xs font-medium text-primary"
        >
          閱讀全文
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-background/30 px-3 py-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate text-xs font-medium">{value}</p>
      </div>
    </div>
  );
}
