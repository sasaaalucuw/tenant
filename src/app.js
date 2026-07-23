import { html } from './flue.js';
import {
  createVisitor,
  createUser,
  deleteTenant,
  deleteUser,
  ensureAdminUser,
  findUserByEmail,
  loadTenants,
  loadUserVotes,
  loadUsers,
  loadVotesToday,
  createTenant,
  updateTenant,
  updateUserRole,
  voteTenant,
  supabaseConfigured,
} from './supabase.js';

const ADMIN_EMAIL = 'admin@tenant.id';

function todayKey() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function hasVotedToday(votes) {
  const today = todayKey();
  return votes.some((vote) => String(vote.voted_date).slice(0, 10) === today || String(vote.voted_at).slice(0, 10) === today);
}

function tenantFilter(tenant, search, terminalFilter) {
  const searchMatch = tenant.name.toLowerCase().includes(search.toLowerCase());
  const terminalMatch = !terminalFilter || tenant.terminal === terminalFilter;
  return searchMatch && terminalMatch;
}

function renderHeader(user) {
  return `
    <header class="hero">
      <div class="hero-left">
        <div class="hero-title-row">
          <div class="hero-logo-81">81</div>
          <div class="hero-title-text">
            <div class="hero-brand">Juanda International Airport</div>
            <div class="hero-subtitle">Bandara Juanda • Voting Tenant</div>
          </div>
        </div>
        <div class="hero-copy">
          <p>Masuk dengan email, kemudian pilih tenant favoritmu untuk voting sehari sekali.</p>
        </div>
      </div>
      <div class="hero-right">
        <div class="hero-user">${user ? `Logged in as <strong>${user.email}</strong>` : '<strong>Silakan login</strong>'}</div>
      </div>
    </header>
  `;
}

