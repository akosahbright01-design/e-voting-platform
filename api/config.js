const { DEADLINE } = require('./_lib');
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    url: process.env.SUPABASE_URL,
    anon: process.env.SUPABASE_ANON_KEY,
    paystack: process.env.PAYSTACK_PUBLIC_KEY,
    deadline: DEADLINE
  });
};
