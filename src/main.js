import { createClient } from '@supabase/supabase-js';
import './style.css';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const app = document.querySelector('#app');

let positions = [];
let candidates = [];
let settings = null;
let votingCode = '';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, function (char) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char];
  });
}

async function load() {
  const [
    positionsResult,
    candidatesResult,
    settingsResult
  ] = await Promise.all([
    supabase
      .from('positions')
      .select('id, name, display_order')
      .order('display_order'),

    supabase
      .from('candidates')
      .select('id, position_id, name, photo_url, display_order, active')
      .eq('active', true)
      .order('position_id')
      .order('display_order'),

    supabase
      .from('election_settings')
      .select('id, school_name, election_title, is_open, show_student_results')
      .limit(1)
      .maybeSingle()
  ]);

  if (positionsResult.error) throw positionsResult.error;
  if (candidatesResult.error) throw candidatesResult.error;
  if (settingsResult.error) throw settingsResult.error;

  positions = positionsResult.data || [];
  candidates = candidatesResult.data || [];
  settings = settingsResult.data || {};
}

function home(message = '') {
  app.innerHTML = `
    <main class="wrap">

      <header>
        <b>${esc(settings.school_name || 'GOOD CITIZEN SCHOOL')}</b>
        <h1>${esc(
          settings.election_title ||
          'Student Prefect Election 2026'
        )}</h1>
        <p>One ballot per student.</p>
      </header>

      <section class="card">

        <h2>Student Voting</h2>

        <form id="codeForm">

          <input
            id="code"
            type="text"
            placeholder="Enter your voting code"
            autocomplete="off"
            required
          >

          <button type="submit">
            Continue to Vote
          </button>

        </form>

        ${
          settings.show_student_results
            ? '<button class="alt" id="resultsButton">View Results</button>'
            : ''
        }

        <div class="status">
          ${
            settings.is_open
              ? 'Voting is open.'
              : 'Voting is currently closed.'
          }
        </div>

        ${
          message
            ? `<div class="err">${esc(message)}</div>`
            : ''
        }

      </section>

    </main>
  `;

  document.querySelector('#codeForm').addEventListener(
    'submit',
    function (event) {
      event.preventDefault();

      votingCode = document
        .querySelector('#code')
        .value
        .trim();

      if (!settings.is_open) {
        home('Voting is currently closed.');
        return;
      }

      showBallot();
    }
  );

  const resultsButton =
    document.querySelector('#resultsButton');

  if (resultsButton) {
    resultsButton.addEventListener(
      'click',
      showPublicResults
    );
  }
}

function showBallot() {
  const availablePositions = positions.filter(function (position) {
    return candidates.some(function (candidate) {
      return String(candidate.position_id) === String(position.id);
    });
  });

  app.innerHTML = `
    <main class="wrap">

      <header>
        <b>GOOD CITIZEN SCHOOL</b>
        <h1>Your Ballot</h1>
        <p>Select one candidate for every position.</p>
      </header>

      <form id="ballotForm">

        ${availablePositions.map(function (position) {

          const positionCandidates =
            candidates.filter(function (candidate) {
              return String(candidate.position_id) ===
                String(position.id);
            });

          return `
            <section class="card">

              <h2>${esc(position.name)}</h2>

              <div class="grid">

                ${positionCandidates.map(function (candidate) {

                  return `
                    <label class="candidate">

                      <input
                        type="radio"
                        name="position-${esc(position.id)}"
                        value="${esc(candidate.id)}"
                        required
                      >

                      ${
                        candidate.photo_url
                          ? `
                            <img
                              src="${esc(candidate.photo_url)}"
                              alt="${esc(candidate.name)}"
                            >
                          `
                          : ''
                      }

                      <span>
                        ${esc(candidate.name)}
                      </span>

                    </label>
                  `;

                }).join('')}

              </div>

            </section>
          `;

        }).join('')}

        <button type="submit">
          Submit Ballot
        </button>

      </form>

    </main>
  `;

  document
    .querySelector('#ballotForm')
    .addEventListener('submit', submitBallot);
}

