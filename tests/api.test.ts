import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import app from '../api/index';

test('serverless API reports upstream failure and recovers on retry', async () => {
  const realFetch = globalThis.fetch;
  let providerAvailable = false;
  // Generated candles are test fixtures only, never a production fallback.
  const candles = Array.from({ length: 400 }, (_, i) => {
    const price = 30000 + i * 20 + Math.sin(i / 7) * 500;
    return [Date.UTC(2024, 0, 1 + i), String(price), String(price), String(price), String(price), '10', 0, '1000000', 10, '5', '510000'];
  });
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith('http://127.0.0.1:')) return realFetch(input, init);
    if (url.includes('data-api.binance.vision')) {
      return providerAvailable ? Response.json(candles) : new Response('', { status: 503 });
    }
    if (url.includes('api.alternative.me')) return Response.json({ data: [] });
    if (url.includes('gamma-api.polymarket.com')) return Response.json([]);
    throw new Error(`Unexpected test request: ${url}`);
  };
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const failure = await fetch(`${base}/api/market-status`);
    assert.equal(failure.status, 500);
    assert.equal(typeof (await failure.json()).error, 'string');
    providerAvailable = true;
    const response = await fetch(`${base}/api/market-status`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /application\/json/);
    const body = await response.json();
    assert.equal(body.historicalData.length, 180);
    assert.equal(body.models.length, 4);
    assert(Number.isFinite(body.currentData.price));
    assert(body.forecast.length > 0);
    const invalidWeights = await fetch(`${base}/api/evaluate-custom-ensemble`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(invalidWeights.status, 400);
  } finally {
    globalThis.fetch = realFetch;
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
