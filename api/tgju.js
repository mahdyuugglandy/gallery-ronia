// api/tgju.js
// Serverless function for Vercel/Netlify that scrapes tgju.org for prices (no API key needed).
// Deployment: Put this file under /api in your repo and deploy to Vercel (or Netlify Functions).
// NOTE: Scraping may break if tgju.org changes HTML structure. If that happens send me the JSON of the page and I'll update regex.

import fetch from 'node-fetch';

function persianToLatinDigits(s){
  if(!s) return s;
  const map = {
    '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
    '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
    '٬':','
  };
  return s.replace(/[۰-۹٠-٩٬]/g, ch => map[ch] ?? ch);
}

function cleanNumberString(s){
  if(!s) return null;
  let t = persianToLatinDigits(String(s));
  // remove non-digits except comma
  t = t.replace(/[^\d,]/g, '');
  // unify multiple commas
  t = t.replace(/,+/g, ',');
  // trim
  t = t.replace(/^,|,$/g, '');
  return t || null;
}

export default async function handler(req, res){
  try{
    const TGJU_URL = 'https://www.tgju.org/'; // scraping homepage
    const r = await fetch(TGJU_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RoniaGallery/1.0)' }});
    if(!r.ok) return res.status(502).json({ error: 'خطا در دریافت صفحهٔ مرجع' });
    const html = await r.text();

    // --- Try to extract "طلای 18 عیار" price ---
    // Examples seen on page: "طلای 18 عیار 104,432,000 (0.43%) ... ۱۸:۴۴:۴۵"
    let gold18 = null;
    let coinFull = null;

    // Pattern for "طلای 18 عیار" followed by number (Persian/Latin digits + commas)
    const goldRegex = /طلای(?:\s|&nbsp;)*18(?:\s|&nbsp;)*عیار[\s\S]{0,80}?([\d۰-۹٠-٩,٬]+)/u;
    const gmatch = html.match(goldRegex);
    if(gmatch && gmatch[1]) gold18 = cleanNumberString(gmatch[1]);

    // Try alternative pattern: "طلای 18 عیار" with html tags between words
    if(!gold18){
      const goldRegex2 = /طلای[\s\S]{0,20}?18[\s\S]{0,40}?عیار[\s\S]{0,60}?([0-9۰-۹٠-٩,٬]+)/u;
      const m2 = html.match(goldRegex2);
      if(m2 && m2[1]) gold18 = cleanNumberString(m2[1]);
    }

    // --- Try to extract main coin (سکه) like "سکه امامی" or "سکه بهار آزادی" ---
    // Look for common labels and the immediately following number
    const coinRegex = /(سکه(?:\s|&nbsp;)*(?:امامی|بهار آزادی|تمام|بهار))[^\d۰-۹٠-٩]{0,80}?([\d۰-۹٠-٩,٬]+)/u;
    const cmatch = html.match(coinRegex);
    if(cmatch && cmatch[2]) coinFull = cleanNumberString(cmatch[2]);

    // Fallback: try to find any "سکه" then a number later
    if(!coinFull){
      const coinRegex2 = /سکه[\s\S]{0,60}?([0-9۰-۹٠-٩,٬]{5,})/u;
      const c2 = html.match(coinRegex2);
      if(c2 && c2[1]) coinFull = cleanNumberString(c2[1]);
    }

    // If still null, try a more generic "قیمت زنده" table line (pattern observed: "طلای 18 عیار 104,432,000")
    if(!gold18){
      const generic = html.match(/قیمت\s*زنده[\s\S]{0,200}?طلای[\s\S]{0,80}?([0-9۰-۹٠-٩,٬]+)/u);
      if(generic && generic[1]) gold18 = cleanNumberString(generic[1]);
    }

    const timestamp = new Date().toISOString();

    // Normalize to readable strings (add thousands separators if needed)
    function prettyNumber(numStr){
      if(!numStr) return null;
      // remove commas that might already be present
      const compact = numStr.replace(/,/g,'');
      const n = parseInt(compact, 10);
      if(Number.isNaN(n)) return numStr;
      return n.toLocaleString('en-US'); // uses comma as thousands sep; front-end can append 'تومان'
    }

    const payload = {
      source: 'tgju-scrape',
      gold_18_per_gram_raw: gold18,
      gold_18_per_gram: gold18 ? prettyNumber(gold18) + ' تومان' : null,
      coin_full_raw: coinFull,
      coin_full: coinFull ? prettyNumber(coinFull) + ' تومان' : null,
      timestamp
    };

    // Cache short on edge (adjust if needed). This reduces number of requests to tgju.org.
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20');
    res.status(200).json(payload);
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'خطای داخلی تابع', detail: String(err) });
  }
}
