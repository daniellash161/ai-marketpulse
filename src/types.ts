export interface BitcoinDataPoint {
  date: string;
  price: number;
  volume: number;
  ma50: number;
  ma150: number;
  ma200: number;
  rsi: number;
  fearGreed: number;
  ibitFlow: number; // in Millions of USD
  polymarketProb: number; // Implied probability (0 to 100)
  garchVol: number; // Annualized volatility percentage
}

export interface ModelMetrics {
  accuracy: number;     // דיוק
  sensitivity: number;  // רגישות / Recall
  f1Score: number;      // ציון F1
}

export interface ModelPrediction {
  modelId: string;
  modelName: string;
  type: 'ML' | 'Time Series' | 'Baseline';
  prediction: 'UP' | 'DOWN';
  probability: number; // 0 to 100
  metrics: ModelMetrics;
  featureImportance: { [key: string]: number }; // Feature name to weight
  // Directional accuracy on the held-out test set per forecast horizon (days -> accuracy 0..1)
  horizonAccuracy?: { [horizonDays: string]: number };
}

// Hyperparameter tuning summary for one model (honest record of what was searched and chosen)
export interface ModelTuning {
  modelId: string;
  method: string;                                   // e.g. "Grid search on chronological validation split"
  searched: string;                                 // human-readable search space
  chosen: { [param: string]: number | string };     // the selected hyperparameters
  validationAccuracy: number;                       // directional accuracy (0..1) on the validation slice
  validationBrier?: number;                         // Brier score (lower is better) - the selection criterion
}

// Leave-one-out feature ablation: contribution of each feature on the validation slice
export interface FeatureAblationEntry {
  feature: string;              // display name (Hebrew)
  accuracyWithout: number;      // validation accuracy when this feature is removed (0..1)
  delta: number;                // fullAccuracy - accuracyWithout (positive = feature helps)
  brierWithout?: number;        // Brier score without the feature (lower is better)
  deltaBrier?: number;          // brierWithout - fullBrier (positive = feature helps)
}

export interface FeatureAblationReport {
  fullAccuracy: number;         // validation accuracy with all features (0..1)
  fullBrier?: number;           // Brier score with all features (lower is better)
  entries: FeatureAblationEntry[];
}

// Per-horizon evaluation context: sample count and the naive "always UP" baseline,
// i.e. the share of test samples whose price actually rose over that horizon.
export interface HorizonBaseline {
  samples: number;
  upShare: number;              // 0..1; accuracy of a model that always predicts UP
}

export interface EvaluationInfo {
  testSize: number;                                  // number of test-set points
  horizonBaseline: { [horizonDays: string]: HorizonBaseline };
}

export interface WhaleBet {
  address: string;
  name: string;
  amount: number; // in USD
  side: 'YES' | 'NO';
  probability: number; // Price of Yes contracts (e.g., $0.62)
  timestamp: string;
}

export interface OrderBookLevel {
  price: number; // e.g., 0.62 (meaning 62 cents per contract)
  size: number;  // volume of contracts
}

export interface PolymarketBook {
  title: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  impliedProbability: number; // Current consensus probability
  volume24h: number; // in USD
  whaleBets: WhaleBet[];
  isRealApi?: boolean;
  apiSource?: string;
}

export interface BacktestResult {
  strategyId: string;
  strategyName: string;
  strategyNameHe: string;
  totalReturn: number; // percentage
  annualizedReturn: number; // percentage
  maxDrawdown: number; // percentage
  sharpeRatio: number;
  winRate: number; // percentage
  numTrades: number;
  equityCurve: { date: string; value: number }[];
}

export interface EnsembleWeights {
  [modelId: string]: number; // weight from 0 to 1
}

export interface MetaModelEpoch {
  epoch: number;
  loss: number;
  weights: { [modelId: string]: number };
}

export interface MetaModelStats {
  epochs: number;
  learningRate: number;
  initialLoss: number;
  finalLoss: number;
  history: MetaModelEpoch[];
  optimizedWeights: EnsembleWeights;
}

export interface MarketAnalysisResponse {
  currentData: BitcoinDataPoint;
  historicalData: BitcoinDataPoint[];
  models: ModelPrediction[];
  polymarketBook: PolymarketBook;
  optimizedWeights: EnsembleWeights;
  ensemblePrediction: {
    prediction: 'UP' | 'DOWN';
    probability: number;
  };
  metaModelStats?: MetaModelStats;
  accuracyHistory?: ModelAccuracyPoint[];
  forecast?: ForecastPoint[];
  tuning?: ModelTuning[];
  featureAblation?: FeatureAblationReport;
  evaluationInfo?: EvaluationInfo;
}

export interface ForecastPoint {
  date: string;
  price: number | null;     // historical actual (null in the forecast region)
  lstm: number | null;
  xgboost: number | null;
  arima: number | null;
  prophet: number | null;
  ensemble: number | null;
  lower: number | null;     // uncertainty band
  upper: number | null;
}

export interface ModelAccuracyPoint {
  date: string;
  price: number;
  lstm: number;    // trailing-window accuracy %
  xgboost: number;
  arima: number;
  prophet: number;
}
