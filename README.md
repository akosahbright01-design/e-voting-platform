# LA NOCHE DE HONOR '26 - E-Voting

## Folder structure
```
la-noche-de-honor/
├── index.html          public voting site
├── admin.html          admin dashboard (served at /admin)
├── api/
│   ├── _lib.js         Supabase + Paystack helpers
│   ├── config.js       public keys + deadline for the frontend
│   ├── init.js         creates payment reference, price, rate limit (5/min/IP)
│   ├── verify.js       re-verifies a payment with Paystack, then counts votes
│   ├── webhook.js      Paystack webhook (signature checked), counts votes
│   └── admin.js        password login + category/nominee CRUD + photo upload
├── supabase/schema.sql tables, RLS, secure vote function, seed categories
├── vercel.json  package.json  .env.example
```

## 1. Supabase
1. Create a project at supabase.com.
2. SQL Editor > paste `supabase/schema.sql` > Run. This creates the tables, locks them with RLS (public read only), and seeds your 5 categories.
3. Storage > New bucket > name `nominees` > turn **Public bucket** on.
4. Project Settings > API: copy the **Project URL**, **anon key** and **service_role key**.

## 2. Paystack
1. Sign up at paystack.com and complete business verification (needed for live MoMo/card payments).
2. Settings > API Keys & Webhooks: copy the **public** and **secret** keys (use `pk_test`/`sk_test` first).
3. Set the webhook URL to `https://YOUR-DOMAIN/api/webhook`.
4. Enable Mobile Money for Ghana in your Paystack dashboard.

## 3. Deploy on Vercel
1. Push this folder to GitHub, then import it in Vercel (no build command needed).
2. Add the environment variables from `.env.example` (Project > Settings > Environment Variables).
3. Set `VOTING_DEADLINE` to the real closing time in GMT, e.g. `2026-10-20T23:59:00Z`.
4. Deploy. Open `/admin`, sign in, add nominees with photos.

## 4. Test before going live
Use `pk_test`/`sk_test` keys and Paystack test cards. Confirm a vote appears in Admin > Vote logs and the count rises once.

## How the security works
- Price and reference are created on the server (`/api/init`); the browser can't change the amount.
- Votes are added only by `record_vote()` after Paystack confirms success, amount and currency match. `paystack_reference` is UNIQUE, so replays are ignored.
- Webhook and browser verification can both fire safely; only one counts.
- Public visitors (anon key) can only read categories and nominees. `vote_logs` and `vote_intents` have no public access.
- Admin can't edit votes: no endpoint writes `votes`.
- The deadline is enforced on the server too, not just the countdown.
