import React from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Activity, 
  DollarSign, 
  Compass, 
  ShieldAlert, 
  Layers, 
  Coins 
} from "lucide-react";
import { HelpCircle } from "lucide-react";
import { motion } from "motion/react";
import { MarketAnalysisResponse } from "../types";

interface MarketStatusProps {
  data: MarketAnalysisResponse | null;
  loading: boolean;
}

// Small help icon with a hover tooltip explaining an indicator in plain language
function InfoTip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group align-middle">
      <HelpCircle className="w-3 h-3 text-slate-600 hover:text-amber-400 cursor-help" />
      <span
        className="pointer-events-none absolute bottom-full right-0 mb-1.5 w-52 bg-slate-950 border border-slate-700 text-slate-300 text-[10px] font-normal leading-relaxed rounded-lg p-2.5 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl text-right"
        style={{ direction: "rtl" }}
      >
        {text}
      </span>
    </span>
  );
}

export default function MarketStatus({ data, loading }: MarketStatusProps) {
  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl min-h-[400px]">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 text-sm font-sans">טוען נתוני שוק וספר פקודות של פולימרקט...</p>
      </div>
    );
  }

  const { currentData, polymarketBook } = data;
  
  // Calculate real daily price change dynamically from actual historical data
  const yesterday = data.historicalData && data.historicalData.length >= 2 
    ? data.historicalData[data.historicalData.length - 2] 
    : null;
  const todayPrice = currentData.price;
  const yesterdayPrice = yesterday ? yesterday.price : todayPrice;
  const priceChange = yesterdayPrice > 0 
    ? parseFloat((((todayPrice - yesterdayPrice) / yesterdayPrice) * 100).toFixed(2)) 
    : 0;

  // Determine market sentiment
  const isBtcBullish = currentData.price > currentData.ma150;
  const isFearGreedGreedy = currentData.fearGreed > 70;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 dir-rtl" style={{ direction: "rtl" }}>
      
      {/* 1. Core Bitcoin Indicators */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Header Summary */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs text-emerald-400 font-mono tracking-wider font-semibold">חיבור פעיל למדדי שוק</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="font-mono text-amber-500">${currentData.price.toLocaleString("he-IL")}</span>
              <span className="text-sm font-medium text-slate-400">BTC/USD</span>
            </h1>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-slate-850 border border-slate-800 px-4 py-2.5 rounded-xl text-center min-w-[110px]">
              <span className="text-xs text-slate-400 block mb-1">שינוי 24ש׳</span>
              <span className={`font-mono font-bold flex items-center justify-center gap-1 ${priceChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {priceChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {priceChange >= 0 ? `+${priceChange}%` : `${priceChange}%`}
              </span>
            </div>

            <div className="bg-slate-850 border border-slate-800 px-4 py-2.5 rounded-xl text-center min-w-[110px]">
              <span className="text-xs text-slate-400 block mb-1">מחזור יומי</span>
              <span className="text-slate-200 font-mono font-bold block text-sm">
                ${(currentData.volume / 1e9).toFixed(2)}B
              </span>
            </div>
          </div>
        </div>

        {/* Technical Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          
          {/* RSI */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">מתנד עוצמה יחסית RSI <InfoTip text="מד שמראה אם המטבע 'נמכר או נקנה יותר מדי'. מעל 70 = יקר, אולי לפני ירידה; מתחת 30 = זול, אולי לפני עלייה; סביב 50 = מאוזן." /></span>
              <Activity className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{currentData.rsi}</div>
            <div className="mt-2 w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${currentData.rsi > 70 ? 'bg-red-500' : currentData.rsi < 30 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                style={{ width: `${currentData.rsi}%` }}
              ></div>
            </div>
            <div className="text-[10px] text-slate-400 mt-1.5">
              {currentData.rsi > 70 ? "קניית יתר (סיכון מוגבר)" : currentData.rsi < 30 ? "מכירת יתר (הזדמנות קנייה)" : "ניטרלי"}
            </div>
          </div>

          {/* Fear & Greed */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">פחד ותאוות בצע <InfoTip text="מודד את רגש השוק מ-0 (פחד קיצוני) עד 100 (חמדנות קיצונית). פחד גדול לרוב מסמן הזדמנות קנייה; חמדנות גדולה מסמנת סיכון." /></span>
              <Compass className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{currentData.fearGreed}</div>
            <div className="mt-2 w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${currentData.fearGreed > 75 ? 'bg-emerald-500' : currentData.fearGreed < 25 ? 'bg-red-500' : 'bg-amber-500'}`} 
                style={{ width: `${currentData.fearGreed}%` }}
              ></div>
            </div>
            <div className="text-[10px] text-slate-400 mt-1.5 font-sans">
              {currentData.fearGreed > 75 ? "תאוות בצע קיצונית" : currentData.fearGreed < 25 ? "פחד קיצוני (היסטורית תמיכה)" : "חמדנות מתונה"}
            </div>
          </div>

          {/* ETF IBIT inflows */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl col-span-2 md:col-span-1">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">תזרים קונים נטו (Net Taker Flow) <InfoTip text="כמה כסף נכנס באגרסיביות לקנייה לעומת מכירה ב-24 שעות. חיובי = הקונים שולטים (לחץ עלייה); שלילי = המוכרים שולטים (לחץ ירידה)." /></span>
              <Coins className="w-4 h-4 text-amber-500" />
            </div>
            <div className={`text-2xl font-bold font-mono ${currentData.ibitFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {currentData.ibitFlow >= 0 ? `+$${currentData.ibitFlow}M` : `-$${Math.abs(currentData.ibitFlow)}M`}
            </div>
            <div className="text-[10px] text-slate-400 mt-3 font-sans">
              לחץ קנייה/מכירה אגרסיבי אמיתי (Binance)
            </div>
          </div>

          {/* Moving Average 50 */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 mb-1 flex items-center gap-1">ממוצע נע 50 ימים (MA50) <InfoTip text="מחיר ממוצע של 50 הימים האחרונים. אם המחיר מעל הקו = מגמה קצרת-טווח חיובית; מתחת = שלילית." /></span>
            <div className="text-lg font-bold text-slate-200 font-mono">${currentData.ma50.toLocaleString("he-IL")}</div>
            <span className={`text-[10px] ${currentData.price > currentData.ma50 ? 'text-emerald-400' : 'text-red-400'} mt-1 block`}>
              {currentData.price > currentData.ma50 ? "↑ מעל הממוצע (חיובי)" : "↓ מתחת לממוצע (שלילי)"}
            </span>
          </div>

          {/* Moving Average 150 */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 mb-1 flex items-center gap-1">ממוצע נע 150 ימים (MA150) <InfoTip text="מחיר ממוצע של 150 הימים האחרונים — מדד מגמה ארוך-טווח. המחיר מעליו = תמיכה; מתחתיו = התנגדות." /></span>
            <div className="text-lg font-bold text-slate-200 font-mono">${currentData.ma150.toLocaleString("he-IL")}</div>
            <span className={`text-[10px] ${currentData.price > currentData.ma150 ? 'text-emerald-400' : 'text-red-400'} mt-1 block`}>
              {currentData.price > currentData.ma150 ? "↑ מעל הממוצע (תמיכה חזקה)" : "↓ מתחת לממוצע (התנגדות)"}
            </span>
          </div>

          {/* Volatility GARCH */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">תנודתיות שנתית (GARCH) <InfoTip text="כמה המחיר 'קופץ' (תנודתיות צפויה לשנה). גבוה = תנודות חדות וסיכון גבוה; נמוך = יציב יותר." /></span>
              <Layers className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-lg font-bold text-white font-mono">{currentData.garchVol}%</div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {currentData.garchVol > 50 ? "תנודתיות גבוהה" : "תנודתיות נמוכה/ממוצעת"}
            </span>
          </div>

        </div>

        {/* Top 100 Whales Betting Logs */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-md font-bold text-white">ניטור עסקאות בעלי הון (Polymarket Whales)</h3>
              <p className="text-xs text-slate-400">6 העסקאות הגדולות ביותר שבוצעו בפולימרקט ב-24 השעות האחרונות</p>
            </div>
            <span className="bg-slate-800 text-slate-300 font-mono text-[10px] px-2 py-1 rounded font-bold border border-slate-700/50">Top 100 Bettors</span>
          </div>

          <div className="space-y-3">
            {polymarketBook.whaleBets.map((bet, idx) => (
              <div 
                key={idx} 
                className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${bet.side === "YES" ? "bg-emerald-500" : "bg-red-500"}`}></div>
                  <div>
                    <span className="text-xs font-mono font-semibold text-slate-300 block">{bet.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{bet.address}</span>
                  </div>
                </div>

                <div className="text-left font-mono">
                  <span className="text-sm font-bold text-white block">
                    ${bet.amount.toLocaleString("he-IL")}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    הימור {bet.side === "YES" ? "עלייה" : "ירידה"} בשער ${(bet.probability).toFixed(2)}
                  </span>
                </div>
                
                <div className="text-xs text-slate-400 font-mono">
                  {bet.timestamp}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 2. Polymarket Order Book Panel */}
      <div className="space-y-6">
        
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col h-full justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 bg-slate-800 border border-slate-700/50 px-3 py-1.5 rounded-lg w-fit">
              <span className={`text-[11px] font-bold ${polymarketBook.isRealApi ? "text-amber-400" : "text-slate-400"}`}>
                {polymarketBook.isRealApi ? "Polymarket CLOB API · חי" : "אומדן Polymarket (לא נגיש)"}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-250 mb-4 leading-relaxed">
              {`שוק: ${polymarketBook.title}`}
            </h3>

            {/* Implied probability display */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-center mb-6">
              <span className="text-xs text-slate-400 mb-1 flex items-center justify-center gap-1">הסתברות מרומזת (Yes) בפולימרקט <InfoTip text="ההסתברות שמהמרים אמיתיים בפולימרקט נותנים לאירוע. למשל 35% = השוק מעריך 35% סיכוי שזה יקרה." /></span>
              <div className="text-4xl font-bold text-amber-500 font-mono mb-1">{polymarketBook.impliedProbability}%</div>
              <p className="text-[10px] text-slate-400">הסכמה כללית של שוק הניחושים הבינלאומי</p>
            </div>

            {/* Bids & Asks Table */}
            <div className="space-y-4">
              <div className="flex justify-between text-xs text-slate-400 border-b border-slate-800 pb-2 font-semibold">
                <span>קונים (Bids) · YES ¢</span>
                <span>מוכרים (Asks) · YES ¢</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                {/* Bids side */}
                <div className="space-y-1.5 border-l border-slate-800 pl-2">
                  {polymarketBook.bids.map((bid, i) => (
                    <div key={i} className="flex justify-between items-center text-emerald-400 bg-emerald-950/10 p-1.5 rounded">
                      <span>${bid.price.toFixed(2)}</span>
                      <span className="text-slate-400 text-[10px]">
                        {Math.round(bid.size).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Asks side */}
                <div className="space-y-1.5">
                  {polymarketBook.asks.map((ask, i) => (
                    <div key={i} className="flex justify-between items-center text-red-400 bg-red-950/10 p-1.5 rounded">
                      <span>${ask.price.toFixed(2)}</span>
                      <span className="text-slate-400 text-[10px]">
                        {Math.round(ask.size).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-800 pt-4">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>נפח מסחר 24ש׳ (Polymarket)</span>
              <span className="font-mono font-bold text-white">
                ${(polymarketBook.volume24h / 1e6).toFixed(2)}M
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400 mt-2">
              <span>מקור ספר הפקודות</span>
              <span className={`font-bold font-sans ${polymarketBook.isRealApi ? "text-amber-500" : "text-slate-400"}`}>
                {polymarketBook.apiSource || "סימולציית פולימרקט"}
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
