// Vercel serverless function — /api/posts
// GET  → returns the posts array
// POST → saves the posts array (body: { posts: [...] })

const GITHUB_TOKEN = process.env.GH_TOKEN;
const REPO         = 'Binder-Photobooks/houseofarth';
const FILE         = 'posts.json';
const GH_API       = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

const ghHeaders = {
  'Authorization': `token ${GITHUB_TOKEN}`,
  'Accept':        'application/vnd.github.v3+json',
  'Content-Type':  'application/json',
  'User-Agent':    'houseofarth-blog'
};

export default async function handler(req, res) {
  // Allow the blog pages to call this endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ── GET: read posts ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const ghRes = await fetch(GH_API, { headers: ghHeaders });
      if (ghRes.status === 404) return res.status(200).json([]);
      if (!ghRes.ok) throw new Error(`GitHub ${ghRes.status}`);

      const data = await ghRes.json();
      const posts = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
      return res.status(200).json(posts);
    } catch (e) {
      console.error('GET error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  // ── POST: write posts ────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { posts } = req.body;
      if (!Array.isArray(posts)) return res.status(400).json({ error: 'posts must be an array' });

      // Get current SHA
      let sha = null;
      const getRes = await fetch(GH_API, { headers: ghHeaders });
      if (getRes.ok) sha = (await getRes.json()).sha;

      const content = Buffer.from(JSON.stringify(posts, null, 2)).toString('base64');
      const body    = { message: 'Update blog posts', content };
      if (sha) body.sha = sha;

      const putRes = await fetch(GH_API, {
        method: 'PUT',
        headers: ghHeaders,
        body: JSON.stringify(body)
      });

      if (!putRes.ok) {
        const err = await putRes.json();
        throw new Error(JSON.stringify(err));
      }

      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('POST error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
