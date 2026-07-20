import React, { useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea
} from "recharts";
import { TrendingUp } from "lucide-react";
import { MarketAnalysisResponse } from "../types";

const FC_MODELS = [
  { key: "lstm", label: "RNN", color: "#10b981" },
  { key: "xgboost", label: "XGBoost", color: "#f59e0b" },
  { key: "arima", label: "ARIMA", color: "#3b82f6" },
  { key: "prophet", label: "Prophet", color: "#a855f7" }
];

export default function ForecastChart({ data }: { data: MarketAnalysisResponse | null }) {
  // The 4 individual models start hidden so the default view is clean (price + forecast).
  const [hidden, setHidden] = useState<Record<string, boolean>>({
    lstm: true, xgboost: true, arima: true, prophet: true
  });
  const toggle = (k: string) => setHidden((p) => ({ ...p, [k]: !p[k] }));

  if (!data?.forecast || data.forecast.length === 0) return null;

  // Add a [low, high] tuple so the uncertainty band renders as one filled area
  const chartData = data.forecast.map((p) => ({
    ...p,
    range: p.lower != null && p.upper != null ? [p.lower, p.upper] : null
  }));
  const todayDate = [...data.forecast].reverse().find((p) => p.price !== null)?.date;
  const lastDate = data.forecast[data.forecast.length - 1]?.date;

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl dir-rtl" style={{ direction: "rtl" }}>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-5">
        <div>
          <h3 className="text-md font-bold text-white flex items-center gap-1.5 font-sans">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            תחזית מחיר עתידית — 30 ימים קדימה (Model Forecast)
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed font-sans">
            <span className="text-rose-400 font-semibold">הקו האדום</span> = המחיר האמיתי עד היום.
            מימין לקו <span className="text-slate-300">"היום"</span> (האזור המוצלל) — התחזית:
            {" "}<span className="text-amber-400 font-semibold">הקו הכתום</span> = תחזית-העל המשוקללת,
            {" "}וה<span className="text-amber-400/70 font-semibold">אזור הכתום</span> = טווח אי-הוודאות (±90%).
            ניתן להציג מודל בודד בכפתורים.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-850 text-[11px] font-sans shrink-0">
          <span className="text-[10px] text-slate-500">הצג מודל:</span>
          {FC_MODELS.map((m) => (
            <button
              key={m.key}
              onClick={() => toggle(m.key)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all cursor-pointer text-slate-300 ${hidden[m.key] ? "opacity-40" : "bg-slate-800/70"}`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }}></span> {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-80 w-full font-mono text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            {/* Shade the forecast zone so past vs. future is obvious */}
            {todayDate && lastDate && (
              <ReferenceArea {...({ x1: todayDate, x2: lastDate, fill: "#f59e0b", fillOpacity: 0.04, stroke: "none" } as any)} />
            )}
            <XAxis dataKey="date" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 10 }} minTickGap={40} />
            <YAxis
              orientation="right"
              stroke="#64748b"
              tick={{ fill: "#64748b", fontSize: 10 }}
              domain={["auto", "auto"]}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "12px", fontSize: 12, textAlign: "right" }}
              labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
              formatter={(v: any, n: string) => {
                if (n === "טווח אי-ודאות" && Array.isArray(v)) return [`$${Number(v[0]).toLocaleString("he-IL")} – $${Number(v[1]).toLocaleString("he-IL")}`, n];
                return [v == null ? "-" : `$${Number(v).toLocaleString("he-IL")}`, n];
              }}
            />
            {/* Filled uncertainty band */}
            <Area type="monotone" dataKey="range" name="טווח אי-ודאות" stroke="none" fill="#f59e0b" fillOpacity={0.12} connectNulls />
            {todayDate && (
              <ReferenceLine x={todayDate} stroke="#64748b" strokeDasharray="4 4" label={{ value: "היום", fill: "#94a3b8", fontSize: 11, position: "insideTopRight" }} />
            )}
            {/* Per-model forecasts (hidden by default, toggle to show) */}
            {!hidden.lstm && <Line type="monotone" dataKey="lstm" name="RNN" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="4 3" connectNulls />}
            {!hidden.xgboost && <Line type="monotone" dataKey="xgboost" name="XGBoost" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 3" connectNulls />}
            {!hidden.arima && <Line type="monotone" dataKey="arima" name="ARIMA" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="4 3" connectNulls />}
            {!hidden.prophet && <Line type="monotone" dataKey="prophet" name="Prophet" stroke="#a855f7" strokeWidth={1.5} dot={false} strokeDasharray="4 3" connectNulls />}
            {/* Weighted ensemble forecast (the headline line) */}
            <Line type="monotone" dataKey="ensemble" name="תחזית משוקללת" stroke="#f59e0b" strokeWidth={3} dot={false} connectNulls />
            {/* Historical Bitcoin price — red & bold so it stands out */}
            <Line type="monotone" dataKey="price" name="מחיר ביטקוין" stroke="#ef4444" strokeWidth={2.5} dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-slate-500 mt-3 text-center font-sans leading-relaxed">
        ⚠️ אקסטרפולציה מתמטית של המודלים — לא ודאות. ככל שמתרחקים בזמן אי-הוודאות גדלה (ראו את החרוט המתרחב), והמשמעות העיקרית היא ב-1–2 השבועות הראשונים. דיוק כיווני בפועל ~50% — אין להסתמך עליה למסחר.
      </p>
    </div>
  );
}
