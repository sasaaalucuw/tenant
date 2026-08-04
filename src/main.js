import { createApp } from './flue.js';
import { render, attachAppActions } from './app.js';

const app = createApp('#app', render);

attachAppActions(app);

app.mount({
  view: 'login',
  email: '',
  user: null,
  tenants: [],
  users: [],
  votes: [],
  votesToday: 0,
  voteMonitoring: {
    dailyStats: [],
    topTenant: null,
    tenantTotals: [],
  },
  filter: '',
  terminalFilter: null,
  editing: null,
  form: { name: '', terminal: 'terminal 1', image_url: '' },
  message: '',
});

window.addEventListener('submit', (event) => {
  if (event.target.closest('.tenant-form')) {
    event.preventDefault();
  }
});

window.addEventListener('input', (event) => {
  if (event.target.id === 'search-input') {
    app.setState({ filter: event.target.value });
  }
});
