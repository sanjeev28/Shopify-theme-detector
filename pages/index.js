import { useState } from 'react';
import Head from 'next/head';
import '../styles/globals.css';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const AFF = process.env.NEXT_PUBLIC_AFFILIATE_BASE || '';

  async function onDetect() {
    setError('');
    setResult(null);
    if (!url) return setError('Please enter a store URL');
    setLoading(true);
    try {
      const r = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (!r.ok) throw new Error('Server error: ' + r.status);
      const json = await r.json();
      setResult(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function buildAffiliateLink(themeName, site) {
    if (!AFF) return '#';
    const q = encodeURIComponent(themeName || 'theme');
    return `${AFF}?theme=${q}&site=${encodeURIComponent(site)}`;
  }

  return (
    <>
      <Head>
        <title>ThemeSpot — Shopify Theme Detector</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="topbar">
        <div className="top-inner">Support &nbsp;|&nbsp; Contact Sales</div>
      </header>

      <main className="page-wrap">
        <section className="hero">
          <div className="hero-left">
            <div className="eyebrow">ThemeSpot</div>
            <h1>Find any Shopify store's theme instantly</h1>
            <p>Paste a store URL and ThemeSpot will scan the public HTML and reveal theme fingerprints (theme name, handle, or asset hints).</p>

            <div className="search-card">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g. overlaysnow.com or https://overlaysnow.com"
                className="input"
              />
              <button onClick={onDetect} className="btn primary" disabled={loading}>{loading ? 'Detecting...' : 'Detect'}</button>
            </div>

            {error && <div className="note error">{error}</div>}

            {result && (
              <div className="result-card">
                <div className="result-left">🌐</div>
                <div className="result-meta">
                  <div className="site">{new URL(url.includes('://') ? url : 'https://' + url).hostname} {result.isShopify ? 'is using this theme' : '— not detected as Shopify'}</div>
                  <div className="theme">{result.themeName || (result.isShopify ? 'Theme detected (name not available)' : 'No theme detected')}</div>
                  <div className="evidence">{result.evidence && result.evidence.length ? 'Evidence: ' + result.evidence.join(', ') : ''}</div>
                </div>

                <div className="result-actions">
                  {result.isShopify && (
                    <a className="btn primary" href={buildAffiliateLink(result.themeName || 'theme', new URL(url.includes('://') ? url : 'https://' + url).hostname)} target="_blank" rel="noreferrer">Get this theme</a>
                  )}
                  <a className="btn ghost" href={(url.includes('://') ? url : 'https://' + url)} target="_blank" rel="noreferrer">Visit site</a>
                </div>
              </div>
            )}

          </div>

          <aside className="hero-right">
            <div className="card">
              <h3>Quick actions</h3>
              <div className="cta-list">
                <button className="btn">Install Extension</button>
                <button className="btn ghost">API & Docs</button>
              </div>
            </div>
          </aside>
        </section>

        <section className="cards-grid">
          <div className="info-card">
            <div>
              <h4>Theme Customization</h4>
              <p>Get help customizing a theme to match your brand.</p>
            </div>
            <div className="card-arrow">→</div>
          </div>

          <div className="info-card">
            <div>
              <h4>Top themes for SEO</h4>
              <p>Discover themes optimized for speed & SEO.</p>
            </div>
            <div className="card-arrow">→</div>
          </div>

          <div className="info-card">
            <div>
              <h4>Theme store links</h4>
              <p>Direct links to theme listings and demos.</p>
            </div>
            <div className="card-arrow">→</div>
          </div>

          <div className="info-card">
            <div>
              <h4>Compare themes</h4>
              <p>Side-by-side comparison to choose the right theme.</p>
            </div>
            <div className="card-arrow">→</div>
          </div>
        </section>

        <section className="faq">
          <div className="faq-card">
            <h3>Frequently Asked Questions</h3>
            <div className="faq-list">
              <details>
                <summary>How does ThemeSpot detect a Shopify theme?</summary>
                <p>ThemeSpot scans public HTML looking for <code>window.Shopify.theme</code>, asset URLs with <code>/themes/</code>, and other fingerprints.</p>
              </details>

              <details>
                <summary>Is it always accurate?</summary>
                <p>It's best-effort: sites that hide theme fingerprints or render everything client-side may not return a name.</p>
              </details>

              <details>
                <summary>Do you store scanned site data?</summary>
                <p>This demo does not store scans. Production deployments may store anonymized results with user consent.</p>
              </details>

            </div>
          </div>

          <aside className="faq-side">
            <div className="side-card"><strong>Tip</strong><p>Paste the store's root URL (example.com) for best results.</p></div>
            <div className="side-card"><strong>Contact</strong><p>support@example.com</p></div>
          </aside>
        </section>

      </main>

      <footer className="footer">© 2025 ThemeSpot</footer>
    </>
  );
}
