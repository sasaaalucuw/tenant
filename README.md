# Tenant Voting Website

Website voting tenant berbasis JavaScript dengan backend Supabase.

## Fitur
- Login dengan email saja
- Admin dashboard untuk CRUD tenant
- Halaman pengunjung dengan pencarian, filter terminal, dan voting tenant
- Voting per hari; jika sudah voting hari ini, tenant card menjadi abu-abu
- Tema merah putih gradasi dengan logo 81 th Indonesia Raya

## Setup
1. Duplikasi `.env.example` menjadi `.env`
2. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dengan kredensial Supabase Anda
3. Buat database di Supabase, lalu jalankan `supabase-schema.sql` di SQL editor Supabase untuk membuat tabel `users`, `tenants`, `votes`, dan menonaktifkan row-level security pada tabel-tabel tersebut.
   - Role hanya akan diperbolehkan `admin` atau `visitor`.
4. Jalankan:
   ```bash
   npm install
   npm run dev
   ```

## Supabase Connection
1. Buka dashboard Supabase dan buat project baru.
2. Di menu `Settings > API`, salin `Project URL` ke `VITE_SUPABASE_URL`. Contoh:
   `https://ljmtkzpchbohxheaoskg.supabase.co`
   (Jangan pakai path `/rest/v1` di nilai ini.)
3. Di menu `Settings > API`, salin `anon public` key ke `VITE_SUPABASE_ANON_KEY`.
4. Pastikan tabel berikut ada di Supabase:
   - `users` (id, email, role, created_at)
   - `tenants` (id, name, terminal, image_url, description, created_at)
   - `votes` (id, user_email, tenant_id, voted_at)
5. Jika ingin login admin, pastikan ada baris `admin@tenant.id` di tabel `users`.

## Deploy ke Vercel
1. Push folder `Tenant` ke GitHub sebagai repository atau subfolder GitHub.
2. Buka Vercel dan import project dari GitHub.
3. Pilih folder `Tenant` sebagai root project bila repositori memiliki lebih dari satu folder.
4. Tambahkan environment variables di Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. Setelah build sukses, Anda akan mendapatkan link Vercel yang bisa diakses publik.

> Pastikan env vars di Vercel sama persis dengan `.env` lokal.

## Supabase Tables
Lihat `supabase-schema.sql` untuk definisi tabel `users`, `tenants`, dan `votes`.

## Supabase Setup Jika Table Kosong
Jika halaman Supabase masih kosong, berarti schema belum diimpor. Ikuti ini:

1. Buka Supabase dashboard dan pilih project kamu.
2. Buka menu `SQL Editor`.
3. Salin semua isi `supabase-schema.sql` dari folder `Tenant`.
4. Jalankan query tersebut.
5. Setelah berhasil, buka `Table Editor` untuk memastikan tabel `users`, `tenants`, dan `votes` sudah muncul.
6. Refresh aplikasi `npm run dev` dan coba login lagi.

> `admin@tenant.id` akan dibuat otomatis oleh SQL saat schema diimpor.

## Login
- Admin: `admin@tenant.id`
- Pengunjung: email lain akan dibuat sebagai akun visitor otomatis
