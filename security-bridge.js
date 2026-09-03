(() => {
  'use strict';

  function addStyles() {
    if (document.getElementById('secure-auth-style')) return;

    const style = document.createElement('style');
    style.id = 'secure-auth-style';
    style.textContent = `
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

    document.head.appendChild(style);
  }

  function showLogin(message = '') {
    addStyles();

    let overlay = document.getElementById('secure-auth-overlay');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'secure-auth-overlay';

      overlay.innerHTML = `
        <div id="secure-auth-card">
          <h2>כניסה מאובטחת</h2>
          <p>יש להתחבר כדי לצפות או לעדכן נתוני ייצור.</p>

          <label for="secure-user">משתמש</label>

          <select id="secure-user">
            <option value="operator">מפעיל</option>
            <option value="admin">מנהל</option>
          </select>

          <label for="secure-pass">סיסמה</label>

          <input
            id="secure-pass"
            type="password"
            autocomplete="current-password"
            placeholder="סיסמה"
          >

          <button id="secure-login-btn" type="button">
            כניסה
          </button>

          <div id="secure-auth-error"></div>
        </div>
      `;

      document.body.appendChild(overlay);

      const btn = overlay.querySelector('#secure-login-btn');
      const pass = overlay.querySelector('#secure-pass');

      async function submit() {
        const err = overlay.querySelector('#secure-auth-error');

        err.textContent = '';
        btn.disabled = true;
        btn.textContent = 'מתחבר...';

        try {
          const username =
            overlay.querySelector('#secure-user').value;

          await SecureAPI.login(
            username,
            pass.value
          );

          overlay.remove();

          await refreshSecureData();

          showSessionBar();

        } catch (e) {

          err.textContent =
            e.code === 'RATE_LIMITED'
              ? 'יותר מדי ניסיונות. נסה שוב מאוחר יותר.'
              : 'שם משתמש או סיסמה שגויים.';

        } finally {

          btn.disabled = false;
          btn.textContent = 'כניסה';

        }
      }

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
      overlay.querySelector('#secure-auth-error');

    if (err && message) {
      err.textContent = message;
    }
  }

  function showSessionBar() {
    addStyles();

    const old =
      document.getElementById(
        'secure-session-bar'
      );

    if (old) {
      old.remove();
    }

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

    bar.querySelector('button')
      .addEventListener(
        'click',
        async () => {

          await SecureAPI.logout();

          bar.remove();

          showLogin(
            'התנתקת מהמערכת.'
          );
        }
      );

    document.body.appendChild(bar);
  }

  async function refreshSecureData() {
    try {

      const data =
        await SecureAPI.list();

      if (window.state) {

        state.shifts =
          data.shifts || [];

        state.remoteDraft =
          data.draft || null;
      }

      if (
        typeof window.render === 'function'
      ) {
        window.render();
      }

    } catch (e) {

      if (
        e.code === 'UNAUTHORIZED' ||
        e.code === 'SESSION_EXPIRED'
      ) {

        showLogin(
          'ההתחברות פגה. התחבר מחדש.'
        );
      }

      throw e;
    }
  }

  function installOverrides() {

    window.loadShifts =
      async function () {

        if (
          !SecureAPI.isLoggedIn()
        ) {

          if (window.state) {

            state.shifts = [];

            state.remoteDraft =
              null;
          }

          return;
        }

        await refreshSecureData();
      };


    window.flushDraftSave =
      function () {

        if (
          !window.state ||
          state.screen !== 'form' ||
          !SecureAPI.isLoggedIn()
        ) {
          return;
        }

        if (
          window.draftSaveTimer
        ) {
          clearTimeout(
            draftSaveTimer
          );
        }

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


    window.saveDraftRemote =
      async function (draft) {

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
      async function () {

        try {

          await SecureAPI.clearDraft(
            'current'
          );

          return true;

        } catch (_) {

          return false;
        }
      };


    window.saveShiftRemote =
      async function (shift) {

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
      async function (id) {

        try {

          await SecureAPI.delete(
            id
          );

          return true;

        } catch (e) {

          if (
            e.code === 'FORBIDDEN' &&
            typeof window.showToast === 'function'
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
      function (id) {

        if (
          SecureAPI.getRole() === 'admin'
        ) {

          if (
            typeof window.openShiftForEdit ===
            'function'
          ) {

            openShiftForEdit(id);
          }

        } else if (
          typeof window.showToast ===
          'function'
        ) {

          showToast(
            'פעולה זו זמינה למנהל בלבד'
          );
        }
      };


    window.requestDeleteShift =
      function (id) {

        if (
          SecureAPI.getRole() === 'admin'
        ) {

          if (window.state) {

            state.confirmDeleteId =
              id;
          }

          if (
            typeof window.render ===
            'function'
          ) {

            render();
          }

        } else if (
          typeof window.showToast ===
          'function'
        ) {

          showToast(
            'פעולה זו זמינה למנהל בלבד'
          );
        }
      };
  }

  document.addEventListener(
    'DOMContentLoaded',
    async () => {

      addStyles();

      installOverrides();

      if (!window.SecureAPI) {

        showLogin(
          'שגיאת טעינה: secure-api.js לא נטען.'
        );

        return;
      }

      if (
        !SecureAPI.isLoggedIn()
      ) {

        showLogin();

        return;
      }

      try {

        await SecureAPI.me();

        await refreshSecureData();

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
