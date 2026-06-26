import React, { useState, useEffect } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from "recharts";
import { 
  Cpu, 
  Zap, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  Sparkles, 
  Sliders 
} from "lucide-react";
import { HelpCircle } from "lucide-react";
import { MarketAnalysisResponse, EnsembleWeights } from "../types";
import ForecastChart from "./ForecastChart";

interface ModelComparisonProps {
  data: MarketAnalysisResponse | null;
  loading: boolean;
  onOptimize: (weights: EnsembleWeights) => void;
}

// Plain-language explanation per model, shown in a hover tooltip
const MODEL_INFO: Record<string, string> = {
  lstm: "רשת נוירונים חוזרת (RNN) — לומדת רצפים. מסתכלת על רצף הימים האחרונים (מחיר, RSI, פולימרקט) ומנסה לזהות תבנית שמובילה לעלייה או ירידה.",
  xgboost: "עצי החלטה מועצמים (Gradient Boosting) — בונה הרבה 'כללי אם-אז' קטנים על המדדים (RSI, פחד/חמדנות, תזרים) ומשלב אותם לתחזית אחת חזקה.",
  arima: "מודל סטטיסטי קלאסי לסדרות זמן — מנבא את התשואה הבאה לפי התשואות של 2 הימים האחרונים (מומנטום מול חזרה לממוצע).",
  prophet: "מודל מגמה + עונתיות — מזהה את הכיוון הכללי (טרנד) ודפוסים שחוזרים (למשל לפי יום בשבוע) וממשיך אותם קדימה."
};

// Small help icon with a hover tooltip explaining a term in plain language
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

