// Vercel Serverless Function — proxy untuk Catbox (mengatasi CORS).
// Body request: multipart/form-data dengan field "reqtype" dan "fileToUpload".
// Kita teruskan body mentah + content-type ke Catbox dan kembalikan URL hasilnya.

export const config = {
  api: {
    bodyParser: false, // kita teruskan body mentah
  },
  // Vercel serverless function size limit untuk request body
  maxDuration: 300,
};

export default async function handler(req, res) {
  // CORS — biar bisa dipanggil dari domain manapun
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  try {
    // Kumpulkan raw body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    if (buffer.length > 200 * 1024 * 1024) {
      return res.status(413).send('File too large (max 200MB).');
    }

    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return res.status(400).send('Expected multipart/form-data');
    }

    const upstream = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: buffer,
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      return res.status(502).send(`Catbox error (${upstream.status}): ${text.slice(0, 500)}`);
    }

    // Catbox mengembalikan URL plain text
    const trimmed = text.trim();
    if (!/^https?:\/\//.test(trimmed)) {
      return res.status(502).send(`Unexpected Catbox response: ${trimmed.slice(0, 500)}`);
    }

    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(trimmed);
  } catch (err) {
    console.error('[api/upload] error', err);
    return res.status(500).send('Server error: ' + (err?.message || 'unknown'));
  }
}
