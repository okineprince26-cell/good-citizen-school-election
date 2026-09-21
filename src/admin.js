```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const app = document.querySelector('#app');

async function loadAdmin() {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    app.innerHTML = `
      <h2>Connection error</h2>
      <p>${userError.message}</p>
    `;
    return;
  }

  if (!user) {
    app.innerHTML = `
      <h2>Admin Login</h2>

      <input id="email" type="email" placeholder="Admin email">

      <input id="password" type="password" placeholder="Password">

      <button id="login">Login</button>

      <p id="message"></p>
    `;

    document.querySelector('#login').onclick = async () => {
      const email = document.querySelector('#email').value.trim();
      const password = document.querySelector('#password').value;

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        document.querySelector('#message').textContent =
          error.message;
        return;
      }

      loadAdmin();
    };

    return;
  }

  const { data: settings, error } = await supabase
    .from('election_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) {
    app.innerHTML = `
      <h2>Admin Dashboard</h2>
      <p>Logged in as: ${user.email}</p>
      <p>Could not load election settings.</p>
      <p>${error.message}</p>
      <button id="logout">Logout</button>
    `;

    document.querySelector('#logout').onclick = async () => {
      await supabase.auth.signOut();
      loadAdmin();
    };

    return;
  }

  app.innerHTML = `
    <h2>Admin Dashboard</h2>

    <p><strong>Admin:</strong> ${user.email}</p>

    <hr>

    <h3>Election Control</h3>

    <p>
      Status:
      <strong>${settings?.is_open ? 'OPEN' : 'CLOSED'}</strong>
    </p>

    <button id="toggleElection">
      ${settings?.is_open ? 'Close Voting' : 'Open Voting'}
    </button>

    <hr>

    <button id="logout">Logout</button>
  `;

  document.querySelector('#toggleElection').onclick = async () => {
    const newStatus = !settings.is_open;

    const { error } = await supabase
      .from('election_settings')
      .update({ is_open: newStatus })
      .eq('id', settings.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadAdmin();
  };

  document.querySelector('#logout').onclick = async () => {
    await supabase.auth.signOut();
    loadAdmin();
  };
}

loadAdmin();
```
