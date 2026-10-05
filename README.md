# AI MarketPulse

An academic prototype for exploring Bitcoin market data, comparing forecasting approaches, and visualizing historical strategy simulations.

The project brings data collection, indicator calculation, model evaluation, and an interactive dashboard into one application. Its results are exploratory and do not establish a reliable trading advantage.

## What the Application Includes

- Market data collection and technical indicators.
- Interactive views for market conditions and model comparison.
- Chronological training and test splits.
- Hyperparameter search for selected models.
- Feature ablation experiments to examine the contribution of individual inputs.
- Weighted combinations of model predictions.
- Historical strategy simulations with transaction-cost assumptions.
- A locally generated report built from application data and predefined text.

## Modeling Approaches

The models are implemented in TypeScript:

| Approach | Implementation |
| --- | --- |
| Recurrent classifier | A small Elman RNN trained to predict price direction |
| Gradient boosting | A custom classifier using boosted decision stumps |
| Autoregression | A custom ARIMA(2,1,0)-style implementation |
| Trend and seasonality | A simplified additive model inspired by Prophet |
| Ensemble | A weighted combination of model outputs |

The gradient-boosting and additive models are custom implementations, not the official XGBoost or Prophet libraries. Some internal identifiers retain earlier model names, including `lstm`, although the recurrent implementation is an Elman RNN.

## Data and Processing

The application retrieves Bitcoin price and volume data from Binance, sentiment data from alternative.me, and current market information from Polymarket.

Processing includes moving averages, RSI, volatility estimates, and transaction-flow features.

Not all inputs are direct historical observations:

- Historical Polymarket probabilities are calculated proxies.
- Missing sentiment observations can be replaced with price-derived estimates.
- The field named `ibitFlow` represents Binance net taker flow, not observed IBIT ETF flows.

These distinctions matter when interpreting model inputs and results.

## Evaluation and Limitations

The code includes chronological evaluation, selected hyperparameter searches, and comparisons across forecast horizons. However, the project does not provide a complete, validated benchmark demonstrating that the ensemble outperforms the strongest individual model.

Important limitations include:

- Hyperparameter optimization does not cover every model.
- A systematic training-versus-test comparison is needed to assess overfitting.
- Directional accuracy around 50% alone does not establish useful predictive performance. Results need comparison with appropriate baselines, including the observed class balance.
- When insufficient history precedes a selected backtest start date, the fallback training window can overlap the simulation period.
- Some forecast curves and probability outputs use simplified transformations and should not be interpreted as calibrated estimates.
- External data availability can affect application behavior.

Historical simulations are exploratory and are not evidence of future investment performance.

## Technology

| Area | Tools |
| --- | --- |
| Interface | React, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Server | Node.js, Express |
| Development | Vite, tsx |
| Production build | Vite, esbuild |

## Run Locally

Install Node.js and npm, then run:

```bash
git clone https://github.com/daniellash161/ai-marketpulse.git
cd ai-marketpulse
npm ci
npm run dev
```

Open the local address printed by the server. Internet access is required for external market-data requests.

The current report generator runs locally from application data and does not require a Gemini API key.

### Other Commands

```bash
npm run build
npm start
npm run lint
```

`npm run lint` runs the TypeScript check configured in this repository.

## Project Structure

- `app.ts`: data retrieval, indicators, modeling, evaluation, simulations, and API routes.
- `server.ts`: local development and standalone production server.
- `api/index.ts`: Vercel function entry point for the Express API.
- `src/App.tsx`: application layout and navigation.
- `src/components/`: market dashboard, model comparison, forecast charts, and backtesting interface.
- `src/types.ts`: shared data structures.
- `docs/`: project presentation materials.

## Project Context and Contribution

AI MarketPulse was submitted as a team academic project. Daniella Shemesh developed most of the application.

The project is retained as a learning prototype demonstrating data integration, custom modeling implementations, evaluation experiments, and visualization. Further development is not currently planned.

## Deploy on Vercel

The frontend and API must be deployed together. `vercel.json` builds the Vite frontend into `dist` and routes `/api/*` to the Express function in `api/index.ts`. Deploying only `dist` leaves the dashboard without its market-data API.

The API requires outbound access to Binance, alternative.me, and Polymarket. The function has a 60-second duration limit; verify `/api/market-status` returns JSON after deployment. A successful frontend build alone does not verify data availability. No provider credentials are required for these public endpoints.
