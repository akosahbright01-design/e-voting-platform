const crypto = require('crypto');
const { confirm } = require('./_lib');

// Set this URL in Paystack: Settings > API Keys & Webhooks > Live/Test Webhook URL
module.exports = async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks);
  const sig = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(raw).digest('hex');
  if (sig !== req.headers['x-paystack-signature']) return res.status(401).end();
  try {
    const e = JSON.parse(raw);
    if (e.event === 'charge.success') await confirm(e.data.reference);
  } catch (err) { /* still ack so Paystack doesn't hammer retries; verify.js is a fallback */ }
  res.status(200).end();
};
module.exports.config = { api: { bodyParser: false } };
