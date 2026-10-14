const crypto = require('crypto');
const U = process.env.SUPABASE_URL, K = process.env.SUPABASE_SERVICE_KEY;
const DEADLINE = process.env.VOTING_DEADLINE || '2026-10-20T23:59:00Z'; // ISO, GMT

const sb = async (path, { method = 'GET', body, headers = {} } = {}) => {
  const r = await fetch(`${U}/rest/v1/${path}`, {
    method, body: body && JSON.stringify(body),
    headers: { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...headers }
  });
  const t = await r.text();
  if (!r.ok) throw new Error(t);
  return t ? JSON.parse(t) : null;
};

// Verify with Paystack, then count votes once (DB enforces unique reference + amount match).
const confirm = async (ref) => {
  const r = await fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(ref), {
    headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY }
  });
  const j = await r.json(), d = j.data;
  if (!j.status || !d || d.status !== 'success' || d.currency !== 'GHS' || d.reference !== ref) return { ok: false };
  const counted = await sb('rpc/record_vote', { method: 'POST', body: { p_ref: ref, p_amount: d.amount, p_contact: d.customer && d.customer.email } });
  return { ok: true, counted: counted === true };
};

const sign = (s) => crypto.createHmac('sha256', process.env.ADMIN_PASSWORD || 'x').update(String(s)).digest('hex');
module.exports = { sb, confirm, sign, DEADLINE, U, K };
