```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const app = document.getElementById('app');

function loginScreen(message) {
  app.innerHTML = '';

  const title = document.createElement('h1');
  title.textContent = 'GOOD CITIZEN SCHOOL';

  const heading = document.createElement('h2');
  heading.textContent = 'Admin Login';

  const email = document.createElement('input');
  email.id = 'email';
  email.type = 'email';
  email.placeholder = 'Admin email';

  const password = document.createElement('input');
  password.id = 'password';
  password.type = 'password';
  password.placeholder = 'Password';

  const button = document.createElement('button');
  button.id = 'login';
  button.type = 'button';
  button.textContent = 'Login';

  const msg = document.createElement('p');
  msg.id = 'message';
  msg.textContent = message || '';

  app.appendChild(title);
  app.appendChild(heading);
  app.appendChild(email);
  app.appendChild(document.createElement('br'));
  app.appendChild(password);
  app.appendChild(document.createElement('br'));
  app.appendChild(button);
  app.appendChild(msg);

  button.addEventListener('click', async function () {
    const emailValue = email.value.trim();
    const passwordValue = password.value;

    if (!emailValue || !passwordValue) {
      msg.textContent = 'Please enter your email and password.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Logging in...';
    msg.textContent = '';

    try {
      const result = await supabase.auth.signInWithPassword({
        email: emailValue,
        password: passwordValue
      });

      if (result.error) {
        msg.textContent = result.error.message;
        button.disabled = false;
        button.textContent = 'Login';
        return;
      }

      if (!result.data || !result.data.user) {
        msg.textContent = 'Login failed.';
        button.disabled = false;
        button.textContent = 'Login';
        return;
      }

      dashboard();

    } catch (error) {
      msg.textContent = error.message || 'An unexpected error occurred.';
      button.disabled = false;
      button.textContent = 'Login';
    }
  });
}

async function dashboard() {
  const userResult = await supabase.auth.getUser();

  if (userResult.error || !userResult.data.user) {
    loginScreen();
    return;
  }

  const user = userResult.data.user;

  const settingsResult = await supabase
    .from('election_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (settingsResult.error) {
    app.innerHTML = '';

    const title = document.createElement('h1');
    title.textContent = 'GOOD CITIZEN SCHOOL';

    const heading = document.createElement('h2');
    heading.textContent = 'Admin Dashboard';

    const loggedIn = document.createElement('p');
    loggedIn.textContent = 'Logged in as: ' + user.email;

    const error = document.createElement('p');
    error.textContent = settingsResult.error.message;

    const logout = document.createElement('button');
    logout.textContent = 'Logout';

    app.appendChild(title);
    app.appendChild(heading);
    app.appendChild(loggedIn);
    app.appendChild(error);
    app.appendChild(logout);

    logout.addEventListener('click', async function () {
      await supabase.auth.signOut();
      loginScreen();
    });

    return;
  }

  const settings = settingsResult.data;

  app.innerHTML = '';

  const title = document.createElement('h1');
  title.textContent = 'GOOD CITIZEN SCHOOL';

  const heading = document.createElement('h2');
  heading.textContent = 'Student Prefect Election 2026';

  const loggedIn = document.createElement('p');
  loggedIn.textContent = 'Admin: ' + user.email;

  const controlHeading = document.createElement('h3');
  controlHeading.textContent = 'Election Control';

  const status = document.createElement('p');
  status.textContent = 'Status: ' + (settings.is_open ? 'OPEN' : 'CLOSED');

  const toggle = document.createElement('button');
  toggle.textContent = settings.is_open ? 'Close Voting' : 'Open Voting';

  const logout = document.createElement('button');
  logout.textContent = 'Logout';

  const message = document.createElement('p');

  app.appendChild(title);
  app.appendChild(heading);
  app.appendChild(loggedIn);
  app.appendChild(controlHeading);
  app.appendChild(status);
  app.appendChild(toggle);
  app.appendChild(logout);
  app.appendChild(message);

  toggle.addEventListener('click', async function () {
    const updateResult = await supabase
      .from('election_settings')
      .update({
        is_open: !settings.is_open
      })
      .eq('id', settings.id);

    if (updateResult.error) {
      message.textContent = updateResult.error.message;
      return;
    }

    dashboard();
  });

  logout.addEventListener('click', async function () {
    await supabase.auth.signOut();
    loginScreen();
  });
}

async function start() {
  const sessionResult = await supabase.auth.getSession();

  if (sessionResult.data.session) {
    dashboard();
  } else {
    loginScreen();
  }
}

start();
```
