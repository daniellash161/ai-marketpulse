import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import {
  Play,
  TrendingUp,
  TrendingDown,
  Loader2,
  Sparkles,
  FileText,
  AlertTriangle,
  Activity,
  Download
} from "lucide-react";
import { HelpCircle } from "lucide-react";
import { MarketAnalysisResponse } from "../types";

interface BacktesterProps {
  data: MarketAnalysisResponse | null;
}

const STRATEGIES = [
  { id: "ml_ensemble", name: "מודל משולב (ML Ensemble)" },
  { id: "buy_the_dip", name: "קניית שפל (RSI < 30)" },
  { id: "ma150_proximity", name: "חציית ממוצע נע MA150" },
  { id: "fear_greed", name: "מדד פחד ותאוות בצע" },
  { id: "poly_arbitrage", name: "ארביטראז' פולימרקט-ML" }
];

const START_DATES = [
  { label: "מ-2020", value: "2020-01-01" },
  { label: "מ-2022", value: "2022-01-01" },
  { label: "מ-2024", value: "2024-01-01" }
];

// Lightweight Hebrew-markdown → JSX renderer for the AI report
const renderMarkdown = (md: string): React.ReactNode[] => {
  const lines = md.split("\n");
  const out: React.ReactNode[] = [];
  let listBuf: string[] = [];

  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((p, idx) =>
      p.startsWith("**") && p.endsWith("**") ? (
        <strong key={idx} className="text-white font-bold">{p.slice(2, -2)}</strong>
      ) : (
        <React.Fragment key={idx}>{p}</React.Fragment>
      )
    );

  const flushList = (key: number) => {
    if (listBuf.length) {
      out.push(
        <ul key={"ul" + key} className="list-disc pr-5 space-y-1 my-2 text-slate-300 text-[13px]">
          {listBuf.map((li, idx) => <li key={idx}>{inline(li)}</li>)}
        </ul>
      );
      listBuf = [];
    }
  };

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (line.startsWith("### ")) { flushList(i); out.push(<h4 key={i} className="text-sm font-bold text-amber-400 mt-4 mb-1">{inline(line.slice(4))}</h4>); }
    else if (line.startsWith("## ")) { flushList(i); out.push(<h3 key={i} className="text-md font-bold text-amber-500 mt-5 mb-2 border-b border-slate-800 pb-1">{inline(line.slice(3))}</h3>); }
    else if (line.startsWith("# ")) { flushList(i); out.push(<h3 key={i} className="text-lg font-bold text-white mt-5 mb-2">{inline(line.slice(2))}</h3>); }
    else if (line.startsWith("- ") || line.startsWith("* ")) { listBuf.push(line.slice(2)); }
    else if (line === "") { flushList(i); }
    else { flushList(i); out.push(<p key={i} className="text-slate-300 leading-relaxed my-1.5 text-[13px]">{inline(line)}</p>); }
  });
  flushList(9999);
  return out;
};

// Convert the report markdown to a standalone HTML body string (for download)
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inlineHtml = (s: string) =>
  escapeHtml(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

const markdownToHtml = (md: string): string => {
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("### ")) { closeList(); out.push(`<h3>${inlineHtml(line.slice(4))}</h3>`); }
    else if (line.startsWith("## ")) { closeList(); out.push(`<h2>${inlineHtml(line.slice(3))}</h2>`); }
    else if (line.startsWith("# ")) { closeList(); out.push(`<h1>${inlineHtml(line.slice(2))}</h1>`); }
    else if (line.startsWith("- ") || line.startsWith("* ")) { if (!inList) { out.push("<ul>"); inList = true; } out.push(`<li>${inlineHtml(line.slice(2))}</li>`); }
    else if (line === "") { closeList(); }
    else { closeList(); out.push(`<p>${inlineHtml(line)}</p>`); }
  }
  closeList();
  return out.join("\n");
};

const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

// Small help icon with a hover tooltip explaining a control in plain language
function InfoTip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group align-middle">
      <HelpCircle className="w-3.5 h-3.5 text-slate-500 hover:text-amber-400 cursor-help" />
      <span
        className="pointer-events-none absolute bottom-full right-0 mb-1.5 w-60 bg-slate-950 border border-slate-700 text-slate-300 text-[10px] font-normal leading-relaxed rounded-lg p-2.5 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl text-right"
        style={{ direction: "rtl" }}
      >
        {text}
      </span>
    </span>
  );
}

