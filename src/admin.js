import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const app = document.getElementById('app');

if (!url || !key) {
  app.textContent = 'Supabase environment variables are missing.';
} else {
  const supabase = createClient(url, key);

  app.textContent = 'Connecting to Supabase...';

  async function start() {
    try {
      const result = await supabase.auth.getSession();

      if (result.error) {
        app.textContent = 'Supabase error: ' + result.error.message;
        return;
      }

      if (!result.data.session) {
        showLogin();
        return;
      }

      showDashboard(result.data.session.user);

    } catch (error) {
      app.textContent = 'Connection error: ' + (error.message || String(error));
    }
  }

  function showLogin() {
    app.innerHTML = '';

    const title = document.createElement('h1');
    title.textContent = 'GOOD CITIZEN SCHOOL';

    const heading = document.createElement('h2');
    heading.textContent = 'Admin Login';

    const email = document.createElement('input');
    email.type = 'email';
    email.placeholder = 'Admin email';

    const password = document.createElement('input');
    password.type = 'password';
    password.placeholder = 'Password';

    const button = document.createElement('button');
    button.textContent = 'Login';

    const message = document.createElement('p');

    app.appendChild(title);
    app.appendChild(heading);
    app.appendChild(email);
    app.appendChild(document.createElement('br'));
    app.appendChild(password);
    app.appendChild(document.createElement('br'));
    app.appendChild(button);
    app.appendChild(message);

    button.addEventListener('click', async function () {
      button.disabled = true;
      button.textContent = 'Logging in...';
      message.textContent = '';

      try {
        const result = await supabase.auth.signInWithPassword({
          email: email.value.trim(),
          password: password.value
        });

        if (result.error) {
          message.textContent = result.error.message;
          button.disabled = false;
          button.textContent = 'Login';
          return;
        }

        showDashboard(result.data.user);

      } catch (error) {
        message.textContent = error.message || String(error);
        button.disabled = false;
        button.textContent = 'Login';
      }
    });
  }

  async function showDashboard(user) {
    app.innerHTML = '';

    const title = document.createElement('h1');
    title.textContent = 'GOOD CITIZEN SCHOOL';

    const heading = document.createElement('h2');
    heading.textContent = 'Student Prefect Election 2026';

    const logged = document.createElement('p');
    logged.textContent = 'Admin: ' + user.email;

    const loading = document.createElement('p');
    loading.textContent = 'Loading election settings...';

    app.appendChild(title);
    app.appendChild(heading);
    app.appendChild(logged);
    app.appendChild(loading);

    try {
      const result = await supabase
        .from('election_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (result.error) {
        loading.textContent = 'Database error: ' + result.error.message;
        return;
      }

      const settings = result.data;

      if (!settings) {
        loading.textContent = 'No election settings were found.';
        return;
      }

      loading.textContent =
        'Election status: ' + (settings.is_open ? 'OPEN' : 'CLOSED');

      const button = document.createElement('button');
      button.textContent = settings.is_open
        ? 'Close Voting'
        : 'Open Voting';

      const logout = document.createElement('button');
      logout.textContent = 'Logout';

      app.appendChild(button);
      app.appendChild(logout);

      button.addEventListener('click', async function () {
        button.disabled = true;

        const update = await supabase
          .from('election_settings')
          .update({
            is_open: !settings.is_open
          })
          .eq('id', settings.id);

        if (update.error) {
          loading.textContent = 'Update error: ' + update.error.message;
          button.disabled = false;
          return;
        }

        showDashboard(user);
      });

      logout.addEventListener('click', async function () {
        await supabase.auth.signOut();
        showLogin();
      });

    } catch (error) {
      loading.textContent =
        'Unexpected error: ' + (error.message || String(error));
    }
  }

  start();
}
