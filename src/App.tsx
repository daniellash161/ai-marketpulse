import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Brain, 
  Cpu, 
  Layers, 
  Activity, 
  Settings 
} from "lucide-react";
import { ServerCrash, RefreshCw, FlaskConical } from "lucide-react";
import { motion } from "motion/react";
import { MarketAnalysisResponse, EnsembleWeights } from "./types";
import MarketStatus from "./components/MarketStatus";
import ModelComparison from "./components/ModelComparison";
import Backtester from "./components/Backtester";

export default function App() {
  const [marketData, setMarketData] = useState<MarketAnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("market");

  const fetchMarketStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/market-status");
      if (!response.ok) throw new Error(`Server responded with ${response.status}`);
      const data = await response.json();
      setMarketData(data);
    } catch (e) {
      console.error("Failed to load market data", e);
      setError("טעינת נתוני השוק נכשלה. ודא שהשרת פעיל ונסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketStatus();
  }, []);

  const handleWeightOptimize = (optimizedWeights: EnsembleWeights) => {
    if (!marketData) return;
    // Re-trigger server-side prediction with optimized weights
    setMarketData({
      ...marketData,
      optimizedWeights
    });
  };

  const renderActiveTabContent = () => {
    if (error && !loading) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-rose-500/30 rounded-2xl min-h-[400px] text-center dir-rtl" style={{ direction: "rtl" }}>
          <div className="bg-rose-500/10 text-rose-400 p-3 rounded-xl mb-4">
            <ServerCrash className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1 font-sans">שגיאה בטעינת הנתונים</h3>
          <p className="text-sm text-slate-400 mb-5 font-sans max-w-md">{error}</p>
          <button
            onClick={fetchMarketStatus}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer font-sans"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            נסה שוב
          </button>
        </div>
      );
    }
    switch (activeTab) {
      case "market":
        return <MarketStatus data={marketData} loading={loading} />;
      case "models":
        return <ModelComparison data={marketData} loading={loading} onOptimize={handleWeightOptimize} />;
      case "backtest":
        return <Backtester data={marketData} />;
      default:
        return <MarketStatus data={marketData} loading={loading} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* 1. Global Navigation / Header Bar */}
      <header className="bg-slate-900/50 border-b border-slate-800 sticky top-0 z-50 shadow-lg backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo & Academic Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 font-black italic shadow-md shadow-amber-500/20">
              B
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
                AI MarketPulse
                <span className="text-xs bg-slate-800 text-slate-400 border border-slate-700/50 px-2 py-0.5 rounded font-mono">v1.4</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-sans">מערכת מתקדמת לניתוח שוק וניבוי מחירים באמצעות בינה מלאכותית</p>
            </div>
          </div>

          {/* Tab Navigation Menu */}
          <nav className="flex bg-slate-950/80 border border-slate-800 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab("market")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "market" ? 'bg-slate-800 text-amber-400 border border-slate-700/50' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Activity className="w-3.5 h-3.5" />
              מצב שוק ופולימרקט
            </button>
            <button
              onClick={() => setActiveTab("models")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "models" ? 'bg-slate-800 text-amber-400 border border-slate-700/50' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Cpu className="w-3.5 h-3.5" />
              השוואת מודלים ומשקלים
            </button>
            <button
              onClick={() => setActiveTab("backtest")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "backtest" ? 'bg-slate-800 text-amber-400 border border-slate-700/50' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              בקטסטינג ודוח AI
            </button>
          </nav>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dynamic Disclaimer */}
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mb-6 flex items-start gap-3 text-right animate-fade-in" style={{ direction: "rtl" }}>
          <div className="bg-amber-500/20 p-2 rounded-lg text-amber-400 shrink-0">
            <Settings className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-300">הבהרה ודיסקליימר</h4>
            <p className="text-[11px] text-amber-400/90 mt-0.5 leading-relaxed font-sans">
              הנתונים, מודלי למידת המכונה, וספרי הפקודות של פולימרקט במערכת זו נועדו למחקר ואנליזה סטטיסטית בלבד, ואינם מהווים בשום אופן המלצה או ייעוץ פיננסי.
            </p>
          </div>
        </div>

        {/* Render Tab Contents with clean transitions */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="min-h-[500px]"
        >
          {renderActiveTabContent()}
        </motion.div>

      </main>

      {/* 3. Academic Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-500 font-sans">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 AI MarketPulse - פרויקט מתקדם בלמידת מכונה וניתוח שווקים.</p>
        </div>
      </footer>

    </div>
  );
}
