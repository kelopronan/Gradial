// Vercel Serverless Function: /api/transcribe
// Reads GROQ_API_KEY from environment variables and proxies Whisper AI audio transcription requests.

export const config = {
  api: {
    bodyParser: false, // Allows streaming raw multipart FormData to Groq
  },
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY environment variable is missing on Vercel deployment.' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': req.headers['content-type'] || 'multipart/form-data',
      },
      body: buffer,
    });

    const data = await groqResponse.json();
    return res.status(groqResponse.status).json(data);
  } catch (err) {
    console.error('[Vercel API Transcribe Error]:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error during transcription' });
  }
}
