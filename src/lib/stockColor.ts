export type TaiwanStockColor = "red" | "green" | "gray";

export function getTaiwanStockColor(change: number) {
  const color: TaiwanStockColor = change > 0 ? "red" : change < 0 ? "green" : "gray";

  return {
    color,
    textClass:
      color === "red"
        ? "text-price-red"
        : color === "green"
          ? "text-price-green"
          : "text-price-gray",
    bgClass:
      color === "red"
        ? "bg-price-red/10"
        : color === "green"
          ? "bg-price-green/10"
          : "bg-price-gray/10",
    borderClass:
      color === "red"
        ? "border-price-red/30"
        : color === "green"
          ? "border-price-green/30"
          : "border-price-gray/30",
    ringClass:
      color === "red"
        ? "ring-price-red/30"
        : color === "green"
          ? "ring-price-green/30"
          : "ring-price-gray/30",
    iconClass:
      color === "red"
        ? "text-price-red"
        : color === "green"
          ? "text-price-green"
          : "text-price-gray",
    cssColor:
      color === "red"
        ? "var(--price-red)"
        : color === "green"
          ? "var(--price-green)"
          : "var(--price-gray)",
  };
}
