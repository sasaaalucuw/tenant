# Supabase Setup untuk Tenant Voting

Jika Supabase Table Editor masih kosong, jalankan langkah berikut:

1. Buka Supabase dashboard.
2. Pilih project yang kamu gunakan untuk app Tenant.
3. Buka menu `SQL Editor`.
4. Salin isi file `supabase-schema.sql` dari folder `Tenant`.
5. Paste ke editor, lalu klik `Run`.

## Tindakan yang dilakukan SQL
- Membuat extension UUID jika belum ada
- Membuat tabel `users`, `tenants`, dan `votes`
- Menonaktifkan row-level security pada ketiga tabel
- Menambahkan baris admin `admin@tenant.id`

## Isi SQL yang harus dijalankan
```sql
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
  description text,
  created_at timestamptz not null default now()
);

-- Buat tabel vote
create table if not exists votes (
  id uuid primary key default uuid_generate_v4(),
  user_email text not null,
  tenant_id uuid references tenants(id) on delete cascade,
  voted_at timestamptz not null default now(),
  voted_date date not null default current_date
);

alter table if exists votes add column if not exists voted_date date not null default current_date;

create unique index if not exists votes_per_day_unique on votes (user_email, tenant_id, voted_date);

alter table users disable row level security;
alter table tenants disable row level security;
alter table votes disable row level security;

-- Seed akun admin
insert into users (email, role)
values ('admin@tenant.id', 'admin')
on conflict (email) do nothing;
```

## Setelah SQL dijalankan
1. Buka `Table Editor` di Supabase.
2. Pastikan tabel `users`, `tenants`, dan `votes` sudah terlihat.
3. Kembali ke app di localhost dan refresh.
4. Login sebagai `admin@tenant.id`.
