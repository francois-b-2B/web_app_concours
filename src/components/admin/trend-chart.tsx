import { Card } from "@/components/ui/card";

export type TrendPoint = {
  label: string;
  value: number;
};

type TrendChartProps = {
  id: string;
  title: string;
  description: string;
  color: string;
  points: TrendPoint[];
};

const width = 760;
const height = 260;
const chartLeft = 44;
const chartRight = 18;
const chartTop = 18;
const chartBottom = 44;
const chartWidth = width - chartLeft - chartRight;
const chartHeight = height - chartTop - chartBottom;

function linePath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
}

export function TrendChart({ id, title, description, color, points }: TrendChartProps) {
  const values = points.map((point) => point.value);
  const maxValue = Math.max(...values, 1);
  const coordinates = points.map((point, index) => ({
    x: chartLeft + (index / Math.max(points.length - 1, 1)) * chartWidth,
    y: chartTop + chartHeight - (point.value / maxValue) * chartHeight,
  }));
  const path = linePath(coordinates);
  const area = `${path} L ${chartLeft + chartWidth} ${chartTop + chartHeight} L ${chartLeft} ${chartTop + chartHeight} Z`;
  const gradientId = `${id}-gradient`;
  const yTicks = [0, 0.5, 1];
  const labelIndexes = points.length > 1 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : [0];
  const total = points.at(-1)?.value ?? 0;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-[14px] text-muted">{description}</p>
        </div>
        <p className="shrink-0 text-2xl font-bold" style={{ color }}>{total}</p>
      </div>

      <svg
        className="mt-5 h-auto w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${title} : ${total} au total`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = chartTop + chartHeight - tick * chartHeight;
          const value = Math.round(maxValue * tick);
          return (
            <g key={tick}>
              <line x1={chartLeft} x2={chartLeft + chartWidth} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" />
              <text x={chartLeft - 10} y={y + 4} fill="var(--muted)" fontSize="12" textAnchor="end">{value}</text>
            </g>
          );
        })}

        <path d={area} fill={`url(#${gradientId})`} />
        <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />

        {coordinates.map((point, index) => (
          <circle key={`${points[index]?.label}-${index}`} cx={point.x} cy={point.y} r="4" fill={color} stroke="var(--surface)" strokeWidth="2">
            <title>{`${points[index]?.label}: ${points[index]?.value}`}</title>
          </circle>
        ))}

        {labelIndexes.map((index) => {
          const point = coordinates[index];
          return <text key={`label-${index}`} x={point.x} y={height - 12} fill="var(--muted)" fontSize="12" textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}>{points[index]?.label}</text>;
        })}
      </svg>
    </Card>
  );
}
