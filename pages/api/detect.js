// pages/api/detect.js
import cheerio from 'cheerio';

const FETCH_TIMEOUT = 15000; // 15s

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'Missing url in request body' });

  // normalize
  const target = url.includes('://') ? url : 'https://' + url;

  // Abort controller for timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const r = await fetch(target, {
      headers: { 'User-Agent': 'ThemeSpot/1.0 (+https://yourdomain.example)' },
      redirect: 'follow',
      signal: controller.signal
    }).catch(err => {
      // fetch rejected (e.g. aborted)
      throw new Error('Fetch failed: ' + (err && err.message ? err.message : String(err)));
    });
    clearTimeout(timeout);

    if (!r) throw new Error('Fetch returned no response object');
    if (!r.ok) {
      const txt = await r.text().catch(()=>'<no body>');
      throw new Error(`Target returned HTTP ${r.status} - ${r.statusText}. Body: ${txt.slice(0,200)}`);
    }

    const html = await r.text().catch(err => {
      throw new Error('Unable to read response body: ' + err.message);
    });

    if (!html || typeof html !== 'string') {
      throw new Error('Fetched body is empty or not text');
    }

    // Defensive: ensure cheerio is available
    if (!cheerio || typeof cheerio.load !== 'function') {
      throw new Error('Cheerio not available in runtime');
    }

    const $ = cheerio.load(html);

    let evidence = [];
    let isShopify = false;
    let themeName = null;

    // 1) Search inline scripts for window.Shopify.theme
    const scriptsText = $('script')
      .map((i, el) => $(el).html())
      .get()
      .filter(Boolean)
      .join('\n');

    const m = scriptsText.match(/Shopify\.theme\s*=\s*({[\s\S]*?})/);
    if (m) {
      // try parse
      try {
        const parsed = JSON.parse(m[1]);
        isShopify = true;
        themeName = parsed.name || parsed.theme_name || parsed.id || parsed.role || themeName;
        evidence.push('window.Shopify.theme (inline script)');
      } catch (e) {
        evidence.push('window.Shopify.theme (found but not JSON-parseable)');
      }
    }

    // 2) look for /themes/<handle>/ in assets
    const assets = $('link[href], script[src], img[src]')
      .map((i, el) => $(el).attr('href') || $(el).attr('src'))
      .get()
      .filter(Boolean);

    const themeAsset = assets.find(u => /\/themes\/([^\/]+)\//i.test(u));
    if (themeAsset) {
      isShopify = true;
      const handle = themeAsset.match(/\/themes\/([^\/]+)\//i)[1];
      themeName = themeName || handle;
      evidence.push('asset URL contains /themes/: ' + themeAsset);
    }

    // 3) settings_data.json hint
    const settingsRef = assets.find(u => /settings_data\.json/i.test(u));
    if (settingsRef) {
      isShopify = true;
      evidence.push('settings_data.json: ' + settingsRef);
    }

    // respond
    return res.json({ isShopify, themeName, evidence });
  } catch (err) {
    // log the real error to Vercel logs (console.error is visible in Vercel)
    console.error('detect error for', target, err && err.stack ? err.stack : err);
    // send helpful message to client (no stack)
    return res.status(500).json({ error: String(err && err.message ? err.message : err) });
  } finally {
    clearTimeout(timeout);
  }
}
