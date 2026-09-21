import { supabase } from "./supabase.js";

const app = document.getElementById("app");

async function loadAdmin() {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    app.innerHTML = `
      <h2>Admin Login</h2>

      <input
        id="email"
        type="email"
        placeholder="Admin email"
      >

      <input
        id="password"
        type="password"
        placeholder="Password"
      >

      <button id="login">Login</button>

      <p id="message"></p>
    `;

    document.getElementById("login").onclick = async () => {
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        document.getElementById("message").textContent =
          error.message;
        return;
      }

      loadAdmin();
    };

    return;
  }

  const { data: settings, error } = await supabase
    .from("election_settings")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    app.innerHTML = `
      <h2>Admin Dashboard</h2>
      <p>Logged in as: ${user.email}</p>
      <p>Could not load election settings.</p>
      <button id="logout">Logout</button>
    `;

    document.getElementById("logout").onclick = async () => {
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
      <strong>${settings.is_open ? "OPEN" : "CLOSED"}</strong>
    </p>

    <button id="toggleElection">
      ${settings.is_open ? "Close Voting" : "Open Voting"}
    </button>

    <hr>

    <button id="logout">Logout</button>
  `;

  document.getElementById("toggleElection").onclick = async () => {
    const newStatus = !settings.is_open;

    const { error } = await supabase
      .from("election_settings")
      .update({ is_open: newStatus })
      .eq("id", settings.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadAdmin();
  };

  document.getElementById("logout").onclick = async () => {
    await supabase.auth.signOut();
    loadAdmin();
  };
}

loadAdmin();
