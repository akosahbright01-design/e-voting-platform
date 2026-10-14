const { sb, sign, U, K } = require('./_lib');
const q = encodeURIComponent;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const b = req.body || {}, a = b.action;
  try {
    if (a === 'login') {
      if (!process.env.ADMIN_PASSWORD || b.password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong password' });
      const exp = Date.now() + 6 * 3600e3;
      return res.json({ token: exp + '.' + sign(exp) });
    }
    const [exp, sig] = (req.headers.authorization || '').replace('Bearer ', '').split('.');
    if (!sig || Date.now() > +exp || sig !== sign(exp)) return res.status(401).json({ error: 'Unauthorized' });

    if (a === 'list') {
      const [categories, nominees, logs] = await Promise.all([
        sb('categories?order=sort'), sb('nominees?order=votes.desc'), sb('vote_logs?order=created_at.desc&limit=500')
      ]);
      const totalVotes = nominees.reduce((s, n) => s + n.votes, 0);
      return res.json({ categories, nominees, logs, totalVotes, revenue: totalVotes * 0.5 });
    }
    if (a === 'save_category') {
      const body = { name: b.name, description: b.description || '', sort: +b.sort || 0 };
      return res.json(b.id ? await sb(`categories?id=eq.${q(b.id)}`, { method: 'PATCH', body }) : await sb('categories', { method: 'POST', body }));
    }
    if (a === 'delete_category') return res.json(await sb(`categories?id=eq.${q(b.id)}`, { method: 'DELETE' }));
    if (a === 'save_nominee') {
      // Whitelist: "votes" can never be set from here.
      const body = { full_name: b.full_name, category_id: b.category_id, bio: b.bio || '', citation: b.citation || '' };
      if (b.photo_url) body.photo_url = b.photo_url;
      return res.json(b.id ? await sb(`nominees?id=eq.${q(b.id)}`, { method: 'PATCH', body }) : await sb('nominees', { method: 'POST', body }));
    }
    if (a === 'delete_nominee') return res.json(await sb(`nominees?id=eq.${q(b.id)}`, { method: 'DELETE' }));
    if (a === 'upload') {
      const name = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
      const r = await fetch(`${U}/storage/v1/object/nominees/${name}`, {
        method: 'POST', headers: { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'image/jpeg' },
        body: Buffer.from(String(b.data).split(',').pop(), 'base64')
      });
      if (!r.ok) throw new Error(await r.text());
      return res.json({ url: `${U}/storage/v1/object/public/nominees/${name}` });
    }
    res.status(400).json({ error: 'Unknown action' });
  } catch (e) { res.status(500).json({ error: String(e.message || e).slice(0, 200) }); }
};
