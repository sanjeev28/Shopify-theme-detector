import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>ThemeSpot — Shopify Theme Detector</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={{maxWidth:1100, margin:'28px auto', padding:'0 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial'}}>
        <h1 style={{fontSize:40}}>ThemeSpot</h1>
        <p>Minimal working version. Use the Detect input in the full repo.</p>
      </main>
    </>
  );
}
