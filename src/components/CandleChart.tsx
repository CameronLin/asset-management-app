import { getTaiwanStockColor } from "@/lib/stockColor";

type Candle = { o: number; h: number; l: number; c: number; v: number };

export function CandleChart({ data, height = 200 }: { data: Candle[]; height?: number }) {
  if (!data.length) return null;
  const min = Math.min(...data.map((d) => d.l));
  const max = Math.max(...data.map((d) => d.h));
  const range = max - min || 1;
  const w = 320;
  const cw = w / data.length;
  const bw = Math.max(2, cw * 0.6);
  const y = (v: number) => height - ((v - min) / range) * height;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      {[0.25, 0.5, 0.75].map((p) => (
        <line
          key={p}
          x1="0"
          x2={w}
          y1={height * p}
          y2={height * p}
          stroke="var(--border)"
          strokeDasharray="2 4"
        />
      ))}
      {data.map((d, i) => {
        const color = getTaiwanStockColor(d.c - d.o).cssColor;
        const x = i * cw + cw / 2;
        const top = y(Math.max(d.o, d.c));
        const bot = y(Math.min(d.o, d.c));
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={y(d.h)} y2={y(d.l)} stroke={color} strokeWidth="1" />
            <rect x={x - bw / 2} y={top} width={bw} height={Math.max(1, bot - top)} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}

export function VolumeChart({ data, height = 60 }: { data: Candle[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.v));
  const w = 320;
  const cw = w / data.length;
  const bw = Math.max(2, cw * 0.6);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      {data.map((d, i) => {
        const h = (d.v / max) * height;
        const x = i * cw + cw / 2 - bw / 2;
        return (
          <rect
            key={i}
            x={x}
            y={height - h}
            width={bw}
            height={h}
            fill={getTaiwanStockColor(d.c - d.o).cssColor}
            opacity="0.6"
          />
        );
      })}
    </svg>
  );
}
