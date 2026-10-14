-- Run in Supabase > SQL Editor
create extension if not exists pgcrypto;

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sort int default 0
);
create table nominees (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade,
  full_name text not null,
  bio text,
  citation text,
  photo_url text,
  votes int not null default 0,
  created_at timestamptz default now()
);
create table vote_logs (
  id uuid primary key default gen_random_uuid(),
  nominee_id uuid references nominees(id) on delete set null,
  votes_added int not null,
  amount_paid numeric(10,2) not null,
  paystack_reference text not null unique,   -- one reference = one use
  voter_contact text,
  created_at timestamptz default now()
);
create table vote_intents (                   -- created server-side before payment; also used for rate limiting
  reference text primary key,
  nominee_id uuid not null,
  votes int not null,
  amount_pesewas int not null,
  contact text,
  ip text,
  created_at timestamptz default now()
);
create index on vote_intents (ip, created_at);

-- Row Level Security: public can only READ categories + nominees.
-- vote_logs / vote_intents have RLS on and NO policies => only the service key (backend) can touch them.
alter table categories enable row level security;
alter table nominees enable row level security;
alter table vote_logs enable row level security;
alter table vote_intents enable row level security;
create policy "public read" on categories for select using (true);
create policy "public read" on nominees for select using (true);

-- The ONLY way votes increase. Idempotent: duplicate reference returns false.
create or replace function record_vote(p_ref text, p_amount int, p_contact text)
returns boolean language plpgsql security definer as $$
declare i vote_intents%rowtype;
begin
  select * into i from vote_intents where reference = p_ref;
  if not found or i.amount_pesewas <> p_amount then return false; end if;
  begin
    insert into vote_logs(nominee_id, votes_added, amount_paid, paystack_reference, voter_contact)
    values (i.nominee_id, i.votes, p_amount / 100.0, p_ref, p_contact);
  exception when unique_violation then return false;
  end;
  update nominees set votes = votes + i.votes where id = i.nominee_id;
  return true;
end $$;
revoke all on function record_vote(text, int, text) from public, anon, authenticated;
grant execute on function record_vote(text, int, text) to service_role;

insert into categories (name, description, sort) values
 ('Most Hardworking', 'Dedication that never sleeps', 1),
 ('Most Fashionable', 'Style that turns heads', 2),
 ('Best Pals', 'Friendships that last', 3),
 ('Most Charismatic', 'Presence that fills a room', 4),
 ('Best Unit / Best Department', 'Service that stood out', 5);

-- Storage: Dashboard > Storage > New bucket named "nominees", set Public bucket = ON.
