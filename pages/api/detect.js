import cheerio from 'cheerio';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'missing url' });

  try {
    const target = url.includes('://') ? url : 'https://' + url;
    const r = await fetch(target, {
      headers: { 'User-Agent': 'ThemeSpot/1.0 (+https://yourdomain.example)' },
      redirect: 'follow'
    });
    if (!r.ok) return res.status(502).json({ error: 'Failed to fetch target site', status: r.status });

    const html = await r.text();
    const $ = cheerio.load(html);

    let evidence = [];
    let isShopify = false;
    let themeName = null;

    const scriptsText = $('script').map((i, el) => $(el).html()).get().join('\n');
    const m = scriptsText.match(/Shopify\.theme\s*=\s*({[\s\S]*?})/);
    if (m) {
      try {
        const parsed = JSON.parse(m[1]);
        isShopify = true;
        themeName = parsed.name || parsed.theme_name || parsed.id || parsed.role || null;
        evidence.push('window.Shopify.theme (inline script)');
      } catch (e) {
        evidence.push('window.Shopify.theme (found but not JSON-parseable)');
      }
    }

    const assets = $('link[href], script[src], img[src]').map((i, el) => $(el).attr('href') || $(el).attr('src')).get().filter(Boolean);
    const themeAsset = assets.find(u => /\/themes\/([^\/]+)\//i.test(u));
    if (themeAsset) {
      isShopify = true;
      const handle = themeAsset.match(/\/themes\/([^\/]+)\//i)[1];
      themeName = themeName || handle;
      evidence.push('asset URL contains /themes/: ' + themeAsset);
    }

    const settingsRef = assets.find(u => /settings_data\.json/i.test(u));
    if (settingsRef) {
      isShopify = true;
      evidence.push('settings_data.json: ' + settingsRef);
    }

    return res.json({ isShopify, themeName, evidence });
  } catch (err) {
    console.error('detect error', err);
    return res.status(500).json({ error: err.message });
  }
}
