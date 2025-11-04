// api/tgju.js  -- free live gold price from AccessBan API
import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const r = await fetch('https://api.accessban.com/v1/data/sana/json');
    const j = await r.json();

    // استخراج قیمت طلا و سکه از داده‌ی برگردانده‌شده
    const gold18 = j?.sana?.find(item => item.slug === 'geram18')?.p || '---';
    const coin = j?.sana?.find(item => item.slug === 'coin_old')?.p || '---';
    const dollar = j?.sana?.find(item => item.slug === 'usd')?.p || '---';

    const data = {
      source: 'accessban.com',
      gold_18_per_gram: gold18 + ' تومان',
      coin_full: coin + ' تومان',
      dollar: dollar + ' تومان',
      timestamp: new Date().toISOString()
    };

    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
    res.status(200).json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات قیمت' });
  }
}
