import { useState } from 'react';
import Head from 'next/head';

export default function Home() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const detectTheme = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
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
      </Head>
      <main style={{maxWidth:800, margin:'40px auto', padding:'0 20px', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial'}}>
        <h1 style={{fontSize:36, marginBottom:20}}>Shopify Theme Detector</h1>
        <p>Enter a Shopify store URL to see which theme it is using.</p>

        <div style={{display:'flex', gap:10, margin:'20px 0'}}>
          <input
            type="text"
            placeholder="https://examplestore.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            style={{flex:1, padding:'10px', fontSize:16, border:'1px solid #ccc', borderRadius:4}}
          />
          <button
            onClick={detectTheme}
            style={{padding:'10px 20px', background:'#0b2b6b', color:'#fff', border:'none', borderRadius:4, cursor:'pointer'}}
          >
            {loading ? 'Detecting...' : 'Detect Theme'}
          </button>
        </div>

        {result && (
          <div style={{marginTop:20, padding:20, border:'1px solid #eee', borderRadius:8, background:'#fafafa'}}>
            {result.error && <p style={{color:'red'}}>Error: {result.error}</p>}
            {result.isShopify ? (
              <>
                <p><strong>{url}</strong> is using the theme:</p>
                <h2 style={{color:'#0b2b6b'}}>{result.themeName || 'Unknown Theme'}</h2>
                <p><strong>Evidence:</strong></p>
                <ul>
                  {result.evidence?.map((ev, i) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
                <a
                  href={`${process.env.NEXT_PUBLIC_AFFILIATE_BASE}`}
                  target="_blank"
                  style={{display:'inline-block', marginTop:20, padding:'12px 20px', background:'#0b2b6b', color:'#fff', borderRadius:6, textDecoration:'none'}}
                >
                  Get This Theme
                </a>
              </>
            ) : (
              <p>This site does not look like a Sh
