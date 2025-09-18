// pages/api/detect.js
import { parse } from 'node-html-parser';

const FETCH_TIMEOUT = 15000; // 15 seconds

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'Missing url in body' });

  const target = url.includes('://') ? url : 'https://' + url;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const r = await fetch(target, {
      headers: { 'User-Agent': 'ThemeSpot/1.0 (+https://yourdomain.example)' },
      redirect: 'follow',
      signal: controller.signal
    }).catch(e => { throw new Error('Fetch failed: ' + (e.message || e)); });
    clearTimeout(timeout);

    if (!r) throw new Error('No response from target');
    if (!r.ok) {
      const body = await r.text().catch(()=>'<no body>');
      throw new Error(`Target returned ${r.status} ${r.statusText} - ${body.slice(0,200)}`);
    }

    const html = await r.text().catch(e => { throw new Error('Failed reading body: ' + e.message); });
    if (!html || typeof html !== 'string') throw new Error('Empty or non-text response');

    const root = parse(html, { script: true, style: true, pre: true });

    let isShopify = false;
    let themeName = null;
    const evidence = [];

    // 1) find inline window.Shopify.theme JSON in scripts
    const scripts = root.querySelectorAll('script');
    for (const s of scripts) {
      const txt = s.text || '';
      const m = txt.match(/Shopify\.theme\s*=\s*({[\s\S]*?})/);
      if (m) {
        try {
          const parsed = JSON.parse(m[1]);
          isShopify = true;
          themeName = parsed.name || parsed.theme_name || parsed.id || themeName;
          evidence.push('window.Shopify.theme (inline script)');
          break;
        } catch (e) {
          evidence.push('window.Shopify.theme (found but not JSON)');
        }
      }
    }

    // 2) check asset URLs for /themes/<handle>/
    const attrs = [];
    root.querySelectorAll('link').forEach(n => n.getAttribute('href') && attrs.push(n.getAttribute('href')));
    root.querySelectorAll('script').forEach(n => n.getAttribute('src') && attrs.push(n.getAttribute('src')));
    root.querySelectorAll('img').forEach(n => n.getAttribute('src') && attrs.push(n.getAttribute('src')));

    for (const u of attrs) {
      if (/\/themes\/([^\/]+)\//i.test(u)) {
        isShopify = true;
        const handle = u.match(/\/themes\/([^\/]+)\//i)[1];
        themeName = themeName || handle;
        evidence.push('asset URL contains /themes/: ' + u);
        break;
      }
    }

    // 3) settings_data.json
    for (const u of attrs) {
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