export function render(state, { setState }) {
  const { view, email, user, tenants = [], users = [], votes = [], votesToday = 0, filter = '', terminalFilter = null, editing, form, message, activeAdminPanel = 'users' } = state;

  const votedToday = hasVotedToday(votes);
  const voteNotice = votedToday
    ? 'Kamu sudah melakukan vote hari ini. Silakan kembali besok untuk voting lagi.'
    : 'Pilih tenant favoritmu dan vote satu kali setiap hari.';

  const header = renderHeader(user);
  const alert = message ? `<div class="message">${message}</div>` : '';
  const warning = !supabaseConfigured ? `<div class="warning">Supabase belum terkonfigurasi. Periksa file <code>.env</code> dan jalankan ulang dev server setelah mengisi ` +
    `<code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code>. Pastikan juga schema Supabase sudah diimpor.</div>` : '';

  const totalTenants = tenants.length;
  const totalUsers = users.length;
  const totalVotesToday = votesToday;
  const isCurrentAdmin = user?.role === 'admin';

  const loginSection = html`
    <section class="login-card">
      <div class="login-hero login-hero-clean">
        <div class="login-hero-info">
          <div class="hero-title-row login-title-row">
          
            <div class="hero-title-text">
              <div class="hero-brand">Juanda International Airport</div>

            </div>
          </div>
          <p>Masuk untuk mulai voting tenant di terminal Juanda. Satu suara per hari untuk tenant favoritmu.</p>
        </div>
      </div>
      <label>Email</label>
      <input type="email" id="email-input" placeholder="contoh@gmail.com" value="${email}" />
      <div class="login-actions">
        <button data-action="login">Login</button>
      </div>
    </section>
  `;

  const adminTenantRows = tenants
    .map(
      (tenant) => `
      <tr>
        <td>${tenant.name}</td>
        <td>${tenant.terminal}</td>
        <td><img src="${tenant.image_url}" alt="${tenant.name}" class="tenant-thumb" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'" /></td>
        <td>
          <button class="small" data-action="start-edit" data-payload='${JSON.stringify({ id: tenant.id })}'>Edit</button>
          <button class="small danger" data-action="delete-tenant" data-payload='${JSON.stringify({ id: tenant.id })}'>Hapus</button>
        </td>
      </tr>
    `,
    )
    .join('');

  const adminUserRows = users
    .map((item) => {
      const canModify = user?.id !== item.id;
      return `
      <tr>
        <td>${item.email}</td>
        <td>${item.role}</td>
        <td>${new Date(item.created_at).toLocaleDateString('id-ID')}</td>
        <td>
          <button class="small danger" data-action="delete-user" data-payload='${JSON.stringify({ id: item.id })}' ${!canModify ? 'disabled' : ''}>Hapus</button>
        </td>
      </tr>
    `;
    })
    .join('');

  const userPanel = html`
    <div class="admin-panel-box">
      <div class="panel-toolbar">
        <div>
          <h3>Kelola Pengguna</h3>
          <p>Tambah, edit role, dan hapus pengguna yang terdaftar.</p>
        </div>
        <span class="toolbar-count">Total Pengguna: ${totalUsers}</span>
      </div>
      <form class="user-form" onsubmit="return false;" data-action="prevent-submit">
        <label>Email Pengguna</label>
        <input id="user-email" type="email" placeholder="user@gmail.com" />
        <p class="helper-text">Semua akun baru dibuat sebagai visitor dengan domain @gmail.com.</p>
        <button data-action="create-user">Tambah Pengguna</button>
      </form>
      <div class="tenant-table-wrapper">
        <table class="tenant-table">
          <thead>
            <tr><th>Email</th><th>Role</th><th>Terdaftar</th><th>Aksi</th></tr>
          </thead>
          <tbody>${adminUserRows || '<tr><td colspan="4">Belum ada pengguna.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;

  const tenantPanel = html`
    <div class="admin-panel-box">
      <div class="panel-toolbar">
        <div>
          <h3>Kelola Tenant</h3>
          <p>Tambah tenant baru atau edit tenant yang sudah terdaftar.</p>
        </div>
        <span class="toolbar-count">Total Tenant: ${totalTenants}</span>
      </div>
      <form class="tenant-form" onsubmit="return false;" data-action="prevent-submit">
        <label>Nama Tenant</label>
        <input id="tenant-name" type="text" value="${form.name}" placeholder="Nama tenant" />
        <label>Terminal</label>
        <select id="tenant-terminal">
          <option value="terminal 1" ${form.terminal === 'terminal 1' ? 'selected' : ''}>Terminal 1</option>
          <option value="terminal 2" ${form.terminal === 'terminal 2' ? 'selected' : ''}>Terminal 2</option>
        </select>
        <label>Gambar URL</label>
        <input id="tenant-image" type="text" value="${form.image_url}" placeholder="contoh.com/foto.jpg atau https://..." />
        <button data-action="save-tenant">${editing ? 'Perbarui Tenant' : 'Simpan Tenant'}</button>
        ${editing ? '<button data-action="cancel-edit" class="secondary">Batal</button>' : ''}
      </form>
      <div class="tenant-table-wrapper">
        <h3>Daftar Tenant</h3>
        <table class="tenant-table">
          <thead>
            <tr><th>Nama</th><th>Terminal</th><th>Gambar</th><th>Aksi</th></tr>
          </thead>
          <tbody>${adminTenantRows || '<tr><td colspan="4">Belum ada tenant.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;

  const adminSection = html`
    <section class="panel admin-panel">
      <div class="panel-header">
        <div>
          <h2>Dashboard Admin</h2>
          <p class="panel-subtitle">Kelola tenant dan pengguna dengan tampilan panel kontrol.</p>
        </div>
        <button data-action="logout" class="secondary">Logout</button>
      </div>

      <div class="admin-panel-shell">
        <aside class="admin-sidebar">
          <div class="sidebar-title">Control Panel</div>
          <button class="admin-menu-item ${activeAdminPanel === 'dashboard' ? 'active' : ''}" data-action="set-admin-panel" data-payload='${JSON.stringify({ panel: 'dashboard' })}'>Ringkasan</button>
          <button class="admin-menu-item ${activeAdminPanel === 'users' ? 'active' : ''}" data-action="set-admin-panel" data-payload='${JSON.stringify({ panel: 'users' })}'>Kelola Pengguna <span>${totalUsers}</span></button>
          <button class="admin-menu-item ${activeAdminPanel === 'tenants' ? 'active' : ''}" data-action="set-admin-panel" data-payload='${JSON.stringify({ panel: 'tenants' })}'>Kelola Tenant <span>${totalTenants}</span></button>
        </aside>

        <div class="admin-content">
          <div class="dashboard-stat-row admin-content-stats">
            <div class="stat-card">
              <span>Total Tenant</span>
              <strong>${totalTenants}</strong>
            </div>
            <div class="stat-card">
              <span>Total Pengguna</span>
              <strong>${totalUsers}</strong>
            </div>
            <div class="stat-card">
              <span>Vote Hari Ini</span>
              <strong>${totalVotesToday}</strong>
            </div>
          </div>
          ${activeAdminPanel === 'dashboard'
            ? html`
                <div class="admin-panel-box admin-summary-box">
                  <h3>Ringkasan Kontrol</h3>
                  <p>Pilih menu di samping untuk melihat detail pengguna atau tenant.</p>
                  <div class="summary-grid">
                    <div><strong>${totalUsers}</strong><span>Pengguna aktif</span></div>
                    <div><strong>${totalTenants}</strong><span>Tenant tersedia</span></div>
                    <div><strong>${totalVotesToday}</strong><span>Vote hari ini</span></div>
                  </div>
                </div>
              `
            : activeAdminPanel === 'users'
            ? userPanel
            : tenantPanel}
        </div>
      </div>
    </section>
  `;

  const terminalButtons = ['terminal 1', 'terminal 2']
    .map(
      (term) => `
      <button class="filter-btn ${terminalFilter === term ? 'active' : ''}" data-action="set-terminal" data-payload='${JSON.stringify({ terminal: terminalFilter === term ? null : term })}'>
        ${term.replace('terminal', 'Terminal')}
      </button>
    `,
    )
    .join('');

  const filtered = tenants.filter((tenant) => tenantFilter(tenant, filter, terminalFilter));

  const visitorCards = filtered
    .map((tenant) => {
      return html`
        <article class="tenant-card ${votedToday ? 'voted' : ''}">
          <img src="${tenant.image_url}" alt="${tenant.name}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'" />
          <div class="tenant-card-body">
            <strong>${tenant.name}</strong>
            <span>${tenant.terminal}</span>
            <button data-action="vote" data-payload='${JSON.stringify({ id: tenant.id })}' ${votedToday ? 'disabled' : ''}>
              ${votedToday ? 'Sudah Vote Hari Ini' : 'Vote'}
            </button>
          </div>
        </article>
      `;
    })
    .join('');

  const visitorSection = html`
    <section class="panel visitor-panel">
      <div class="panel-header visitor-header">
        <div>
          <h2>Halaman Home Tenant</h2>
          <p>Filter berdasarkan terminal dan vote tenant favoritmu.</p>
        </div>
        <div class="visitor-actions">
          <button class="secondary" data-action="logout">Logout</button>
          <div class="visitor-stat">
            <span>Total Tenant</span>
            <strong>${totalTenants}</strong>
          </div>
        </div>
      </div>
      <div class="visitor-notice">${voteNotice}</div>
      <div class="visitor-controls">
        <input id="search-input" type="search" placeholder="Cari tenant..." value="${filter}" />
        <div class="filter-row">${terminalButtons}</div>
      </div>
      <div class="card-grid card-grid-small">${visitorCards || '<p class="empty">Tidak ada tenant untuk filter ini.</p>'}</div>
    </section>
  `;

  return html`
    <div class="page-shell">
      ${header}
      ${warning}
      ${alert}
      <main>${view === 'login' ? loginSection : view === 'admin' ? adminSection : visitorSection}</main>
    </div>
  `;
}

export async function attachAppActions(app) {
  app.root.addEventListener('app-action', async (event) => {
    const { action, payload } = event.detail;
    const state = app.state;

    async function reloadData() {
      const tenants = await loadTenants();
      const users = await loadUsers();
      const votes = state.user ? await loadUserVotes(state.user.email) : [];
      const votesToday = await loadVotesToday();
      app.setState({ tenants, users, votes, votesToday });
    }

    switch (action) {
      case 'prevent-submit':
        return;
      case 'login': {
        try {
          const emailInput = document.querySelector('#email-input');
          const email = emailInput?.value.trim().toLowerCase() || '';
          if (!email) {
            app.setState({ message: 'Email tidak boleh kosong.' });
            return;
          }
          if (email !== ADMIN_EMAIL && !/^[^@\s]+@gmail\.com$/i.test(email)) {
            app.setState({ message: 'Login visitor hanya boleh menggunakan alamat email @gmail.com.' });
            return;
          }
          let user = await findUserByEmail(email);
          if (!user) {
            user = email === ADMIN_EMAIL ? await ensureAdminUser(email) : await createVisitor(email);
          } else if (email === ADMIN_EMAIL && user.role !== 'admin') {
            user = await ensureAdminUser(email);
          }
          const view = user.role === 'admin' ? 'admin' : 'visitor';
          app.setState({ user, email, view, message: '', form: { name: '', terminal: 'terminal 1', image_url: '' }, editing: null });
          await reloadData();
        } catch (error) {
          app.setState({ message: error.message || 'Terjadi kesalahan saat login.' });
        }
        return;
      }
      case 'logout': {
        app.setState({ view: 'login', user: null, email: '', tenants: [], votes: [], filter: '', terminalFilter: null, editing: null, form: { name: '', terminal: 'terminal 1', image_url: '' }, message: '' });
        return;
      }
      case 'start-edit': {
        const tenant = state.tenants.find((item) => item.id === payload.id);
        if (!tenant) return;
        app.setState({ editing: tenant.id, form: { name: tenant.name, terminal: tenant.terminal, image_url: tenant.image_url }, message: '' });
        return;
      }
      case 'cancel-edit': {
        app.setState({ editing: null, form: { name: '', terminal: 'terminal 1', image_url: '' }, message: '' });
        return;
      }
      case 'set-admin-panel': {
        app.setState({ activeAdminPanel: payload.panel });
        return;
      }
      case 'create-user': {
        try {
          const email = document.querySelector('#user-email')?.value.trim().toLowerCase();
          const role = 'visitor';
          if (!email) {
            app.setState({ message: 'Email pengguna tidak boleh kosong.' });
            return;
          }
          if (!/^[^@\s]+@gmail\.com$/i.test(email)) {
            app.setState({ message: 'Alamat email pengguna harus berakhiran @gmail.com.' });
            return;
          }
          await createUser(email, role);
          app.setState({ message: 'Pengguna berhasil ditambahkan sebagai visitor.' });
          await reloadData();
        } catch (error) {
          app.setState({ message: error.message || 'Terjadi kesalahan saat menambahkan pengguna.' });
        }
        return;
      }
      case 'save-tenant': {
        try {
          const name = document.querySelector('#tenant-name')?.value.trim();
          const terminal = document.querySelector('#tenant-terminal')?.value;
          let image_url = document.querySelector('#tenant-image')?.value.trim();

          if (!name || !image_url) {
            app.setState({ message: 'Nama dan gambar URL harus diisi.' });
            return;
          }

          if (!/^https?:\/\//i.test(image_url)) {
            image_url = `https://${image_url}`;
          }

          const payload = { name, terminal, image_url };
          if (state.editing) {
            await updateTenant(state.editing, payload);
            app.setState({ message: 'Tenant diperbarui.', editing: null, form: { name: '', terminal: 'terminal 1', image_url: '' } });
          } else {
            await createTenant(payload);
            app.setState({ message: 'Tenant ditambahkan.', form: { name: '', terminal: 'terminal 1', image_url: '' } });
          }
          await reloadData();
        } catch (error) {
          app.setState({ message: error.message || 'Terjadi kesalahan saat menyimpan tenant.' });
        }
        return;
      }
      case 'delete-tenant': {
        if (!confirm('Hapus tenant ini?')) return;
        await deleteTenant(payload.id);
        app.setState({ message: 'Tenant dihapus.', editing: null, form: { name: '', terminal: 'terminal 1', image_url: '' } });
        await reloadData();
        return;
      }
      case 'delete-user': {
        if (!confirm('Hapus pengguna ini?')) return;
        await deleteUser(payload.id);
        app.setState({ message: 'Pengguna dihapus.' });
        await reloadData();
        return;
      }
      case 'set-terminal': {
        app.setState({ terminalFilter: payload.terminal });
        return;
      }
      case 'vote': {
        if (!state.user) return;
        try {
          await voteTenant(state.user.email, payload.id);
          await reloadData();
          app.setState({ message: 'Berhasil vote! Silakan cek tenant lain besok untuk vote ulang.' });
        } catch (error) {
          const msg = /duplicate key value/i.test(error.message || '') ? 'Anda sudah voting tenant ini hari ini.' : error.message || 'Gagal vote. Coba lagi nanti.';
          app.setState({ message: msg });
        }
        return;
      }
      default:
        return;
    }
  });
}
