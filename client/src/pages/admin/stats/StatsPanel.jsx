import { createElement, useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  ShoppingCart,
  UserPlus,
  Package,
  Star,
  Calculator,
  TrendingUp,
  TrendingDown,
  ChevronDown,
} from "lucide-react";
import { getDashboardStatsApi } from "../../../services/stats.api";

const DAY_OPTIONS = [7, 14, 30, 60, 90];

const formatNumber = (value) => {
  const n = Number(value || 0);
  return new Intl.NumberFormat("vi-VN").format(n);
};

const formatMoneyCompact = (value) => {
  const n = Math.max(0, Number(value || 0));
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000_000) {
    const s = (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "");
    return `${s}B`;
  }
  if (n >= 1_000_000) {
    const s = (n / 1_000_000).toFixed(1).replace(/\.0$/, "");
    return `${s}M`;
  }
  return formatNumber(n);
};

const formatPct = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0%";
  const abs = Math.abs(n);
  const s = abs >= 100 ? abs.toFixed(0) : abs.toFixed(1);
  return `${s}%`;
};

const formatVndFull = (value) => {
  const n = Number(value || 0);
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
};

const Card = ({ title, value, Icon, colorClass, changePct, money }) => {
  const pct = Number(changePct || 0);
  const up = pct >= 0;
  const TrendIcon = up ? TrendingUp : TrendingDown;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 anim-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div
          className={
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 " +
            (colorClass || "bg-teal-50 text-teal-700")
          }
        >
          {createElement(Icon, { size: 18 })}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-2xl font-extrabold text-gray-900 whitespace-nowrap">
          {money ? formatMoneyCompact(value) : formatNumber(value)}
        </div>
        <div className="mt-1 text-xs text-gray-500 font-semibold">{title}</div>

        <div
          className={
            "mt-2 flex items-center gap-1 text-xs font-semibold " +
            (up ? "text-emerald-700" : "text-red-700")
          }
        >
          {createElement(TrendIcon, { size: 14 })}
          <span>{formatPct(pct)}</span>
          <span className="font-medium opacity-80">so với kỳ trước</span>
        </div>
      </div>
    </div>
  );
};

const SectionCard = ({ title, children, right }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden anim-fade-up">
      <div className="px-6 py-4 flex items-center justify-between gap-3 border-b border-gray-100">
        <div className="text-sm font-bold text-gray-800">{title}</div>
        {right}
      </div>
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
};