async function submitBallot(event) {
  event.preventDefault();

  const button = event.target.querySelector(
    'button[type="submit"]'
  );

  button.disabled = true;
  button.textContent = 'Submitting...';

  const selections = [];

  for (const position of positions) {

    const selected = document.querySelector(
      `input[name="position-${position.id}"]:checked`
    );

    if (!selected) {
      voteError(
        `Please select a candidate for ${position.name}.`
      );
      return;
    }

    selections.push({
      position_id: Number(position.id),
      candidate_id: Number(selected.value)
    });
  }

  /*
   * IMPORTANT:
   * cast_ballot() performs the real server-side validation.
   *
   * It checks that:
   * - the election is open
   * - the voting code is valid
   * - the voting code has not already been used
   * - exactly one candidate is selected per position
   * - every selected candidate is currently active
   *
   * Therefore an inactive candidate cannot be submitted
   * successfully even if someone manually modifies the browser.
   */

  const { error } = await supabase.rpc(
    'cast_ballot',
    {
      entered_code: votingCode,
      selected_candidates: selections
    }
  );

  if (error) {
    voteError(error.message);
    return;
  }

  app.innerHTML = `
    <main class="wrap">

      <section class="card center">

        <h1>Vote Submitted ✓</h1>

        <p>
          Your ballot has been recorded successfully.
        </p>

        ${
          settings.show_student_results
            ? '<button id="resultsButton">View Results</button>'
            : ''
        }

      </section>

    </main>
  `;

  const resultsButton =
    document.querySelector('#resultsButton');

  if (resultsButton) {
    resultsButton.addEventListener(
      'click',
      showPublicResults
    );
  }
}

function voteError(message) {

  app.innerHTML = `
    <main class="wrap">

      <section class="card">

        <h1>Vote Not Submitted</h1>

        <div class="err">
          ${esc(message)}
        </div>

        <button id="backButton">
          Back
        </button>

      </section>

    </main>
  `;

  document
    .querySelector('#backButton')
    .addEventListener('click', home);
}

async function showPublicResults() {

  app.innerHTML = `
    <main class="wrap">

      <section class="card">

        <h1>Election Results</h1>
        <p>Loading results...</p>

      </section>

    </main>
  `;

  const { data, error } =
    await supabase.rpc('get_public_results');

  if (error) {

    app.innerHTML = `
      <main class="wrap">

        <section class="card">

          <h1>Results</h1>

          <div class="err">
            ${esc(error.message)}
          </div>

          <button id="backButton">
            Back
          </button>

        </section>

      </main>
    `;

    document
      .querySelector('#backButton')
      .addEventListener('click', home);

    return;
  }

  const results = data || [];

  app.innerHTML = `
    <main class="wrap">

      <header>
        <b>GOOD CITIZEN SCHOOL</b>
        <h1>Election Results</h1>
        <p>Results are shown as percentages.</p>
      </header>

      ${
        positions.map(function (position) {

          const positionResults =
            results.filter(function (result) {
              return result.position_name === position.name;
            });

          return `
            <section class="card">

              <h2>${esc(position.name)}</h2>

              ${
                positionResults.length
                  ? positionResults.map(function (result) {

                      return `
                        <div class="row">

                          <span>
                            ${esc(result.candidate_name)}
                          </span>

                          <b>
                            ${Number(result.percentage).toFixed(1)}%
                          </b>

                        </div>
                      `;

                    }).join('')
                  : '<p>No results available.</p>'
              }

            </section>
          `;

        }).join('')
      }

      <button id="backButton">
        Back
      </button>

    </main>
  `;

  document
    .querySelector('#backButton')
    .addEventListener('click', home);
}

load()
  .then(function () {
    home();
  })
  .catch(function (error) {

    app.innerHTML = `
      <main class="wrap">

        <section class="card">

          <h1>Connection Error</h1>

          <p>
            ${esc(error.message)}
          </p>

        </section>

      </main>
    `;

  });
