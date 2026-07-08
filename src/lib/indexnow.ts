const INDEXNOW_KEY = '3a7f9b2cd1e45f6a8b9c0d1e2f3a4b5c'

export async function pingIndexNow(urls: string | string[]): Promise<void> {
  const urlList = Array.isArray(urls) ? urls : [urls]
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'sabula256.com',
        key: INDEXNOW_KEY,
        keyLocation: `https://sabula256.com/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    })
  } catch (err) {
    console.error('[indexnow] ping failed:', err)
  }
}
