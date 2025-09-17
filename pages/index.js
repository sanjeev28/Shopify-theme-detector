import { useState } from 'react';
import Head from 'next/head';

export default function Home() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const detectTheme = async () => {
    if (!url) return alert('Please enter a store URL');
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server returned ${res.status}: ${txt}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>ThemeSpot — Shopify Theme Detector</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial' }}>
        <h1 style={{ fontSize: 36, marginBottom: 10, color: '#0b2b6b' }}>Shopify Theme Detector</h1>
        <p style={{ color: '#6b7280' }}>Enter a Shopify store URL to see which theme it is using.</p>

        <div style={{ display: 'flex', gap: 10, margin: '20px 0' }}>
          <input
            type="text"
            placeholder="https://examplestore.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            style={{ flex: 1, padding: '10px', fontSize: 16, border: '1px solid #e6eefc', borderRadius: 8 }}
          />
          <button
            onClick={detectTheme}
            style={{ padding: '10px 20px', background: '#0b2b6b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            disabled={loading}
          >
            {loading ? 'Detecting...' : 'Detect Theme'}
          </button>
        </div>

        {result && (
          <div style={{ marginTop: 20, padding: 20, border: '1px solid #eef4ff', borderRadius: 10, background: '#fff' }}>
            {result.error && <p style={{ color: 'red' }}>Error: {result.error}</p>}

            {!result.error && result.isShopify && (
              <>
                <p><strong>{url}</strong> is using the theme:</p>
                <h2 style={{ color: '#0b2b6b', marginTop: 6 }}>{result.themeName || 'Unknown Theme'}</h2>
                <p style={{ marginTop: 8 }}><strong>Evidence:</strong></p>
                <ul>
                  {result.evidence?.map((ev, i) => <li key={i}>{ev}</li>)}
                </ul>

                {process.env.NEXT_PUBLIC_AFFILIATE_BASE ? (
                  <a
                    href={`${process.env.NEXT_PUBLIC_AFFILIATE_BASE}?theme=${encodeURIComponent(result.themeName || 'theme')}&site=${encodeURIComponent(new URL(url.includes('://') ? url : 'https://' + url).hostname)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-block', marginTop: 16, padding: '10px 16px', background: '#0b2b6b', color: '#fff', borderRadius: 8, textDecoration: 'none' }}
                  >
                    Get This Theme
                  </a>
                ) : (
                  <a
                    href={`mailto:you@yourdomain.com?subject=${encodeURIComponent('Theme request')}&body=${encodeURIComponent(`Please send info for ${url} - detected theme: ${result.themeName || 'unknown'}`)}`}
                    style={{ display: 'inline-block', marginTop: 16, padding: '10px 16px', background: '#0b2b6b', color: '#fff', borderRadius: 8, textDecoration: 'none' }}
                  >
                    Request this theme
                  </a>
                )}
              </>
            )}

            {!result.error && !result.isShopify && (
              <p>This site does not look like a Shopify store (no theme fingerprints found).</p>
            )}
          </div>
        )}

        <section style={{ marginTop: 28 }}>
          <h3 style={{ color: '#0b2b6b' }}>FAQ</h3>
          <details style={{ marginTop: 8 }}>
            <summary>How does ThemeSpot detect a Shopify theme?</summary>
            <p style={{ marginTop: 8, color: '#6b7280' }}>We scan the store's public HTML on the server for things like <code>window.Shopify.theme</code>, asset URLs containing <code>/themes/</code>, and <code>settings_data.json</code>.</p>
          </details>
          <details style={{ marginTop: 8 }}>
            <summary>Is it always accurate?</summary>
            <p style={{ marginTop: 8, color: '#6b7280' }}>It's best-effort: heavily-customized or client-rendered themes might not show up.</p>
          </details>
        </section>
      </main>
    </>
  );
}