const RevenueLineChart = ({ data }) => {
  const [hoverIndex, setHoverIndex] = useState(null);

  const Y_MAX = 200_000_000;

  const prepared = useMemo(() => {
    const items = Array.isArray(data) ? data : [];
    return { items };
  }, [data]);

  const viewW = 1000;
  const viewH = 280;
  const padL = 44;
  const padR = 16;
  const padT = 18;
  const padB = 36;
  const plotW = viewW - padL - padR;
  const plotH = viewH - padT - padB;

  const points = useMemo(() => {
    const n = prepared.items.length;
    if (n === 0) return [];
    return prepared.items.map((it, idx) => {
      const x = padL + (n === 1 ? plotW / 2 : (idx / (n - 1)) * plotW);
      const v = Number(it?.revenue || 0);
      const clamped = Math.max(0, Math.min(Y_MAX, v));
      const y = padT + (1 - clamped / Y_MAX) * plotH;
      return { x, y, v, date: it?.date };
    });
  }, [prepared, padL, padT, plotW, plotH]);

  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    return points
      .map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(" ");
  }, [points]);

  const yTicks = useMemo(() => {
    return [0, 50_000_000, 100_000_000, 150_000_000, 200_000_000].map((v) => {
      const y = padT + (1 - v / Y_MAX) * plotH;
      return { v, y };
    });
  }, [padT, plotH]);

  const xTickIndexes = useMemo(() => {
    const n = prepared.items.length;
    if (n <= 1) return [0];
    const target = 6;
    const step = Math.max(1, Math.ceil(n / target));
    const idxs = [];
    for (let i = 0; i < n; i += step) idxs.push(i);
    if (idxs[idxs.length - 1] !== n - 1) idxs.push(n - 1);
    return idxs;
  }, [prepared.items.length]);

  const onMove = (e) => {
    if (points.length === 0) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relX = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
    const x = (relX / rect.width) * viewW;
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i += 1) {
      const d = Math.abs(points[i].x - x);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    setHoverIndex(bestIdx);
  };

  const onLeave = () => setHoverIndex(null);

  const hoverPoint =
    hoverIndex == null ? null : points[Math.min(points.length - 1, Math.max(0, hoverIndex))];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="w-full h-[280px] text-teal-500"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        role="img"
        aria-label="Biểu đồ doanh thu"
      >
        <rect x="0" y="0" width={viewW} height={viewH} fill="transparent" />

        {yTicks.map((t, idx) => (
          <line
            key={idx}
            x1={padL}
            x2={viewW - padR}
            y1={t.y}
            y2={t.y}
            stroke="currentColor"
            className="text-gray-200"
            strokeWidth="1"
          />
        ))}

        {yTicks.map((t) => (
          <text
            key={t.v}
            x={padL - 10}
            y={t.y + 4}
            textAnchor="end"
            className="fill-gray-400"
            fontSize="12"
          >
            {formatMoneyCompact(t.v)}
          </text>
        ))}

        <line
          x1={padL}
          x2={padL}
          y1={padT}
          y2={viewH - padB}
          stroke="currentColor"
          className="text-gray-200"
          strokeWidth="1"
        />

        {points.length > 0 ? (
          <>
            <path d={pathD} fill="none" stroke="currentColor" strokeWidth="3" />
            {points.map((p, idx) => (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r={idx === hoverIndex ? 6 : 4}
                fill="white"
                stroke="currentColor"
                strokeWidth="3"
              />
            ))}
          </>
        ) : (
          <text
            x={viewW / 2}
            y={viewH / 2}
            textAnchor="middle"
            className="fill-gray-400"
          >
            Không có dữ liệu
          </text>
        )}

        <line
          x1={padL}
          x2={viewW - padR}
          y1={viewH - padB}
          y2={viewH - padB}
          stroke="currentColor"
          className="text-gray-200"
          strokeWidth="1"
        />

        {xTickIndexes.map((idx) => {
          const p = points[idx];
          if (!p) return null;
          const label = String(p.date || "");
          return (
            <text
              key={idx}
              x={p.x}
              y={viewH - 12}
              textAnchor="middle"
              className="fill-gray-400"
              fontSize="12"
            >
              {label}
            </text>
          );
        })}
      </svg>

      {hoverPoint ? (
        <div
          className="absolute px-3 py-2 rounded-xl bg-white border border-gray-200 shadow-sm text-xs text-gray-700"
          style={{
            left: `${(hoverPoint.x / viewW) * 100}%`,
            top: 12,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-semibold text-gray-800">Ngày: {hoverPoint.date}</div>
          <div className="mt-0.5">Doanh thu: {formatMoneyCompact(hoverPoint.v)}</div>
        </div>
      ) : null}
    </div>
  );
};

