const { confirm } = require('./_lib');
// Called by the browser after Paystack's popup succeeds. Never trusts the browser: re-verifies with Paystack.
module.exports = async (req, res) => {
  try {
    const ref = String(req.query.reference || '');
    if (!ref) return res.status(400).json({ error: 'Missing reference' });
    res.json(await confirm(ref));
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
};
