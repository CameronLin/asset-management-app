export type NewsCategory = "熱門" | "台股" | "美股" | "半導體" | "金融" | "我的持股";

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  category: Exclude<NewsCategory, "我的持股">;
  relatedSymbols: string[];
  relatedStockNames: string[];
  tags: string[];
};
