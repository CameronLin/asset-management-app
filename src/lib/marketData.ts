const FINMIND_API_URL = "https://api.finmindtrade.com/api/v4/data";
const DEFAULT_HISTORY_LOOKBACK_DAYS = 30;

type FinMindPriceRecord = {
  date: string;
  stock_id: string;
  Trading_Volume: number;
  open: number;
  max: number;
  min: number;
  close: number;
};

type FinMindTaiexRecord = {
  date: string;
  TAIEX: number;
};

type FinMindResponse = {
  msg?: string;
  status?: number;
  data?: Array<FinMindPriceRecord | FinMindTaiexRecord>;
};

export type TaiwanStockPricePoint = {
  symbol: string;
  date: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
};

export type TaiwanIndexQuote = {
  symbol: string;
  name: string;
  date?: string;
  value?: number;
  change?: number;
  changePct?: number;
  source: string;
  dataset: string;
  fieldName: string;
  status: "available" | "unavailable";
  message?: string;
};

export class MarketDataError extends Error {
  code: "NOT_FOUND" | "API_ERROR" | "NETWORK_ERROR";

  constructor(code: "NOT_FOUND" | "API_ERROR" | "NETWORK_ERROR", message: string) {
    super(message);
    this.name = "MarketDataError";
    this.code = code;
  }
}

export function normalizeTaiwanStockSymbol(stockSymbol: string) {
  return stockSymbol
    .trim()
    .toUpperCase()
    .replace(/\.TW$/, "")
    .replace(/[^0-9]/g, "");
}

function getFinMindToken() {
  return import.meta.env.VITE_FINMIND_API_TOKEN?.trim();
}

function buildHeaders() {
  const token = getFinMindToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getHistoryStartDate(days: number) {
  const start = new Date();
  start.setDate(start.getDate() - Math.max(days * 3, DEFAULT_HISTORY_LOOKBACK_DAYS));
  return formatDate(start);
}

function mapPricePoint(record: FinMindPriceRecord): TaiwanStockPricePoint {
  return {
    symbol: record.stock_id,
    date: record.date,
    close: record.close,
    open: record.open,
    high: record.max,
    low: record.min,
    volume: record.Trading_Volume,
  };
}

async function requestFinMindData<T extends FinMindPriceRecord | FinMindTaiexRecord>(
  params: Record<string, string>,
) {
  let response: Response;

  try {
    response = await fetch(`${FINMIND_API_URL}?${new URLSearchParams(params).toString()}`, {
      headers: buildHeaders(),
    });
  } catch (error) {
    throw new MarketDataError(
      "NETWORK_ERROR",
      error instanceof Error ? `Network error: ${error.message}` : "Network error",
    );
  }

  let payload: FinMindResponse;

  try {
    payload = (await response.json()) as FinMindResponse;
  } catch {
    throw new MarketDataError("API_ERROR", "FinMind API returned an unreadable response.");
  }

  if (!response.ok || payload.status == null || payload.status >= 400) {
    throw new MarketDataError(
      "API_ERROR",
      payload.msg || `FinMind API request failed with status ${response.status}.`,
    );
  }

  if (!payload.data || payload.data.length === 0) {
    throw new MarketDataError(
      "NOT_FOUND",
      "No stock price data was found for the requested symbol.",
    );
  }

  return payload.data as T[];
}

export async function fetchTaiwanStockHistory(stockSymbol: string, days: number) {
  const normalizedSymbol = normalizeTaiwanStockSymbol(stockSymbol);

  if (!normalizedSymbol) {
    throw new MarketDataError("NOT_FOUND", "A valid Taiwan stock symbol is required.");
  }

  if (!Number.isInteger(days) || days <= 0) {
    throw new MarketDataError("API_ERROR", "History days must be a positive integer.");
  }

  const data = await requestFinMindData<FinMindPriceRecord>({
    dataset: "TaiwanStockPrice",
    data_id: normalizedSymbol,
    start_date: getHistoryStartDate(days),
    end_date: formatDate(new Date()),
  });

  return data
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days)
    .map(mapPricePoint);
}

export async function fetchTaiwanStockLatestPrice(stockSymbol: string) {
  const history = await fetchTaiwanStockHistory(stockSymbol, 1);
  const latest = history.at(-1);

  if (!latest) {
    throw new MarketDataError("NOT_FOUND", "No latest stock price data was found.");
  }

  return latest;
}

async function fetchTaiwanTaiexData() {
  const dataset = "TaiwanVariousIndicators5Seconds";
  const fieldName = "TAIEX";
  const data = await requestFinMindData<FinMindTaiexRecord>({
    dataset,
    start_date: getHistoryStartDate(2),
    end_date: formatDate(new Date()),
  });
  console.log("[MarketData] index dataset:", dataset);
  console.log("[MarketData] index field:", fieldName);
  console.log("[MarketData] FinMind index API raw response:", data);

  const rows = data
    .filter((row) => typeof row.TAIEX === "number" && Number.isFinite(row.TAIEX))
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = rows.at(-1);

  if (!latest) {
    return {
      symbol: "TAIEX",
      name: "台股加權指數",
      source: "FinMind",
      dataset,
      fieldName,
      status: "unavailable",
      message: "指數資料解析失敗",
    } satisfies TaiwanIndexQuote;
  }

  const previous = rows.length >= 2 ? rows[rows.length - 2]! : null;
  const latestClose = latest.TAIEX;
  const previousClose = previous?.TAIEX ?? latestClose;
  const change = latestClose - previousClose;
  const changePct = previousClose !== 0 ? (change / previousClose) * 100 : 0;

  return {
    symbol: "TAIEX",
    name: "台股加權指數",
    date: latest.date,
    value: latestClose,
    change,
    changePct,
    source: "FinMind",
    dataset,
    fieldName,
    status: "available",
  } satisfies TaiwanIndexQuote;
}

async function fetchUnavailableTpexData() {
  return {
    symbol: "TPEx",
    name: "櫃買指數",
    source: "FinMind",
    dataset: "N/A",
    fieldName: "N/A",
    status: "unavailable",
    message: "尚未找到可靠的櫃買指數收盤資料欄位",
  } satisfies TaiwanIndexQuote;
}

async function fetchTaiwan50ProxyData() {
  const taiwan50Latest = await fetchTaiwanStockLatestPrice("0050");
  const taiwan50History = await fetchTaiwanStockHistory("0050", 2);

  const previous0050 = taiwan50History.length >= 2 ? taiwan50History[0]! : null;
  const change0050 = previous0050 ? taiwan50Latest.close - previous0050.close : 0;
  const changePct0050 =
    previous0050 && previous0050.close !== 0 ? (change0050 / previous0050.close) * 100 : 0;

  const taiwan50 = {
    symbol: "0050",
    name: "台灣50（0050 ETF）",
    date: taiwan50Latest.date,
    value: taiwan50Latest.close,
    change: change0050,
    changePct: changePct0050,
    source: "FinMind",
    dataset: "TaiwanStockPrice",
    fieldName: "close",
    status: "available",
  } satisfies TaiwanIndexQuote;

  return taiwan50;
}

export async function fetchTaiwanIndexData() {
  const [taiex, tpex, taiwan50] = await Promise.all([
    fetchTaiwanTaiexData(),
    fetchUnavailableTpexData(),
    fetchTaiwan50ProxyData(),
  ]);

  return [taiex, tpex, taiwan50];
}
