// api/tgju.js  -- Vercel serverless (Node.js 18+)
// Place this file under /api/tgju.js in your repo. Then set the environment variables in Vercel:
// TGJU_API_URL   (e.g. the TGJU endpoint provided to you)
// TGJU_API_KEY   (your API key)
// The function will call TGJU and normalize the response to JSON with fields:
// { gold_18_per_gram: "...", coin_full: "...", timestamp: "ISO string" }

import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const TGJU_API_URL = process.env.TGJU_API_URL;
    const TGJU_API_KEY = process.env.TGJU_API_KEY;

    if (!TGJU_API_URL || !TGJU_API_KEY) {
      // Fallback sample data (for testing without API keys)
      const now = new Date().toISOString();
      return res.status(200).json({
        source: 'sample',
        gold_18_per_gram: '2,700,000 تومان',
        coin_full: '35,500,000 تومان',
        timestamp: now
      });
    }

    const r = await fetch(TGJU_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${TGJU_API_KEY}`
      }
    });

    if (!r.ok) {
      return res.status(502).json({ error: 'منبع داده پاسخ مناسب نداد' });
    }

    const j = await r.json();

    // !!! IMPORTANT: Adjust parsing below according to the exact TGJU response structure you receive.
    // Example (pseudo): TGJU might return { data: { gold: {...}, coin: {...} } }
    // You must modify the lines below to extract correct values.
    let gold = null;
    let coin = null;
    let timestamp = new Date().toISOString();

    // Try some common shapes (you will likely need to adapt this)
    if (j && j.data) {
      if (j.data.gold && j.data.gold['18']) gold = j.data.gold['18'].price || null;
      if (j.data.coin && j.data.coin.full) coin = j.data.coin.full.price || null;
      if (j.timestamp) timestamp = j.timestamp;
    } else {
      // naive fallback: try top-level keys
      gold = j.gold_18_per_gram || j.gold || null;
      coin = j.coin_full || j.coin || null;
      if (j.timestamp) timestamp = j.timestamp;
    }

    // Normalize to strings
    const payload = {
      source: 'tgju',
      raw: j,
      gold_18_per_gram: gold ? String(gold) : null,
      coin_full: coin ? String(coin) : null,
      timestamp
    };

    // Short cache control to reduce TGJU load (adjust as allowed by your contract)
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
    res.status(200).json(payload);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'خطا در سرور' });
  }
}
