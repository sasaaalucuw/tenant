export function createApp(rootSelector, render) {
  const root = document.querySelector(rootSelector);
  const state = {};
  const listeners = new Set();

  function setState(partial) {
    Object.assign(state, partial);
    listeners.forEach((listener) => listener(state));
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(state);
    return () => listeners.delete(listener);
  }

  function mount(initialState) {
    Object.assign(state, initialState);
    subscribe(() => {
      root.innerHTML = render(state, { setState });
      attachEvents();
    });
  }

  function attachEvents() {
    const actions = root.querySelectorAll('[data-action]');
    actions.forEach((button) => {
      const action = button.dataset.action;
      const payload = button.dataset.payload ? JSON.parse(button.dataset.payload) : undefined;
      button.onclick = () => {
        root.dispatchEvent(new CustomEvent('app-action', { detail: { action, payload } }));
      };
    });
  }

  return { root, state, setState, mount, subscribe };
}

export function html(strings, ...values) {
  return strings.reduce((result, part, index) => {
    return result + part + (index < values.length ? values[index] : '');
  }, '');
}
