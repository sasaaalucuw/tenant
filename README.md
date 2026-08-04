# Tenant Voting Website

Situs voting tenant berbasis Vite + Supabase.

## Setup Lokal

1. Salin `Tenant/.env.example` ke `Tenant/.env`
2. Isi nilai:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Jalankan:
   ```bash
   cd Tenant
   npm install
   npm run dev
   ```

## Supabase

1. Buat project baru di Supabase.
2. Buka `Settings > API` dan salin:
   - `Project URL` ke `VITE_SUPABASE_URL`
   - `anon public` key ke `VITE_SUPABASE_ANON_KEY`
3. Buka `SQL Editor` dan jalankan query di file `Tenant/supabase-schema.sql`.
4. Pastikan tabel `users`, `tenants`, dan `votes` sudah ada di `Table Editor`.
5. Admin default: `admin@tenant.id`

## Jalankan

- `npm run dev` untuk menjalankan server lokal
- Kunjungi URL yang ditampilkan oleh Vite

## Catatan

- Jangan commit file `.env` ke repository.
- `Tenant/.gitignore` sudah mengabaikan `.env`.
- File `SUPABASE_SETUP.md` juga berisi petunjuk impor schema.
