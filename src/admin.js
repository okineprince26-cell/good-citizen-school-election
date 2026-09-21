import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const app = document.getElementById('app');

let currentUser = null;

function clearApp() {
  app.innerHTML = '';
}

function button(text, action) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  b.addEventListener('click', action);
  return b;
}

function message(text) {
  const p = document.createElement('p');
  p.textContent = text;
  return p;
}

/* =========================
   START
========================= */

async function start() {
  const sessionResult = await supabase.auth.getSession();

  if (
    sessionResult.error ||
    !sessionResult.data.session
  ) {
    showLogin();
    return;
  }

  currentUser = sessionResult.data.session.user;

  const adminCheck =
    await supabase.rpc('is_admin');

  if (
    adminCheck.error ||
    adminCheck.data !== true
  ) {
    showNotAuthorized();
    return;
  }

  showDashboard();
}

/* =========================
   LOGIN
========================= */

function showLogin(errorText = '') {
  clearApp();

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

  const loginMessage = document.createElement('p');
  loginMessage.textContent = errorText;

  const loginButton = button(
    'Login',
    async function () {

      loginButton.disabled = true;
      loginButton.textContent = 'Logging in...';

      const result =
        await supabase.auth.signInWithPassword({
          email: email.value.trim(),
          password: password.value
        });

      if (result.error) {

        loginMessage.textContent =
          result.error.message;

        loginButton.disabled = false;
        loginButton.textContent = 'Login';

        return;
      }

      currentUser = result.data.user;

      const adminCheck =
        await supabase.rpc('is_admin');

      if (
        adminCheck.error ||
        adminCheck.data !== true
      ) {
        await supabase.auth.signOut();

        showLogin(
          'This account is not authorized as an administrator.'
        );

        return;
      }

      showDashboard();
    }
  );

  app.appendChild(title);
  app.appendChild(heading);
  app.appendChild(email);
  app.appendChild(document.createElement('br'));
  app.appendChild(password);
  app.appendChild(document.createElement('br'));
  app.appendChild(loginButton);
  app.appendChild(loginMessage);
}

/* =========================
   NOT AUTHORIZED
========================= */

function showNotAuthorized() {
  clearApp();

  const title = document.createElement('h1');
  title.textContent = 'GOOD CITIZEN SCHOOL';

  const p = message(
    'This account is not authorized as an administrator.'
  );

  const logout = button(
    'Logout',
    async function () {
      await supabase.auth.signOut();
      showLogin();
    }
  );

  app.appendChild(title);
  app.appendChild(p);
  app.appendChild(logout);
}

/* =========================
   DASHBOARD
========================= */

function showDashboard() {
  clearApp();

  const title = document.createElement('h1');
  title.textContent = 'GOOD CITIZEN SCHOOL';

  const heading = document.createElement('h2');
  heading.textContent =
    'Student Prefect Election 2026';

  const admin = message(
    'Admin: ' + (currentUser.email || '')
  );

  const nav = document.createElement('div');

  nav.appendChild(
    button('Election', loadElection)
  );

  nav.appendChild(
    button('Students', loadStudents)
  );

  nav.appendChild(
    button('Candidates', loadCandidates)
  );

  nav.appendChild(
    button('Results', loadResults)
  );

  nav.appendChild(
    button('Logout', async function () {
      await supabase.auth.signOut();
      showLogin();
    })
  );

  const content = document.createElement('div');
  content.id = 'content';

  app.appendChild(title);
  app.appendChild(heading);
  app.appendChild(admin);
  app.appendChild(nav);
  app.appendChild(content);

  loadElection();
}

/* =========================
   ELECTION
========================= */

