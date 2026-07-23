-- Pastikan ekstensi UUID tersedia
create extension if not exists "uuid-ossp";

-- Buat tabel user login
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  role text not null default 'visitor' check (role in ('admin', 'visitor')),
  created_at timestamptz not null default now()
);

-- Buat tabel tenant
create table if not exists tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  terminal text not null check (terminal in ('terminal 1', 'terminal 2')),
  image_url text not null,
  created_at timestamptz not null default now()
);

alter table if exists tenants drop column if exists description;

-- Buat tabel vote
create table if not exists votes (
  id uuid primary key default uuid_generate_v4(),
  user_email text not null,
  tenant_id uuid references tenants(id) on delete cascade,
  voted_at timestamptz not null default now(),
  voted_date date not null default current_date
);

alter table if exists votes add column if not exists voted_date date not null default current_date;

-- Hapus duplikat yang sudah ada agar indeks unik bisa dibuat.
-- Simpan hanya satu vote per user per hari.
with ranked_votes as (
  select
    id,
    row_number() over (partition by user_email, voted_date order by voted_at asc, id asc) as rn
  from votes
)
delete from votes
using ranked_votes
where votes.id = ranked_votes.id
  and ranked_votes.rn > 1;

drop index if exists votes_per_day_unique;
create unique index if not exists votes_per_day_unique on votes (user_email, voted_date);

alter table users disable row level security;
alter table tenants disable row level security;
alter table votes disable row level security;

-- Seed akun admin
insert into users (email, role)
values ('admin@tenant.id', 'admin')
on conflict (email) do nothing;
