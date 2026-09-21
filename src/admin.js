```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const app = document.querySelector('#app');

function showLogin(message = '') {
  app.innerHTML = `
    <main>
      <h1>GOOD CITIZEN SCHOOL</h1>
      <h2>Admin Login</h2>

      <input id="email" type="email" placeholder="Admin email">

      <input id="password" type="password" placeholder="Password">

      <button id="login" type="button">Login</button>

      <p id="message">${message}</p>
    </main>
  `;

  const loginButton = document.querySelector('#login');

  loginButton.addEventListener('click', async function () {
    const email = document.querySelector('#email').value.trim();
    const password = document.querySelector('#password').value;
    const messageBox = document.querySelector('#message');

    if (!email || !password) {
      messageBox.textContent = 'Please enter your email and password.';
      return;
    }

    loginButton.disabled = true;
    loginButton.textContent = 'Logging in...';
    messageBox.textContent = '';

    try {
      const result = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (result.error) {
        messageBox.textContent = result.error.message;
        loginButton.disabled = false;
        loginButton.textContent = 'Login';
        return;
      }

      if (!result.data.user) {
        messageBox.textContent = 'Login failed.';
        loginButton.disabled = false;
        loginButton.textContent = 'Login';
        return;
      }

      await loadDashboard();

    } catch (error) {
      messageBox.textContent = error.message || 'Login error.';
      loginButton.disabled = false;
      loginButton.textContent = 'Login';
    }
  });
}

async function loadDashboard() {
  const result = await supabase.auth.getUser();

  if (result.error || !result.data.user) {
    showLogin();
    return;
  }

  const user = result.data.user;

  const settingsResult = await supabase
    .from('election_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (settingsResult.error) {
    app.innerHTML = `
      <main>
        <h1>GOOD CITIZEN SCHOOL</h1>
        <h2>Admin Dashboard</h2>

        <p>Logged in as: ${user.email}</p>

        <p>${settingsResult.error.message}</p>

        <button id="logout">Logout</button>
      </main>
    `;

    document.querySelector('#logout').addEventListener('click', async function () {
      await supabase.auth.signOut();
      showLogin();
    });

    return;
  }

  const settings = settingsResult.data;

  app.innerHTML = `
    <main>
      <h1>GOOD CITIZEN SCHOOL</h1>

      <h2>Student Prefect Election 2026</h2>

      <p>Admin: ${user.email}</p>

      <hr>

      <h3>Election Control</h3>

      <p>
        Status:
        <strong>${settings.is_open ? 'OPEN' : 'CLOSED'}</strong>
      </p>

      <button id="toggleElection">
        ${settings.is_open ? 'Close Voting' : 'Open Voting'}
      </button>

      <button id="logout">Logout</button>

      <p id="dashboardMessage"></p>
    </main>
  `;

  document.querySelector('#logout').addEventListener('click', async function () {
    await supabase.auth.signOut();
    showLogin();
  });

  document.querySelector('#toggleElection').addEventListener('click', async function () {
    const newStatus = !settings.is_open;

    const updateResult = await supabase
      .from('election_settings')
      .update({
        is_open: newStatus
      })
      .eq('id', settings.id);

    const message = document.querySelector('#dashboardMessage');

    if (updateResult.error) {
      message.textContent = updateResult.error.message;
      return;
    }

    await loadDashboard();
  });
}

async function start() {
  const sessionResult = await supabase.auth.getSession();

  if (sessionResult.data.session) {
    await loadDashboard();
  } else {
    showLogin();
  }
}

start();
```
