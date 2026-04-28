// public/js/auth.js
// Handles the login and register form submissions.
// The HTML page sets a global PAGE_MODE = 'login' | 'register'.

(function () {
  // If already logged in, skip auth pages.
  if (Auth.isLoggedIn()) {
    window.location.href = '/index.html';
    return;
  }

  const form = document.getElementById('authForm');
  const alertBox = document.getElementById('alert');
  const submitBtn = document.getElementById('submitBtn');

  function showError(message) {
    alertBox.textContent = message;
    alertBox.className = 'alert alert-error show';
  }

  function clearAlert() {
    alertBox.className = 'alert';
    alertBox.textContent = '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = window.PAGE_MODE === 'login' ? 'Signing in…' : 'Creating account…';

    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const result = window.PAGE_MODE === 'login'
        ? await Api.login(data)
        : await Api.register(data);

      Auth.setToken(result.data.token);
      Auth.setUser(result.data.user);
      window.location.href = '/index.html';
    } catch (err) {
      showError(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
})();
