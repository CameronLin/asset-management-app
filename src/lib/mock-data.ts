import { calculatePortfolioSummary } from "./calculations";
import type { Account, Holding, Strategy } from "./types";

export const holdings: Holding[] = [
  {
    symbol: "2330",
    name: "台積電",
    shares: 200,
    avgCost: 580,
    price: 1045,
    prevClose: 1020,
    sector: "半導體",
    latestPriceDate: "2026-06-01",
    dataSource: "FinMind",
    priceStatus: "live",
  },
  {
    symbol: "2317",
    name: "鴻海",
    shares: 500,
    avgCost: 105,
    price: 198,
    prevClose: 192,
    sector: "電子",
    latestPriceDate: "2026-06-01",
    dataSource: "FinMind",
    priceStatus: "live",
  },
  {
    symbol: "2454",
    name: "聯發科",
    shares: 100,
    avgCost: 920,
    price: 1380,
    prevClose: 1395,
    sector: "半導體",
    latestPriceDate: "2026-06-01",
    dataSource: "FinMind",
    priceStatus: "live",
  },
  {
    symbol: "2412",
    name: "中華電",
    shares: 300,
    avgCost: 122,
    price: 128.5,
    prevClose: 128,
    sector: "電信",
    latestPriceDate: "2026-06-01",
    dataSource: "FinMind",
    priceStatus: "live",
  },
  {
    symbol: "2603",
    name: "長榮",
    shares: 1000,
    avgCost: 165,
    price: 142,
    prevClose: 145,
    sector: "航運",
    latestPriceDate: "2026-06-01",
    dataSource: "FinMind",
    priceStatus: "live",
  },
  {
    symbol: "0050",
    name: "元大台灣50",
    shares: 400,
    avgCost: 142,
    price: 198.6,
    prevClose: 196.2,
    sector: "ETF",
    latestPriceDate: "2026-06-01",
    dataSource: "FinMind",
    priceStatus: "live",
  },
];

export const accounts: Account[] = [
  {
    id: "a1",
    name: "活存主帳戶",
    type: "bank",
    balance: 285000,
    investable: 200000,
    institution: "玉山銀行",
  },
  {
    id: "a2",
    name: "薪轉戶",
    type: "bank",
    balance: 142000,
    investable: 80000,
    institution: "國泰世華",
  },
  {
    id: "a3",
    name: "證券交割戶",
    type: "brokerage",
    balance: 318500,
    investable: 318500,
    institution: "永豐金證券",
  },
  {
    id: "a4",
    name: "美股券商",
    type: "brokerage",
    balance: 96200,
    investable: 96200,
    institution: "Firstrade",
  },
  {
    id: "a5",
    name: "緊急備用金",
    type: "cash",
    balance: 60000,
    investable: 0,
    institution: "現金",
  },
];

export const strategies: Strategy[] = [
  {
    symbol: "2330",
    name: "台積電",
    action: "buy",
    confidence: 86,
    price: 1045,
    target: 1180,
    technical: "突破季線壓力，KD 黃金交叉，量能放大 35%。",
    fundamental: "先進製程訂單能見度高，毛利率維持 53% 以上。",
    news: "AI 晶片需求強勁，CoWoS 產能持續擴張。",
    risk: "短線漲幅較大，留意美股科技股回檔風險。",
  },
  {
    symbol: "2317",
    name: "鴻海",
    action: "hold",
    confidence: 64,
    price: 198,
    target: 210,
    technical: "站穩月線，但量能略為縮減，盤整格局。",
    fundamental: "電動車與 AI 伺服器雙引擎，但毛利率改善需時間。",
    news: "與 NVIDIA 合作 AI 工廠進度符合預期。",
    risk: "中國市場需求疲弱，匯率波動影響獲利。",
  },
  {
    symbol: "2603",
    name: "長榮",
    action: "sell",
    confidence: 72,
    price: 142,
    target: 128,
    technical: "跌破月線支撐，MACD 死亡交叉，賣壓增加。",
    fundamental: "運價指數連續下滑，第四季獲利恐承壓。",
    news: "紅海航運恢復，運力過剩疑慮再起。",
    risk: "若 SCFI 持續走弱，可能觸發更大跌幅。",
  },
  {
    symbol: "2454",
    name: "聯發科",
    action: "buy",
    confidence: 78,
    price: 1380,
    target: 1520,
    technical: "回測月線獲得支撐，醞釀反彈。",
    fundamental: "天璣旗艦平台市佔提升，AI 手機題材發酵。",
    news: "與 NVIDIA 合作 PC 處理器，跨足新市場。",
    risk: "手機晶片競爭激烈，定價壓力存在。",
  },
];

export const totalAssets = (() => {
  return calculatePortfolioSummary(accounts, holdings);
})();

export const formatTWD = (n: number, opts: { sign?: boolean } = {}) => {
  const sign = opts.sign && n > 0 ? "+" : "";
  return sign + (n < 0 ? "-" : "") + "NT$" + Math.abs(Math.round(n)).toLocaleString("zh-TW");
};

export const formatPct = (n: number) => (n > 0 ? "+" : "") + n.toFixed(2) + "%";

// Generate fake 30-day price series
export const genSeries = (base: number, days = 30, vol = 0.025) => {
  const out: number[] = [];
  let v = base * 0.92;
  for (let i = 0; i < days; i++) {
    v = v * (1 + (Math.sin(i * 0.7) * 0.5 + (Math.random() - 0.45)) * vol);
    out.push(v);
  }
  out[out.length - 1] = base;
  return out;
};

// Candle data
export const genCandles = (base: number, days = 30) => {
  const out: { o: number; h: number; l: number; c: number; v: number }[] = [];
  let prev = base * 0.9;
  for (let i = 0; i < days; i++) {
    const o = prev;
    const change = (Math.sin(i * 0.6) * 0.5 + (Math.random() - 0.45)) * 0.03;
    const c = o * (1 + change);
    const h = Math.max(o, c) * (1 + Math.random() * 0.015);
    const l = Math.min(o, c) * (1 - Math.random() * 0.015);
    const v = Math.round(20000 + Math.random() * 50000);
    out.push({ o, h, l, c, v });
    prev = c;
  }
  out[out.length - 1].c = base;
  return out;
};
