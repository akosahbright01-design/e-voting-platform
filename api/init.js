const { randomBytes } = require('crypto');
const { sb, DEADLINE } = require('./_lib');

// Step 1 of voting: server decides the reference + amount, so the client can't tamper with price.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    if (Date.now() >= new Date(DEADLINE)) return res.status(403).json({ error: 'Voting Has Ended' });
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    const { nominee_id, votes, contact } = req.body || {};
    const v = Number(votes), c = String(contact || '').trim();
    if (!Number.isInteger(v) || v < 1 || v > 10000 || c.length < 6) return res.status(400).json({ error: 'Invalid vote details' });

    const since = new Date(Date.now() - 60000).toISOString();
    const recent = await sb(`vote_intents?ip=eq.${encodeURIComponent(ip)}&created_at=gte.${since}&select=reference`);
    if (recent.length >= 5) return res.status(429).json({ error: 'Too many attempts. Wait a minute and try again.' });

    const n = await sb(`nominees?id=eq.${encodeURIComponent(nominee_id)}&select=id`);
    if (!n.length) return res.status(404).json({ error: 'Nominee not found' });

    const reference = 'LNH-' + Date.now() + '-' + randomBytes(4).toString('hex');
    const amount = v * 50; // GHS 0.50 = 50 pesewas
    await sb('vote_intents', { method: 'POST', body: { reference, nominee_id, votes: v, amount_pesewas: amount, contact: c, ip } });
    const email = c.includes('@') ? c : c.replace(/\D/g, '') + '@voters.lanoche.app'; // Paystack needs an email
    res.json({ reference, amount, email });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
};
