// pages/api/detect.js
import { parse } from 'node-html-parser';

const FETCH_TIMEOUT = 15000; // 15s

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'Missing url in request body' });

  const target = url.includes('://') ? url : 'https://' + url;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const r = await fetch(target, {
      headers: { 'User-Agent': 'ThemeSpot/1.0 (+https://yourdomain.example)' },
      redirect: 'follow',
      signal: controller.signal
    }).catch(err => {
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

    // parse with node-html-parser
    const root = parse(html, { script: true, style: true, pre: true });

    let evidence = [];
    let isShopify = false;
    let themeName = null;

    // 1) Try to find inline window.Shopify.theme JSON inside <script> tags
    const scriptNodes = root.querySelectorAll('script');
    for (const s of scriptNodes) {
      const txt = s.text || '';
      const m = txt.match(/Shopify\.theme\s*=\s*({[\s\S]*?})/);
      if (m) {
        try {
          const parsed = JSON.parse(m[1]);
          isShopify = true;
          themeName = parsed.name || parsed.theme_name || parsed.id || parsed.role || themeName;
          evidence.push('window.Shopify.theme (inline script)');
          break; // found enough
        } catch (e) {
          evidence.push('window.Shopify.theme (found but not JSON-parseable)');
        }
      }
    }

    // 2) Search asset URLs for /themes/<handle>/
    const assetAttrs = [];
    const links = root.querySelectorAll('link');
    links.forEach(n => { const h = n.getAttribute('href'); if (h) assetAttrs.push(h); });
    const scripts = root.querySelectorAll('script');
    scripts.forEach(n => { const s = n.getAttribute('src'); if (s) assetAttrs.push(s); });
    const imgs = root.querySelectorAll('img');
    imgs.forEach(n => { const s = n.getAttribute('src'); if (s) assetAttrs.push(s); });

    for (const u of assetAttrs) {
      if (/\/themes\/([^\/]+)\//i.test(u)) {
        isShopify = true;
        const handle = u.match(/\/themes\/([^\/]+)\//i)[1];
        themeName = themeName || handle;
        evidence.push('asset URL contains /themes/: ' + u);
        break;
      }
    }

    // 3) look for settings_data.json reference
    for (const u of assetAttrs) {
      if (/settings_data\.json/i.test(u)) {
        isShopify = true;
        evidence.push('settings_data.json: ' + u);
        break;
      }
    }

    return res.json({ isShopify, themeName, evidence });
  } catch (err) {
    console.error('detect error for', target, err && err.stack ? err.stack : err);
    return res.status(500).json({ error: String(err && err.message ? err.message : err) });
  } finally {
    clearTimeout(timeout);
  }
}
