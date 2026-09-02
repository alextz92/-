/**
 * Secure frontend API client.
 * Put this in secure-api.js and include it AFTER your app code or merge the functions.
 *
 * IMPORTANT: BACKEND_URL is NOT a secret. It is okay for it to be public.
 * Security comes from server-side authentication and authorization.
 */

const BACKEND_URL = 'https://script.google.com/macros/s/AKfycby5KG33FtPNsqgk6_lnLGfbsCrCMt1rtJtrtt8SOIbEeQQChtoHdq6SFaVxm39PEWou/exec';

const SecureAPI = (() => {
  const TOKEN_KEY = 'prod_app_session_v2';
  const ROLE_KEY = 'prod_app_role_v2';
  const CLIENT_KEY = 'prod_app_client_id_v2';

  function getClientId() {
    let id = localStorage.getItem(CLIENT_KEY);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
      localStorage.setItem(CLIENT_KEY, id);
    }
    return id;
  }

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  }

  function getRole() {
    return sessionStorage.getItem(ROLE_KEY) || '';
  }

  async function request(action, extra = {}, requireAuth = true) {
    const payload = {
      action,
      ...extra,
      clientId: getClientId()
    };

    if (requireAuth) payload.token = getToken();

    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      throw new Error('השרת החזיר תשובה לא תקינה');
    }

    if (!data.ok) {
      if (data.error === 'SESSION_EXPIRED' || data.error === 'UNAUTHORIZED') {
        clearSession();
      }
      const err = new Error(data.error || 'REQUEST_FAILED');
      err.code = data.error;
      throw err;
    }

    return data;
  }

  async function login(username, password) {
    const data = await request('login', { username, password }, false);
    sessionStorage.setItem(TOKEN_KEY, data.token);
    sessionStorage.setItem(ROLE_KEY, data.role);
    return data;
  }

  async function logout() {
    try {
      if (getToken()) await request('logout');
    } finally {
      clearSession();
    }
  }

  function clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ROLE_KEY);
  }

  return {
    login,
    logout,
    getRole,
    isLoggedIn: () => !!getToken(),
    me: () => request('me'),
    list: () => request('list'),
    save: (data) => request('save', { data }),
    saveDraft: (data, key) => request('saveDraft', { data, key }),
    clearDraft: (key) => request('clearDraft', { key }),
    delete: (id) => request('delete', { id })
  };
})();