export default function ModelComparison({ data, loading, onOptimize }: ModelComparisonProps) {
  const [weights, setWeights] = useState<EnsembleWeights>({
    lstm: 0.25,
    xgboost: 0.25,
    arima: 0.25,
    prophet: 0.25
  });

  const [ensembleProb, setEnsembleProb] = useState<number>(50);
  const [ensemblePred, setEnsemblePred] = useState<'UP' | 'DOWN'>('UP');

  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainSuccess, setRetrainSuccess] = useState(false);

  // Per-model line visibility for the accuracy chart (click a legend chip to toggle)
  const ACC_MODELS = [
    { key: "M-LSTM", color: "#10b981" },
    { key: "XGBoost", color: "#f59e0b" },
    { key: "ARIMA", color: "#3b82f6" },
    { key: "Prophet", color: "#a855f7" }
  ];
  const [hiddenLines, setHiddenLines] = useState<Record<string, boolean>>({});
  const toggleLine = (k: string) => setHiddenLines(p => ({ ...p, [k]: !p[k] }));

  // Live meta-optimizer stats (replaced when the user re-runs the SGD training)
  const [metaStats, setMetaStats] = useState(data?.metaModelStats);
  // Re-sync only when the SERVER sends new meta stats (not when weights-only prop updates),
  // otherwise a retrain's fresh stats would be immediately overwritten.
  useEffect(() => { setMetaStats(data?.metaModelStats); }, [data?.metaModelStats]);

  const handleRetrain = async () => {
    setIsRetraining(true);
    setRetrainSuccess(false);
    try {
      const res = await fetch("/api/retrain-meta", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.metaModelStats) {
        setMetaStats(json.metaModelStats);          // fresh convergence curve + losses
        setWeights(json.optimizedWeights);          // newly optimized weights
        onOptimize(json.optimizedWeights);
        setRetrainSuccess(true);
        setTimeout(() => setRetrainSuccess(false), 4000);
      }
    } catch (e) {
      console.error("Retrain failed", e);
    } finally {
      setIsRetraining(false);
    }
  };

  // Load initial optimal weights if data is available
  useEffect(() => {
    if (data?.optimizedWeights) {
      setWeights(data.optimizedWeights);
    }
  }, [data]);

  // Recalculate ensemble prediction locally when weights change
  useEffect(() => {
    if (!data?.models) return;
    
    let totalW = 0;
    let upSum = 0;
    
    for (const model of data.models) {
      const w = weights[model.modelId] ?? 0.25;
      const prob = model.probability; // probability of going UP
      upSum += prob * w;
      totalW += w;
    }
    
    const avgProb = upSum / (totalW || 1);
    setEnsembleProb(Math.round(avgProb));
    setEnsemblePred(avgProb > 50 ? 'UP' : 'DOWN');
  }, [weights, data]);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl min-h-[400px]">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 text-sm font-sans">מנתח את ביצועי המודלים ומחשב מטריקות דיוק...</p>
      </div>
    );
  }

  const handleWeightChange = (modelId: string, val: number) => {
    setWeights(prev => ({
      ...prev,
      [modelId]: Math.round(val * 100) / 100
    }));
  };

  const handleAutoOptimize = () => {
    setWeights(data.optimizedWeights);
    onOptimize(data.optimizedWeights);
  };

  const getModelBadgeColor = (type: string) => {
    if (type === "ML") return "bg-slate-800 text-amber-400 border border-slate-700/50";
    return "bg-slate-800 text-slate-300 border border-slate-700/50";
  };

  // Real rolling out-of-sample accuracy (trailing-14 hit rate), computed on the server
  const getHistoricalAccuracyData = () => {
    if (!data?.accuracyHistory) return [];

    return data.accuracyHistory.map((point) => ({
      date: point.date,
      "מחיר ביטקוין": point.price,
      "M-LSTM": point.lstm,
      "XGBoost": point.xgboost,
      "ARIMA": point.arima,
      "Prophet": point.prophet
    }));
  };

  // Convert feature importances to recharts format
  const getChartData = (importance: { [key: string]: number }) => {
    return Object.entries(importance).map(([key, value]) => ({
      name: key,
      weight: value
    }));
  };

  // Calculate direct arbitrage gap
  const polymarketProbability = data.polymarketBook.impliedProbability;
  const arbitrageGap = ensembleProb - polymarketProbability;

  return (
    <div className="space-y-6 dir-rtl" style={{ direction: "rtl" }}>
      
      {/* Top Gaps and Arbitrage Block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Ensemble Summary */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="text-md font-bold text-white font-sans flex items-center gap-1.5">מודל משולב חכם (Ensemble ML Forecast) <InfoTip text="במקום לסמוך על מודל אחד, משקללים את התחזיות של כל 4 המודלים יחד. כל מודל מקבל 'משקל' לפי כמה דייק בעבר — וכך מתקבלת תחזית יציבה ומאוזנת יותר." /></h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4 font-sans">
              תחזית משוקללת המשלבת רשתות קשר (LSTM), עצי החלטה (XGBoost), ומודלים סטטיסטיים. 
              שנה את משקל המודלים למטה כדי לצפות בשינויים בזמן אמת.
            </p>

            <div className="flex items-center gap-6 bg-slate-950 border border-slate-800/80 p-4 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">כיוון התחזית</span>
                <span className={`text-xl font-bold flex items-center gap-1 ${ensemblePred === 'UP' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {ensemblePred === 'UP' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  {ensemblePred === 'UP' ? "עלייה (UP)" : "ירידה (DOWN)"}
                </span>
              </div>
              <div className="h-10 w-[1px] bg-slate-850"></div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">הסתברות משוקללת</span>
                <span className="text-2xl font-mono font-bold text-amber-500">{ensembleProb}%</span>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-450 font-sans">
            תחזית מבוססת משקלים נוכחיים לטווח של 7 ימים קדימה.
          </div>
        </div>

        {/* Arbitrage Opportunity Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Scale className="w-5 h-5 text-amber-500" />
              <h3 className="text-md font-bold text-white font-sans flex items-center gap-1.5">פער ארביטראז' (Polymarket Arbitrage Gap) <InfoTip text="הפער בין התחזית של המודל שלנו לבין מה שהשוק האמיתי (פולימרקט) מתמחר. פער גדול = אולי הזדמנות: או שהמודל יודע משהו שהשוק עוד לא, או להפך. בכפוף לעלויות ונזילות." /></h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4 font-sans">
              פערים בין הסתברות מודל ה-ML שלנו לבין שוק הניחושים של פולימרקט. 
              כשיש פער גבוה, נוצרת הזדמנות לנצל תמחור חסר בחוזים.
            </p>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">מודל ה-ML שלנו</span>
                <span className="text-lg font-mono font-bold text-white">{ensembleProb}%</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">פולימרקט (Polymarket)</span>
                <span className="text-lg font-mono font-bold text-amber-500">{polymarketProbability}%</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between bg-slate-950 px-3 py-2.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-300 font-sans">הפרש תמחור:</span>
            <span className={`text-sm font-mono font-bold ${Math.abs(arbitrageGap) > 10 ? 'text-amber-500 animate-pulse' : 'text-emerald-400'}`}>
              {arbitrageGap > 0 ? `מודל גבוה ב- +${arbitrageGap}%` : arbitrageGap < 0 ? `מודל נמוך ב- ${arbitrageGap}%` : 'שיווי משקל (0%)'}
            </span>
          </div>
        </div>

      </div>

      {/* Historical Accuracy vs Market Price Chart */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h3 className="text-md font-bold text-white flex items-center gap-1.5 font-sans">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              ביצועים היסטוריים מול מגמת השוק (Model Accuracy vs. BTC Price)
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed font-sans">
              ניתוח של אחוז הדיוק ההיסטורי במדגם נע (Sliding Window Accuracy של 14 ימים) של כל מודל לאורך זמן, המוצג בהשוואה ישירה לשינויים במחיר הביטקוין בפועל.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-slate-850 text-[11px] font-sans">
            <span className="text-[10px] text-slate-500">לחצו לסינון:</span>
            {ACC_MODELS.map((m) => (
              <button
                key={m.key}
                onClick={() => toggleLine(m.key)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all cursor-pointer text-slate-300 ${hiddenLines[m.key] ? 'opacity-40 line-through' : 'hover:bg-slate-800/70'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }}></span> {m.key}
              </button>
            ))}
            <span className="flex items-center gap-1.5 text-slate-400 px-2 py-1">
              <span className="w-3 h-0.5 border-t border-dashed border-slate-400"></span> מחיר ביטקוין
            </span>
          </div>
        </div>

        <div className="h-80 w-full font-mono text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={getHistoricalAccuracyData()} margin={{ top: 10, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis 
                yAxisId="accuracy" 
                orientation="left" 
                stroke="#f59e0b" 
                domain={[30, 95]} 
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={(v) => `${v}%`}
                label={{ value: 'אחוז דיוק חיזוי', angle: -90, position: 'insideLeft', offset: -5, fill: '#f59e0b', fontSize: 10 }}
              />
              <YAxis 
                yAxisId="price" 
                orientation="right" 
                stroke="#64748b" 
                domain={['auto', 'auto']}
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                label={{ value: 'מחיר ביטקוין (USD)', angle: 90, position: 'insideRight', offset: -5, fill: '#64748b', fontSize: 10 }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px', fontSize: 12, textAlign: 'right' }} 
                labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                formatter={(value: any, name: string) => {
                  if (name === "מחיר ביטקוין") return [`$${Number(value).toLocaleString("he-IL")}`, name];
                  return [`${value}%`, name];
                }}
              />
              {!hiddenLines["M-LSTM"] && <Line yAxisId="accuracy" type="monotone" dataKey="M-LSTM" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />}
              {!hiddenLines["XGBoost"] && <Line yAxisId="accuracy" type="monotone" dataKey="XGBoost" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />}
              {!hiddenLines["ARIMA"] && <Line yAxisId="accuracy" type="monotone" dataKey="ARIMA" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />}
              {!hiddenLines["Prophet"] && <Line yAxisId="accuracy" type="monotone" dataKey="Prophet" stroke="#a855f7" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />}
              <Line yAxisId="price" type="monotone" dataKey="מחיר ביטקוין" stroke="#475569" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Forward price forecast */}
      <ForecastChart data={data} />

      {/* Models Side-by-Side Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.models.map((model) => (
          <div key={model.modelId} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
            <div>
              {/* Card Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Cpu className="w-4 h-4 text-amber-500" />
                    <h4 className="text-sm font-bold text-white font-sans flex items-center gap-1">{model.modelName} <InfoTip text={MODEL_INFO[model.modelId] || ""} /></h4>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full ${getModelBadgeColor(model.type)}`}>
                    {model.type === "ML" ? "למידת מכונה עמוקה" : "סדרות עיתיות"}
                  </span>
                </div>

                <div className="text-left">
                  <span className={`text-xs font-bold block ${model.prediction === "UP" ? "text-emerald-400" : "text-red-400"}`}>
                    {model.prediction === "UP" ? "↑ עליה" : "↓ ירידה"}
                  </span>
                  <span className="text-xs text-slate-450 font-mono font-bold">{model.probability}%</span>
                </div>
              </div>

              {/* Statistical Metrics Table */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-center mb-2 font-mono text-xs">
                <div>
                  <span className="text-[9px] text-slate-500 block">דיוק (Acc)</span>
                  <span className="font-bold text-slate-200">{model.metrics.accuracy.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">רגישות (Rec)</span>
                  <span className="font-bold text-slate-200">{model.metrics.sensitivity.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">ציון F1</span>
                  <span className="font-bold text-amber-500">{model.metrics.f1Score.toFixed(3)}</span>
                </div>
              </div>

              {/* Quality Rating Badge */}
              <div className="mb-4 text-xs flex justify-between items-center bg-slate-950/60 border border-slate-850 px-3 py-1.5 rounded-lg">
                <span className="text-slate-400 font-sans text-[10px] flex items-center gap-1">רמת מהימנות מבוססת F1: <InfoTip text="F1 הוא ממוצע מאוזן של דיוק (Precision) ורגישות (Recall) — המדד הכי חשוב למודל מסחר, כי הוא 'מעניש' גם פספוס הזדמנויות וגם התראות שווא. מעל 0.6 = טוב, מתחת 0.45 = חלש." /></span>
                <span className={`font-sans font-bold text-[10px] px-2 py-0.5 rounded-full ${
                  model.metrics.f1Score >= 0.65 ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30" :
                  model.metrics.f1Score >= 0.55 ? "bg-green-950/40 text-green-400 border border-green-900/30" :
                  model.metrics.f1Score >= 0.45 ? "bg-amber-950/40 text-amber-400 border border-amber-900/30" :
                  "bg-rose-950/40 text-rose-400 border border-rose-900/30"
                }`}>
                  {model.metrics.f1Score >= 0.65 ? "מצוין (Excellent)" :
                   model.metrics.f1Score >= 0.55 ? "טוב מאוד (Very Good)" :
                   model.metrics.f1Score >= 0.45 ? "בינוני (Moderate)" : "חלש (Low)"}
                </span>
              </div>

              {/* Feature Importance Chart */}
              <div className="h-32 w-full mt-2">
                <span className="text-[10px] text-slate-400 block mb-1">משקל הפיצ'רים המשפיעים ביותר (חשיבות מבוססת-מודל)</span>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={getChartData(model.featureImportance)} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', fontSize: 11 }} />
                    <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                      {getChartData(model.featureImportance).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : index === 1 ? '#3b82f6' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quality Metrics & Validation Guide */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h3 className="text-md font-bold text-white mb-2 font-sans flex items-center gap-2">
          <Scale className="w-5 h-5 text-amber-500" />
          מתודולוגיית תיקוף והערכת איכות המדדים (Model Evaluation Methodology)
        </h3>
        <p className="text-xs text-slate-350 leading-relaxed mb-4">
          כחלק ממתודולוגיית התיקוף הקשיחה של המערכת, הנתונים ההיסטוריים מחולקים באופן קבוע ל-<strong>80% אימון (Train Set)</strong> ו-<strong>20% לבדיקה מחוץ למדגם (Out-of-Sample Test Set)</strong>. תהליך זה מבטיח כי כל מדדי האיכות שלפניך מבוססים על נתוני אמת שהמודל לא נחשף אליהם מעולם, ובכך נמנע לחלוטין כשל של התאמת-יתר (Overfitting).
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
            <h4 className="text-xs font-bold text-amber-500 mb-1.5 font-sans">דיוק כולל (Accuracy)</h4>
            <p className="text-[11px] text-slate-400 leading-normal font-sans">
              אחוז התחזיות הנכונות מתוך סך התחזיות הכולל. בשווקים פיננסיים רועשים, דיוק של מעל 54% נחשב להישג משמעותי שמספק תוחלת רווח חיובית לאורך זמן.
            </p>
          </div>
          
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
            <h4 className="text-xs font-bold text-amber-500 mb-1.5 font-sans">רגישות / Recall (Sensitivity)</h4>
            <p className="text-[11px] text-slate-400 leading-normal font-sans">
              היכולת של המודל לגלות ולאתר את כל עליות השער האמיתיות שהתרחשו בפועל. רגישות גבוהה מונעת מהסוחר לפספס הזדמנויות כניסה חיוביות לשוק.
            </p>
          </div>
          
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
            <h4 className="text-xs font-bold text-amber-500 mb-1.5 font-sans">ציון F1-Score (איזון הרמוני)</h4>
            <p className="text-[11px] text-slate-400 leading-normal font-sans">
              הממוצע ההרמוני של דיוק ורגישות. F1-Score הוא המדד החשוב ביותר להערכת מודלי מסחר, מכיוון שהוא מונע הטיות אופטימיות כשיש חוסר איזון במגמות השוק.
            </p>
          </div>
        </div>
      </div>

      {/* Machine Learning Meta-Optimizer Dashboard */}
      {metaStats && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h3 className="text-md font-bold text-white flex items-center gap-2 font-sans">
                <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                מודל אופטימיזציית מטא-למידה (SGD Ensemble Meta-Optimizer)
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed font-sans text-right dir-rtl">
                מודל למידת מכונה מסוג Stacked Regressor הלומד בצורה אקטיבית את משקלי ה-Ensemble האופטימליים. המודל מתאמן באמצעות אלגוריתם Stochastic Gradient Descent (SGD) על גבי ההיסטוריה מחוץ למדגם (Out-of-Sample predictions), במטרה למזער את פונקציית השגיאה הריבועית (MSE Loss) של תחזית העל הסופית.
              </p>
            </div>

            <button 
              onClick={handleRetrain}
              disabled={isRetraining}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shrink-0 ${
                isRetraining 
                ? "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed" 
                : "bg-amber-500 hover:bg-amber-600 text-slate-950 font-sans"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetraining ? 'animate-spin' : ''}`} />
              {isRetraining ? "מאמן מודל מחדש..." : "הפעל אימון מחדש (SGD)"}
            </button>
          </div>

          {retrainSuccess && (
            <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-2.5 rounded-xl text-right dir-rtl animate-bounce">
              ✓ אימון מחדש של מודל העל (Meta-Learner) הושלם בהצלחה! המשקלים האופטימליים עודכנו והוחלו אוטומטית.
            </div>
          )}

          {/* Training Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-right dir-rtl">
              <span className="text-[10px] text-slate-500 block font-sans">אלגוריתם אופטימיזציה</span>
              <span className="text-xs font-bold text-slate-200 mt-1 block font-sans">Stochastic Gradient Descent</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-right dir-rtl">
              <span className="text-[10px] text-slate-500 block font-sans">קצב למידה (Learning Rate)</span>
              <span className="text-xs font-mono font-bold text-amber-500 mt-1 block">{metaStats.learningRate}</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-right dir-rtl">
              <span className="text-[10px] text-slate-500 block font-sans">מחזורי אימון (Epochs)</span>
              <span className="text-xs font-mono font-bold text-amber-500 mt-1 block">{metaStats.epochs}</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-right dir-rtl">
              <span className="text-[10px] text-slate-500 block font-sans">שיפור בשגיאה ריבועית (MSE Loss)</span>
              <span className="text-xs font-mono font-bold text-emerald-400 mt-1 block flex items-center gap-1.5 justify-end">
                <span>{(metaStats.initialLoss).toFixed(4)}</span>
                <span className="text-slate-400">←</span>
                <span>{(metaStats.finalLoss).toFixed(4)}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Loss Convergence Chart */}
            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl">
              <span className="text-[11px] text-slate-400 font-bold block mb-3 font-sans text-right">גרף התכנסות השגיאה (SGD Loss Convergence Curve)</span>
              <div className="h-44 w-full font-mono text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metaStats.history} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="epoch" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} label={{ value: 'Epoch', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 9 }} />
                    <YAxis stroke="#f59e0b" domain={['auto', 'auto']} tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px', fontSize: 11 }} 
                      labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="loss" name="MSE Loss" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weights optimization trajectory */}
            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl">
              <span className="text-[11px] text-slate-400 font-bold block mb-3 font-sans text-right">מסלול למידת המשקלים (Weights Optimization Trajectory)</span>
              <div className="h-44 w-full font-mono text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metaStats.history} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="epoch" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis stroke="#94a3b8" domain={[0, 1]} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px', fontSize: 11 }} 
                      labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                      formatter={(v: any) => `${Math.round(Number(v) * 100)}%`}
                    />
                    <Line type="monotone" dataKey="weights.lstm" name="M-LSTM" stroke="#10b981" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="weights.xgboost" name="XGBoost" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="weights.arima" name="ARIMA" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="weights.prophet" name="Prophet" stroke="#a855f7" strokeWidth={1.5} dot={false} />
                    <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ensemble Weight Customizer Panel */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-md font-bold text-white flex items-center gap-1.5 font-sans">
              <Sliders className="w-5 h-5 text-amber-500" />
              מערכת כוונון משקלים דינמית (Ensemble Custom Weights)
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed font-sans">
              שנה ידנית את השפעת כל מודל על תחזית העלייה הסופית, או לחץ על אופטימיזציה אוטומטית לפי ביצועים היסטוריים.
            </p>
          </div>

          <button 
            onClick={handleAutoOptimize}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-md shadow-amber-500/10"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            אופטימיזציה אוטומטית
          </button>
        </div>

        <div className="space-y-5">
          {data.models.map((model) => {
            const wVal = weights[model.modelId] ?? 0.25;
            return (
              <div key={model.modelId} className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-200 font-sans">{model.modelName}</span>
                  <span className="text-xs font-mono font-bold text-amber-500">משקל: {Math.round(wVal * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={wVal}
                  onChange={(e) => handleWeightChange(model.modelId, parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>משקל אפסי (0%)</span>
                  <span>משקל מלא (100%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