export default function Backtester({ data }: BacktesterProps) {
  const [strategyId, setStrategyId] = useState("ml_ensemble");
  const [startDate, setStartDate] = useState("2022-01-01");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [report, setReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const runBacktest = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/run-backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyId, startDate })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setResult(json);
    } catch (e: any) {
      setError(e.message || "הרצת הבקטסט נכשלה");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!data) return;
    setReportLoading(true); setReportError(null); setReport(null);
    try {
      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPrice: data.currentData.price,
          rsi: data.currentData.rsi,
          fearGreed: data.currentData.fearGreed,
          polymarketProb: data.polymarketBook.impliedProbability,
          modelsList: data.models,
          strategyMetrics: result?.strategyResult
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setReport(json.report);
    } catch (e: any) {
      setReportError(e.message || "יצירת הדוח נכשלה");
    } finally {
      setReportLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const date = new Date().toLocaleDateString("he-IL");
    const meta = data
      ? `מחיר BTC: $${data.currentData.price.toLocaleString("he-IL")} · RSI: ${data.currentData.rsi} · פחד ותאוות בצע: ${data.currentData.fearGreed} · פולימרקט: ${data.polymarketBook.impliedProbability}%`
      : "";
    const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<title>AI MarketPulse — דוח מחקרי</title>
<style>
  body { font-family: "Rubik", Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.7; }
  h1 { font-size: 26px; }
  h2 { font-size: 20px; color: #b45309; border-bottom: 2px solid #f1f1f1; padding-bottom: 6px; margin-top: 28px; }
  h3 { font-size: 16px; color: #b45309; }
  ul { padding-right: 22px; } li { margin: 4px 0; }
  .meta { color: #555; font-size: 13px; border: 1px solid #eee; border-radius: 8px; padding: 12px 16px; background: #fafafa; margin-bottom: 24px; }
  .header { text-align: center; border-bottom: 3px solid #f59e0b; padding-bottom: 12px; margin-bottom: 20px; }
  .brand { font-weight: 800; font-size: 22px; } .brand b { color: #f59e0b; }
  .foot { color: #999; font-size: 11px; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 12px; }
</style>
</head>
<body>
  <div class="header"><div class="brand">AI <b>MarketPulse</b></div><div style="color:#666;font-size:13px;">דוח מחקרי · ${date}</div></div>
  <div class="meta">${meta}</div>
  ${markdownToHtml(report)}
  <div class="foot">נוצר על-ידי AI MarketPulse · הנתונים נועדו למחקר בלבד ואינם מהווים ייעוץ פיננסי.</div>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "AI-MarketPulse-Report.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Merge the three equity curves, down-sampled for a clean chart
  const chartData = (() => {
    if (!result) return [];
    const curve = result.strategyResult.equityCurve as { date: string; value: number }[];
    const step = Math.max(1, Math.ceil(curve.length / 160));
    const rows: any[] = [];
    for (let i = 0; i < curve.length; i += step) {
      rows.push({
        date: curve[i].date,
        "אסטרטגיה": curve[i].value,
        "Buy & Hold": result.buyAndHoldResult.equityCurve[i]?.value,
        "DCA": result.dcaResult.equityCurve[i]?.value
      });
    }
    return rows;
  })();

  const statCards = result
    ? [
        { key: "strategy", label: result.strategyResult.strategyNameHe, r: result.strategyResult, accent: "text-amber-500", dot: "bg-amber-500" },
        { key: "bh", label: "קנה והחזק (Buy & Hold)", r: result.buyAndHoldResult, accent: "text-slate-300", dot: "bg-slate-500" },
        { key: "dca", label: "השקעה מחזורית (DCA)", r: result.dcaResult, accent: "text-emerald-400", dot: "bg-emerald-500" }
      ]
    : [];

  return (
    <div className="space-y-6 dir-rtl" style={{ direction: "rtl" }}>

      {/* Controls */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-amber-500" />
          <h3 className="text-md font-bold text-white font-sans flex items-center gap-1.5">סימולטור בקטסטינג על נתונים אמיתיים (2020–היום) <InfoTip text="מבחן 'מכונת זמן': המערכת לוקחת $10,000 ומריצה את אסטרטגיית המסחר שבחרת על מחירי הביטקוין ההיסטוריים האמיתיים, יום-אחר-יום, כדי לראות כמה היית מרוויח או מפסיד בפועל — כולל עמלות (0.1%) והחלקה." /></h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mb-5 font-sans">
          הרצת אסטרטגיית מסחר על נתוני הביטקוין ההיסטוריים האמיתיים, בהשוואה ל-Buy &amp; Hold ול-DCA.
          כולל עמלות (0.1%) והחלקה (Slippage). ההון ההתחלתי: $10,000.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[11px] text-slate-400 mb-1.5 font-sans flex items-center gap-1">אסטרטגיה <InfoTip text="כלל המסחר שנבדק. למשל 'מודל משולב' קונה/מוכר לפי התחזית של 4 המודלים יחד; 'קניית שפל' קונה כש-RSI נמוך. כל אסטרטגיה = היגיון מתי לקנות ומתי למכור." /></label>
            <select
              value={strategyId}
              onChange={(e) => setStrategyId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-xl px-3 py-2.5 font-sans focus:border-amber-500 outline-none cursor-pointer"
            >
              {STRATEGIES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-slate-400 mb-1.5 font-sans flex items-center gap-1">תקופת בדיקה <InfoTip text="מאיזו שנה להתחיל את הסימולציה ועד היום. 'מ-2022' עובר דרך ההתרסקות וההתאוששות של 2022; 'מ-2020' כולל את כל המחזור האחרון. תקופה ארוכה יותר = מבחן קשה יותר." /></label>
            <div className="flex gap-2">
              {START_DATES.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setStartDate(d.value)}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-sans ${
                    startDate === d.value
                      ? "bg-slate-800 text-amber-400 border border-slate-700/50"
                      : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={runBacktest}
          disabled={loading}
          className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer font-sans ${
            loading
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-500/10"
          }`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {loading ? "מריץ סימולציה על נתונים אמיתיים..." : "הרץ בקטסט"}
        </button>

        {error && (
          <div className="mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statCards.map((c) => (
              <div key={c.key} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`}></span>
                  <span className="text-xs font-bold text-slate-200 font-sans">{c.label}</span>
                </div>
                <div className={`text-2xl font-mono font-bold mb-3 flex items-center gap-1.5 ${c.r.totalReturn >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {c.r.totalReturn >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  {fmtPct(c.r.totalReturn)}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] font-mono">
                  <div className="flex justify-between"><span className="text-slate-500">שנתי</span><span className="text-slate-200">{fmtPct(c.r.annualizedReturn)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 flex items-center gap-1">Max DD <InfoTip text="הירידה הגדולה ביותר מהשיא לשפל במהלך התקופה. מודד 'כמה כואב' היה להחזיק את התיק — דרודאון של 67% אומר שבשלב מסוים התיק ירד ב-67% מהשיא שלו." /></span><span className="text-rose-400">-{c.r.maxDrawdown}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 flex items-center gap-1">Sharpe <InfoTip text="מדד תשואה מול סיכון: כמה תשואה קיבלת על כל יחידת תנודתיות. מעל 1 = טוב, מתחת ל-0.5 = חלש. מאפשר להשוות אסטרטגיות בהוגנות — לא רק לפי התשואה אלא גם לפי הסיכון שלקחת." /></span><span className={`${c.accent}`}>{c.r.sharpeRatio}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">עסקאות</span><span className="text-slate-200">{c.r.numTrades}</span></div>
                </div>
              </div>
            ))}
          </div>

          {/* Equity curve */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-md font-bold text-white mb-1 font-sans">עקומת הון (Equity Curve)</h3>
            <p className="text-xs text-slate-400 mb-5 font-sans">שווי תיק של $10,000 לאורך תקופת הבדיקה.</p>
            <div className="h-80 w-full font-mono text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: "#64748b", fontSize: 10 }} minTickGap={40} />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "12px", fontSize: 12, textAlign: "right" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                    formatter={(v: any) => `$${Number(v).toLocaleString("he-IL")}`}
                  />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="אסטרטגיה" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Buy & Hold" stroke="#64748b" strokeWidth={1.8} dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="DCA" stroke="#10b981" strokeWidth={1.8} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Gemini AI Report */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h3 className="text-md font-bold text-white flex items-center gap-2 font-sans">
              <Sparkles className="w-5 h-5 text-amber-500" />
              דוח מחקרי אוטומטי
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed font-sans">
              ניתוח אקדמי של מצב השוק, המודלים ותוצאות הבקטסט — נוצר אוטומטית מהנתונים האמיתיים של המערכת.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {report && (
              <button
                onClick={downloadReport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-sans bg-slate-800 text-amber-400 border border-slate-700/50 hover:bg-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                הורד דוח
              </button>
            )}
            <button
              onClick={generateReport}
              disabled={reportLoading || !data}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer font-sans ${
                reportLoading || !data
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:opacity-90 shadow-md shadow-amber-500/10"
              }`}
            >
              {reportLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              {reportLoading ? "מנתח ומחבר דוח..." : "צור דוח"}
            </button>
          </div>
        </div>

        {reportError && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs px-4 py-3 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold block mb-0.5">לא ניתן לייצר דוח</span>
              <span className="text-rose-400/90">{reportError}</span>
            </div>
          </div>
        )}

        {report && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 text-right max-h-[480px] overflow-y-auto">
            {renderMarkdown(report)}
          </div>
        )}

        {!report && !reportError && !reportLoading && (
          <div className="text-center text-slate-500 text-xs py-8 font-sans">
            לחץ על "צור דוח" כדי לקבל ניתוח אקדמי מלא. {!result && "(מומלץ להריץ בקטסט קודם)"}
          </div>
        )}
      </div>
    </div>
  );
}