async function loadElection() {

  const content =
    document.getElementById('content');

  content.innerHTML =
    '<h3>Election Control</h3><p>Loading...</p>';

  const result =
    await supabase
      .from('election_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

  if (result.error) {
    content.textContent =
      result.error.message;
    return;
  }

  if (!result.data) {
    content.textContent =
      'No election settings were found.';
    return;
  }

  const settings = result.data;

  content.innerHTML = '';

  const heading =
    document.createElement('h3');

  heading.textContent =
    'Election Control';

  const status =
    document.createElement('p');

  status.textContent =
    'Status: ' +
    (settings.is_open
      ? 'OPEN'
      : 'CLOSED');

  const toggle =
    button(
      settings.is_open
        ? 'Close Voting'
        : 'Open Voting',
      async function () {

        toggle.disabled = true;

        const update =
          await supabase.rpc(
            'admin_set_election_open',
            {
              p_is_open:
                !settings.is_open
            }
          );

        if (update.error) {
          alert(update.error.message);
          toggle.disabled = false;
          return;
        }

        loadElection();
      }
    );

  const resultsStatus =
    document.createElement('p');

  resultsStatus.textContent =
    'Student results: ' +
    (
      settings.show_student_results
        ? 'VISIBLE'
        : 'HIDDEN'
    );

  content.appendChild(heading);
  content.appendChild(status);
  content.appendChild(toggle);
  content.appendChild(resultsStatus);
}

/* =========================
   STUDENTS
========================= */

async function loadStudents() {

  const content =
    document.getElementById('content');

  content.innerHTML =
    '<h3>Students</h3><p>Loading...</p>';

  const result =
    await supabase
      .from('students')
      .select(
        'id, name, has_voted, created_at'
      )
      .order('id');

  if (result.error) {
    content.textContent =
      result.error.message;
    return;
  }

  content.innerHTML = '';

  const heading =
    document.createElement('h3');

  heading.textContent =
    'Students';

  content.appendChild(heading);

  /* Add student */

  const addHeading =
    document.createElement('h4');

  addHeading.textContent =
    'Add Student';

  const nameInput =
    document.createElement('input');

  nameInput.placeholder =
    'Student name';

  const addButton =
    button(
      'Add Student',
      async function () {

        const name =
          nameInput.value.trim();

        if (!name) {
          alert('Enter the student name.');
          return;
        }

        addButton.disabled = true;
        addButton.textContent =
          'Adding...';

        const result =
          await supabase.rpc(
            'admin_add_student',
            {
              p_name: name
            }
          );

        if (result.error) {

          alert(result.error.message);

          addButton.disabled = false;
          addButton.textContent =
            'Add Student';

          return;
        }

        const code =
          result.data.voting_code;

        alert(
          'Student added successfully.\n\n' +
          'Student: ' +
          result.data.name +
          '\n\n' +
          'Voting Code: ' +
          code +
          '\n\n' +
          'Give this code to the student.'
        );

        nameInput.value = '';

        loadStudents();
      }
    );

  content.appendChild(addHeading);
  content.appendChild(nameInput);
  content.appendChild(addButton);

  /* Student list */

  const listHeading =
    document.createElement('h4');

  listHeading.textContent =
    'Student List';

  content.appendChild(listHeading);

  const students =
    result.data || [];

  if (!students.length) {

    content.appendChild(
      message('No students found.')
    );

    return;
  }

  students.forEach(function (student) {

    const row =
      document.createElement('div');

    row.style.marginBottom = '8px';

    row.textContent =
      student.name +
      ' — ' +
      (
        student.has_voted
          ? 'VOTED'
          : 'NOT VOTED'
      );

    content.appendChild(row);
  });
}

/* =========================
   CANDIDATES
========================= */

async function loadCandidates() {

  const content =
    document.getElementById('content');

  content.innerHTML =
    '<h3>Candidates</h3><p>Loading...</p>';

  const [
    candidatesResult,
    positionsResult
  ] = await Promise.all([

    supabase
      .from('candidates')
      .select(
        'id, position_id, name, photo_url, display_order, active'
      )
      .order('position_id')
      .order('display_order'),

    supabase
      .from('positions')
      .select(
        'id, name, display_order'
      )
      .order('display_order')
  ]);

  if (candidatesResult.error) {
    content.textContent =
      candidatesResult.error.message;
    return;
  }

  if (positionsResult.error) {
    content.textContent =
      positionsResult.error.message;
    return;
  }

  const candidates =
    candidatesResult.data || [];

  const positions =
    positionsResult.data || [];

  content.innerHTML = '';

  const heading =
    document.createElement('h3');

  heading.textContent =
    'Candidates';

  content.appendChild(heading);

  /* Add candidate */
  const addSection = document.createElement('section');

  const addHeading = document.createElement('h4');
  addHeading.textContent = 'Add Candidate';

  const positionSelect = document.createElement('select');

  positions.forEach(function (position) {
    const option = document.createElement('option');
    option.value = position.id;
    option.textContent = position.name;
    positionSelect.appendChild(option);
  });

  const candidateNameInput = document.createElement('input');
  candidateNameInput.type = 'text';
  candidateNameInput.placeholder = 'Candidate name';

  const addCandidateButton = button(
    'Add Candidate',
    async function () {
      const name = candidateNameInput.value.trim();
      const positionId = Number(positionSelect.value);

      if (!name) {
        alert('Enter the candidate name.');
        return;
      }

      if (!positionId) {
        alert('Select a position.');
        return;
      }

      addCandidateButton.disabled = true;
      addCandidateButton.textContent = 'Adding...';

      const result = await supabase.rpc(
        'admin_add_candidate',
        {
          p_position_id: positionId,
          p_name: name,
          p_photo_url: null
        }
      );

      if (result.error) {
        alert(result.error.message);
        addCandidateButton.disabled = false;
        addCandidateButton.textContent = 'Add Candidate';
        return;
      }

      alert('Candidate added successfully.');
      candidateNameInput.value = '';
      loadCandidates();
    }
  );

  addSection.appendChild(addHeading);
  addSection.appendChild(positionSelect);
  addSection.appendChild(candidateNameInput);
  addSection.appendChild(addCandidateButton);

  content.appendChild(addSection);

  positions.forEach(function (position) {

    const section =
      document.createElement('section');

    const positionHeading =
      document.createElement('h4');

    positionHeading.textContent =
      position.name;

    section.appendChild(
      positionHeading
    );

    const positionCandidates =
      candidates.filter(function (candidate) {
        return String(
          candidate.position_id
        ) === String(position.id);
      });

    positionCandidates.forEach(
      function (candidate) {

        const row =
          document.createElement('div');

        row.style.marginBottom =
          '12px';

        const name =
          document.createElement('strong');

        name.textContent =
          candidate.name;

        const status =
          document.createElement('span');

        status.textContent =
          candidate.active
            ? ' — ACTIVE'
            : ' — INACTIVE';

        const rename =
          button(
            'Rename',
            async function () {

              const newName =
                prompt(
                  'Enter the new candidate name:',
                  candidate.name
                );

              if (
                !newName ||
                !newName.trim()
              ) {
                return;
              }

              const update =
                await supabase.rpc(
                  'admin_update_candidate',
                  {
                    p_candidate_id:
                      candidate.id,
                    p_name:
                      newName.trim()
                  }
                );

              if (update.error) {
                alert(
                  update.error.message
                );
                return;
              }

              loadCandidates();
            }
          );

        const toggle =
          button(
            candidate.active
              ? 'Deactivate'
              : 'Activate',
            async function () {

              const update =
                await supabase.rpc(
                  'admin_set_candidate_active',
                  {
                    p_candidate_id:
                      candidate.id,
                    p_is_active:
                      !candidate.active
                  }
                );

              if (update.error) {
                alert(
                  update.error.message
                );
                return;
              }

              loadCandidates();
            }
          );

        row.appendChild(name);
        row.appendChild(status);
        row.appendChild(
          document.createTextNode(' ')
        );
        row.appendChild(rename);
        row.appendChild(toggle);

        section.appendChild(row);
      }
    );

    content.appendChild(section);
  });
}

/* =========================
   RESULTS
========================= */

async function loadResults() {

  const content =
    document.getElementById('content');

  content.innerHTML =
    '<h3>Results</h3><p>Loading...</p>';

  const result =
    await supabase.rpc(
      'get_admin_results'
    );

  if (result.error) {
    content.textContent =
      result.error.message;
    return;
  }

  content.innerHTML = '';

  const heading =
    document.createElement('h3');

  heading.textContent =
    'Election Results';

  content.appendChild(heading);

  const rows =
    result.data || [];

  if (!rows.length) {

    content.appendChild(
      message('No results available yet.')
    );

    return;
  }

  let currentPosition = null;
  let section = null;

  rows.forEach(function (row) {

    if (
      currentPosition !==
      row.position_name
    ) {

      currentPosition =
        row.position_name;

      section =
        document.createElement('section');

      const position =
        document.createElement('h4');

      position.textContent =
        row.position_name;

      section.appendChild(position);

      content.appendChild(section);
    }

    const item =
      document.createElement('div');

    item.style.marginBottom =
      '6px';

    item.textContent =
      row.candidate_name +
      ': ' +
      row.vote_count +
      ' votes (' +
      Number(row.percentage)
        .toFixed(1) +
      '%)';

    section.appendChild(item);
  });
}

/* =========================
   RUN
========================= */

start();