const OrdersStatusBarChart = ({ data }) => {
  const [hover, setHover] = useState(null);
  const raw = Array.isArray(data) ? data : [];
  const total = raw.reduce((s, it) => s + Number(it?.count || 0), 0) || 0;
  const items = raw.map((it) => {
    const count = Number(it?.count || 0);
    const pct = total > 0 ? (count / total) * 100 : 0;
    return { status: it?.status, count, pct };
  });

  const meta = {
    pending: { label: "Chờ xử lý", bar: "bg-amber-400" },
    shipping: { label: "Đang giao", bar: "bg-blue-500" },
    completed: { label: "Hoàn thành", bar: "bg-emerald-500" },
    cancelled: { label: "Đã huỷ", bar: "bg-red-500" },
  };

  return (
    <div className="w-full">
      <div className="relative h-[260px]">
        <div className="absolute left-0 right-0 top-0 bottom-8">
          {[0, 25, 50, 75, 100].map((v) => (
            <div key={v} className="absolute left-0 right-0" style={{ bottom: `${v}%` }}>
              <div className="flex items-center gap-2">
                <div className="w-10 text-right text-xs text-gray-400">{v}</div>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            </div>
          ))}
        </div>

        <div className="absolute left-10 right-0 top-0 bottom-8 flex items-end gap-4">
          {items.map((it, idx) => {
          const status = String(it?.status || "");
          const m = meta[status] || { label: status || "Khác", bar: "bg-gray-400" };
          const h = Math.max(0, Math.min(100, it.pct));
          return (
            <div
              key={status}
              className="flex-1 min-w-0 flex flex-col items-center gap-2"
              onMouseEnter={() => setHover({ idx })}
              onMouseLeave={() => setHover(null)}
            >
              <div className="w-full h-[190px] bg-transparent flex items-end">
                <div className="w-full bg-gray-50 border border-gray-100 rounded-xl overflow-hidden flex items-end">
                  <div
                    className={"w-full " + m.bar}
                    style={{ height: `${h}%` }}
                    aria-label={`${m.label}: ${it.count}`}
                  />
                </div>
              </div>
              <div className="text-xs text-gray-600 text-center truncate w-full">{m.label}</div>
            </div>
          );
        })}
        </div>

        <div className="absolute left-10 right-0 bottom-8 h-px bg-gray-200" />
        <div className="absolute left-10 right-0 bottom-0 h-8 flex items-end gap-4">
          {items.map((it) => (
            <div key={String(it.status)} className="flex-1 text-center text-xs text-gray-400">
              {Math.round(it.pct)}%
            </div>
          ))}
        </div>

        {hover ? (
          <div className="absolute right-3 top-2 px-3 py-2 rounded-xl bg-white border border-gray-200 shadow-sm text-xs text-gray-700">
            <div className="font-semibold text-gray-800">
              {meta[String(items[hover.idx]?.status || "")]?.label || String(items[hover.idx]?.status || "")}
            </div>
            <div className="mt-0.5">Tỷ lệ: {formatPct(items[hover.idx]?.pct || 0)}</div>
            <div className="mt-0.5">Số đơn: {formatNumber(items[hover.idx]?.count || 0)}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const CategoryDonutChart = ({ data }) => {
  const items = Array.isArray(data) ? data : [];
  const total = items.reduce((s, it) => s + Number(it?.qty || 0), 0);

  const colors = [
    { text: "text-pink-500", dot: "bg-pink-500" },
    { text: "text-emerald-500", dot: "bg-emerald-500" },
    { text: "text-blue-500", dot: "bg-blue-500" },
    { text: "text-amber-400", dot: "bg-amber-400" },
    { text: "text-violet-500", dot: "bg-violet-500" },
    { text: "text-teal-500", dot: "bg-teal-500" },
    { text: "text-rose-500", dot: "bg-rose-500" },
    { text: "text-lime-500", dot: "bg-lime-500" },
  ];

  const r = 54;
  const c = 2 * Math.PI * r;
  const strokeW = 16;
  let offset = 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[170px] h-[170px] shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full">
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="currentColor"
            className="text-gray-200"
            strokeWidth={strokeW}
          />

          {total > 0
            ? items.map((it, idx) => {
                const qty = Number(it?.qty || 0);
                const frac = qty / total;
                const dash = frac * c;
                const color = colors[idx % colors.length];
                const el = (
                  <circle
                    key={String(it?.categoryId || it?.name || idx)}
                    cx="70"
                    cy="70"
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeW}
                    strokeLinecap="butt"
                    strokeDasharray={`${dash} ${c - dash}`}
                    strokeDashoffset={-offset}
                    className={color.text}
                    transform="rotate(-90 70 70)"
                  />
                );
                offset += dash;
                return el;
              })
            : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-sm font-extrabold text-gray-900">{formatNumber(total)}</div>
          <div className="text-xs text-gray-500">SP đã bán</div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 text-sm text-gray-500">Không có dữ liệu</div>
      ) : (
        <div className="mt-6 w-full">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray-600">
            {items.map((it, idx) => {
              const color = colors[idx % colors.length];
              return (
                <div
                  key={String(it?.categoryId || it?.name || idx)}
                  className="flex items-center gap-2"
                >
                  <span className={"w-3 h-3 rounded-sm " + color.dot} />
                  <span className="font-semibold text-gray-700">{String(it?.name || "")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const StatsPanel = ({ toast }) => {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);
      try {
        const res = await getDashboardStatsApi({ days });
        if (!mounted) return;
        setPayload(res);
      } catch (e) {
        if (!mounted) return;
        setPayload(null);
        toast?.error?.(e?.message || "Không thể tải thống kê");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [days, toast]);

  const kpis = payload?.kpis || {};
  const charts = payload?.charts || {};

  const topProducts = Array.isArray(charts.topProducts) ? charts.topProducts : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-lg md:text-xl font-extrabold text-gray-900">Thống kê hệ thống</div>
          <div className="text-sm text-gray-500">Tổng quan dữ liệu kinh doanh</div>
        </div>

        <div className="shrink-0 relative">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value) || 30)}
            className="h-10 pl-3 pr-10 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 outline-none focus:border-gray-300 appearance-none"
            aria-label="Chọn số ngày"
          >
            {DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} ngày
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
            {createElement(ChevronDown, { size: 16 })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card
          title="Tổng doanh thu"
          value={loading ? 0 : kpis?.totalRevenue?.value}
          Icon={BadgeDollarSign}
          colorClass="bg-teal-50 text-teal-700"
          changePct={loading ? 0 : kpis?.totalRevenue?.changePct}
          money
        />
        <Card
          title="Tổng đơn hàng"
          value={loading ? 0 : kpis?.completedOrders?.value}
          Icon={ShoppingCart}
          colorClass="bg-indigo-50 text-indigo-700"
          changePct={loading ? 0 : kpis?.completedOrders?.changePct}
        />
        <Card
          title="Khách hàng mới"
          value={loading ? 0 : kpis?.newCustomers?.value}
          Icon={UserPlus}
          colorClass="bg-violet-50 text-violet-700"
          changePct={loading ? 0 : kpis?.newCustomers?.changePct}
        />
        <Card
          title="Sản phẩm đã bán"
          value={loading ? 0 : kpis?.productsSold?.value}
          Icon={Package}
          colorClass="bg-amber-50 text-amber-700"
          changePct={loading ? 0 : kpis?.productsSold?.changePct}
        />
        <Card
          title="Lượt đánh giá"
          value={loading ? 0 : kpis?.reviewsCount?.value}
          Icon={Star}
          colorClass="bg-rose-50 text-rose-700"
          changePct={loading ? 0 : kpis?.reviewsCount?.changePct}
        />
        <Card
          title="Giá trị TB/đơn"
          value={loading ? 0 : kpis?.avgOrderValue?.value}
          Icon={Calculator}
          colorClass="bg-emerald-50 text-emerald-700"
          changePct={loading ? 0 : kpis?.avgOrderValue?.changePct}
          money
        />
      </div>

      <SectionCard title="Biểu đồ doanh thu">
        <RevenueLineChart data={charts.revenueByDay} />
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Đơn hàng theo trạng thái">
          <OrdersStatusBarChart data={charts.ordersByStatus} />
        </SectionCard>
        <SectionCard title="Phân bổ theo danh mục">
          <CategoryDonutChart data={charts.categoryDistribution} />
        </SectionCard>
      </div>

      <SectionCard title="Top sản phẩm bán chạy">
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-left font-semibold px-4 py-3">#</th>
                <th className="text-left font-semibold px-4 py-3">Sản phẩm</th>
                <th className="text-right font-semibold px-4 py-3">Đã bán</th>
                <th className="text-right font-semibold px-4 py-3">Doanh thu</th>
                <th className="text-right font-semibold px-4 py-3">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-sm text-gray-500">
                    Đang tải…
                  </td>
                </tr>
              ) : topProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-sm text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                topProducts.map((p, idx) => (
                  <tr key={String(p.productId || idx)} className="text-sm">
                    <td className="px-4 py-4 font-bold text-amber-600">{idx + 1}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">
                            {p.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="inline-flex items-center justify-center min-w-8 px-2 h-6 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {formatNumber(p.qtySold)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-teal-700">
                      {formatVndFull(p.revenue)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="inline-flex items-center gap-1 text-gray-700">
                        {createElement(Star, { size: 14, className: "text-gray-700" })}
                        <span className="font-semibold">{Number(p.ratingAvg || 0).toFixed(1)}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
};

export default StatsPanel;
