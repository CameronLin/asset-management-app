# Asset App

一個結合台股投資管理與日常記帳功能的前端 Web App，使用 `React + Vite + TanStack Router` 建立，採用 `localStorage` 作為目前的本地資料層，並串接 `FinMind API` 取得部分台股行情資料。

## 專案功能

- 資產總覽
  - 顯示總資產、總負債、淨資產
  - 顯示股票、ETF、現金、金融帳戶配置
  - 顯示持股產業配置與負債摘要
- 持股管理
  - 新增、編輯、刪除持股
  - 支援更新全部股價
  - 支援依股票代號或名稱搜尋
- 股票詳情
  - 顯示近 30 日歷史股價
  - 顯示趨勢、成交量與基本持股資訊
- 市場行情
  - 顯示我的關注清單
  - 支援 watchlist 新增與刪除
- 帳戶管理
  - 管理金融帳戶
  - 管理信用卡帳單與當期未繳金額
  - 管理分期付款與未來分期帳單
- 交易紀錄 / 現金流
  - 記錄買進、賣出、股利、收入、支出、信用卡、分期付款
  - 顯示本月收入、支出、投資買入、股利與淨現金流
- 一般記帳
  - 記錄日常收入與支出
  - 支援分類、備註與日期管理
- 信用卡管理
  - 新增信用卡
  - 新增信用卡消費
  - 標記信用卡帳單已繳
- 分期管理
  - 新增分期方案
  - 查看每月應繳帳單
  - 查看每筆分期的已繳 / 未繳狀態

## 技術堆疊

- React 19
- Vite 7
- TanStack Router
- TanStack Query
- Tailwind CSS 4
- Radix UI
- Recharts
- Sonner

## 啟動方式

### 1. 安裝依賴

```bash
npm install
```

### 2. 啟動開發環境

```bash
npm run dev
```

### 3. 建置正式版本

```bash
npm run build
```

### 4. 預覽建置結果

```bash
npm run preview
```

## 環境變數

如果要使用 `FinMind` 取得台股行情，請建立 `.env.local`：

```env
VITE_FINMIND_API_TOKEN=your_finmind_token
```

未設定 token 時，部分功能仍可運作，但會受限於 FinMind 的未登入額度或資料限制。

## 主要頁面

- `/`
  - 資產總覽
- `/holdings`
  - 持股管理
- `/holdings/:symbol`
  - 股票詳情
- `/market`
  - 市場行情 / 我的關注
- `/accounts`
  - 帳戶管理 / 信用卡帳單 / 分期付款
- `/strategy`
  - 交易紀錄 / 現金流 / 一般記帳

## 資料儲存方式

目前專案以 `localStorage` 為主，適合本地開發、原型驗證與個人端測試。

主要資料包含：

- `accounts`
- `holdings`
- `transactions`
- `watchlist`
- `creditCards`
- `creditCardTransactions`
- `installmentPlans`
- `financeRecords`

其中 `financeRecords` 不只包含股票交易，也包含：

- 收入
- 支出
- 股利
- 信用卡付款
- 分期付款

## 專案結構

```text
src/
  components/   共用元件
  lib/          型別、計算邏輯、storage、行情資料層
  routes/       頁面路由
```

## 目前特性

- 深色金融科技風格 UI
- 手機版優先的卡片式介面
- 同時支援投資資產管理與一般記帳
- 可追蹤信用卡帳單與分期付款
- 台股漲跌配色規則
  - 上漲：紅色
  - 下跌：綠色
  - 平盤：灰色

## 後續擴充方向

- 接入正式後端與資料庫
- 使用交易紀錄自動回推持股與成本
- 串接更多即時行情與新聞資料
- 增加登入、雲端同步與多裝置資料共享
