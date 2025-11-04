// api/tgju.js
// Scraper version — no API key needed. Fetches from tgju.org directly.

import fetch from 'node-fetch';

function persianToLatinDigits(s){
  if(!s) return s;
  const map = {
    '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
    '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9','٬':','
  };
  return s.replace(/[۰-۹٠-٩٬]/g, ch => map[ch] ?? ch);
}

function cleanNumberString(s){
  if(!s) return null;
  let t = persianToLatinDigits(String(s));
  t = t.replace(/[^\d,]/g, '');
  return t || null;
}

export default async function handler(req, res){
  try{
    const r = await fetch('https://www.tgju.org/', { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RoniaGallery/1.0)' }});
    const html = await r.text();

    // Extract prices
    const goldMatch = html.match(/طلای(?:\s|&nbsp;)*18(?:\s|&nbsp;)*عیار[\s\S]{0,80}?([\d۰-۹٠-٩,٬]+)/u);
    const coinMatch = html.match(/سکه(?:\s|&nbsp;)*(?:امامی|بهار آزادی)[\s\S]{0,80}?([\d۰-۹٠-٩,٬]+)/u);

    const gold = goldMatch ? cleanNumberString(goldMatch[1]) : null;
    const coin = coinMatch ? cleanNumberString(coinMatch[1]) : null;

    const payload = {
      source: 'tgju-scrape',
      gold_18_per_gram: gold ? gold + ' تومان' : null,
      coin_full: coin ? coin + ' تومان' : null,
      timestamp: new Date().toISOString()
    };

    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20');
    res.status(200).json(payload);
  }catch(err){
    res.status(500).json({ error: 'خطای داخلی', detail: String(err) });
  }
}
