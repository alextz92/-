(() => {
  'use strict';

  const NEW_API = 'https://script.google.com/macros/s/AKfycby5KG33FtPNsqgk6_lnLGfbsCrCMt1rtJtrtt8SOIbEeQQChtoHdq6SFaVxm39PEWou/exec';

  const realFetch = window.fetch.bind(window);

  window.fetch = function(input, init) {
    const url =
      typeof input === 'string'
        ? input
        : (input && input.url) || '';

    if (
      url.includes('script.google.com/macros/s/') &&
      !url.startsWith(NEW_API)
    ) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            shifts: [],
            draft: null
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
      );
    }

    return realFetch(input, init);
  };

  function addStyles() {
    if (
      document.getElementById(
        'secure-auth-style'
      )
    ) {
      return;
    }

    const s =
      document.createElement('style');

    s.id =
      'secure-auth-style';

    s.textContent = `
      #secure-auth-overlay{
        position:fixed;
        inset:0;
        z-index:99999;
        background:#0070B5;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:20px;
        font-family:Rubik,Arial,sans-serif;
        direction:rtl;
      }

      #secure-auth-card{
        width:min(100%,380px);
        background:#fff;
        border-radius:18px;
        padding:22px;
        box-shadow:0 18px 60px rgba(0,0,0,.28);
      }

      #secure-auth-card h2{
        margin:0 0 6px;
        color:#10222B;
        font-size:22px;
      }

      #secure-auth-card p{
        margin:0 0 18px;
        color:#5B7D8A;
        font-size:13px;
      }

      #secure-auth-card label{
        display:block;
        font-weight:700;
        font-size:13px;
        margin:11px 0 5px;
        color:#10222B;
      }

      #secure-auth-card select,
      #secure-auth-card input{
        width:100%;
        padding:12px;
        border:1.5px solid #C3E0EF;
        border-radius:10px;
        font:inherit;
        font-size:16px;
        background:#fff;
      }

      #secure-auth-card button{
        width:100%;
        margin-top:16px;
        padding:13px;
        border:0;
        border-radius:11px;
        background:#D5E24C;
        color:#10222B;
        font:inherit;
        font-weight:800;
        font-size:15px;
      }

      #secure-auth-error{
        min-height:20px;
        margin-top:10px;
        color:#C0392B;
        font-size:12px;
        font-weight:700;
      }

      #secure-session-bar{
        position:fixed;
        z-index:9998;
        left:10px;
        bottom:10px;
        display:flex;
        gap:6px;
        align-items:center;
        background:rgba(16,34,43,.92);
        color:#fff;
        padding:7px 9px;
        border-radius:10px;
        font:600 11px Rubik,Arial,sans-serif;
        direction:rtl;
      }

      #secure-session-bar button{
        border:0;
        border-radius:7px;
        padding:5px 8px;
        font:700 11px Rubik,Arial,sans-serif;
        background:#D5E24C;
        color:#10222B;
      }
    `;

    document.head.appendChild(s);
  }

  function showLogin(message = '') {
    addStyles();

    let o =
      document.getElementById(
        'secure-auth-overlay'
      );

    if (!o) {
      o =
        document.createElement('div');

      o.id =
        'secure-auth-overlay';

      o.innerHTML = `
        <div id="secure-auth-card">

          <h2>
            כניסה מאובטחת
          </h2>

          <p>
            יש להתחבר כדי לצפות
            או לעדכן נתוני ייצור.
          </p>

          <label>
            משתמש
          </label>

          <select id="secure-user">
            <option value="operator">
              מפעיל
            </option>

            <option value="admin">
              מנהל
            </option>
          </select>

          <label>
            סיסמה
          </label>

          <input
            id="secure-pass"
            type="password"
            autocomplete="current-password"
            placeholder="סיסמה"
          >

          <button
            id="secure-login-btn"
            type="button"
          >
            כניסה
          </button>

          <div
            id="secure-auth-error"
          ></div>

        </div>
      `;

      document.body.appendChild(o);

      const btn =
        o.querySelector(
          '#secure-login-btn'
        );

      const pass =
        o.querySelector(
          '#secure-pass'
        );

      const submit =
        async () => {

          const err =
            o.querySelector(
              '#secure-auth-error'
            );

          err.textContent = '';

          btn.disabled = true;

          btn.textContent =
            'מתחבר...';

          try {
            await SecureAPI.login(
              o.querySelector(
                '#secure-user'
              ).value,
              pass.value
            );

            o.remove();

            await secureLoad();

            showSessionBar();

          } catch (e) {

            err.textContent =
              e.code ===
              'TOO_MANY_ATTEMPTS'
                ? 'יותר מדי ניסיונות. נסה שוב מאוחר יותר.'
                : 'שם משתמש או סיסמה שגויים.';

          } finally {

            btn.disabled = false;

            btn.textContent =
              'כניסה';
          }
        };

      btn.addEventListener(
        'click',
        submit
      );

      pass.addEventListener(
        'keydown',
        e => {
          if (e.key === 'Enter') {
            submit();
          }
        }
      );
    }

    const err =
      o.querySelector(
        '#secure-auth-error'
      );

    if (err && message) {
      err.textContent =
        message;
    }
  }

  function showSessionBar() {
    document
      .getElementById(
        'secure-session-bar'
      )
      ?.remove();

    const bar =
      document.createElement('div');

    bar.id =
      'secure-session-bar';

    bar.innerHTML = `
      <span>
        ${
          SecureAPI.getRole() === 'admin'
            ? 'מנהל'
            : 'מפעיל'
        }
      </span>

      <button type="button">
        התנתק
      </button>
    `;

    bar.querySelector(
      'button'
    ).onclick =
      async () => {

        await SecureAPI.logout();

        bar.remove();

        showLogin(
          'התנתקת מהמערכת.'
        );
      };

    document.body.appendChild(bar);
  }

  async function secureLoad() {
    const data =
      await SecureAPI.list();

    state.shifts =
      data.shifts || [];

    state.remoteDraft =
      data.draft || null;

    if (
      typeof render === 'function'
    ) {
      render();
    }
  }

  function installOverrides() {

    window.loadShifts =
      async function() {

        if (
          !SecureAPI.isLoggedIn()
        ) {

          state.shifts = [];

          state.remoteDraft =
            null;

          return;
        }

        try {

          await secureLoad();

        } catch (e) {

          if (
            e.code === 'UNAUTHORIZED' ||
            e.code === 'SESSION_EXPIRED'
          ) {

            showLogin(
              'ההתחברות פגה. התחבר מחדש.'
            );
          }
        }
      };


    window.saveDraftRemote =
      async draft => {

        try {

          await SecureAPI.saveDraft(
            draft,
            'current'
          );

          return true;

        } catch (_) {

          return false;
        }
      };


    window.clearDraftRemote =
      async () => {

        try {

          await SecureAPI.clearDraft(
            'current'
          );

          return true;

        } catch (_) {

          return false;
        }
      };


    window.flushDraftSave =
      function() {

        if (
          state.screen !== 'form' ||
          !SecureAPI.isLoggedIn()
        ) {
          return;
        }

        try {
          clearTimeout(
            draftSaveTimer
          );
        } catch (_) {}

        SecureAPI.saveDraft(
          {
            form: state.form,
            step: state.step,
            editingId:
              state.editingId || null
          },
          'current'
        ).catch(() => {});
      };


    window.saveShiftRemote =
      async shift => {

        try {

          await SecureAPI.save(
            shift
          );

          return true;

        } catch (e) {

          if (
            e.code === 'UNAUTHORIZED' ||
            e.code === 'SESSION_EXPIRED'
          ) {

            showLogin(
              'ההתחברות פגה.'
            );
          }

          return false;
        }
      };


    window.deleteShiftRemote =
      async id => {

        try {

          await SecureAPI.delete(
            id
          );

          return true;

        } catch (e) {

          if (
            e.code === 'FORBIDDEN'
          ) {

            showToast(
              'פעולה זו זמינה למנהל בלבד'
            );
          }

          if (
            e.code === 'UNAUTHORIZED' ||
            e.code === 'SESSION_EXPIRED'
          ) {

            showLogin(
              'ההתחברות פגה.'
            );
          }

          return false;
        }
      };


    window.requestEditShift =
      function(id) {

        if (
          SecureAPI.getRole() === 'admin'
        ) {

          openShiftForEdit(id);

        } else {

          showToast(
            'פעולה זו זמינה למנהל בלבד'
          );
        }
      };


    window.requestDeleteShift =
      function(id) {

        if (
          SecureAPI.getRole() === 'admin'
        ) {

          state.confirmDeleteId =
            id;

          render();

        } else {

          showToast(
            'פעולה זו זמינה למנהל בלבד'
          );
        }
      };


    window.confirmDelete =
      async function() {

        const id =
          state.confirmDeleteId;

        const ok =
          await deleteShiftRemote(id);

        if (!ok) {
          return;
        }

        await loadShifts();

        state.confirmDeleteId =
          null;

        state.screen =
          'home';

        state.editingId =
          null;

        render();

        showToast(
          t().deletedToast
        );
      };
  }

  addStyles();

  showLogin();

  document.addEventListener(
    'DOMContentLoaded',
    async () => {

      installOverrides();

      if (
        !SecureAPI.isLoggedIn()
      ) {
        return;
      }

      try {

        await SecureAPI.me();

        document
          .getElementById(
            'secure-auth-overlay'
          )
          ?.remove();

        await secureLoad();

        showSessionBar();

      } catch (_) {

        try {
          await SecureAPI.logout();
        } catch (_) {}

        showLogin(
          'יש להתחבר מחדש.'
        );
      }
    }
  );

})();
