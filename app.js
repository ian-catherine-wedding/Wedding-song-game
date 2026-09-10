const songs = window.WEDDING_SONGS || [];

const SUPABASE_URL = "https://udgiglcwbljkrjzclxdg.supabase.co";
const SUPABASE_KEY = "sb_publishable_3l9YQHJYSMn4EUUGbB8MZA_p2P_Ydxw";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let selectedSong = null;
let filter = "all";
let claims = {};

const list = document.getElementById("songList");
const search = document.getElementById("searchInput");
const availableCount = document.getElementById("availableCount");
const claimedCount = document.getElementById("claimedCount");
const emptyState = document.getElementById("emptyState");

const backdrop = document.getElementById("modalBackdrop");
const stepChoose = document.getElementById("stepChoose");
const stepName = document.getElementById("stepName");
const stepDone = document.getElementById("stepDone");
const guestName = document.getElementById("guestName");

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.add("hidden");
  });

  const page = document.getElementById(pageId);

  if (page) {
    page.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

document.querySelectorAll(".game-card").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

document.querySelectorAll(".back-home").forEach(button => {
  button.addEventListener("click", () => {
    showPage("homePage");
  });
});

async function loadClaims() {
  try {
    const { data, error } = await supabaseClient
      .from("song_claims")
      .select("song_id, guest_name, claimed_at");

    if (error) throw error;

    claims = Object.fromEntries(
      (data || []).map(row => [
        String(row.song_id),
        {
          name: row.guest_name,
          claimedAt: row.claimed_at
        }
      ])
    );

    render();
  } catch (err) {
    console.error("Could not load claims", err);
  }
}

function render() {
  if (!list || !search) return;

  const q = search.value.trim().toLowerCase();

  const filtered = songs.filter(song => {
    const isClaimed = !!claims[String(song.id)];

    const matchesText =
      !q ||
      `${song.title} ${song.artist}`
        .toLowerCase()
        .includes(q);

    const matchesFilter =
      filter === "all" ||
      (filter === "available" && !isClaimed) ||
      (filter === "claimed" && isClaimed);

    return matchesText && matchesFilter;
  });

  list.innerHTML = filtered
    .map(song => {
      const claim = claims[String(song.id)];

      return `
        <article class="song ${claim ? "claimed" : ""}">

          <div class="song-number">
            ${String(song.id).padStart(3, "0")}
          </div>

          <div>

            <div class="song-title">
              ${escapeHtml(song.title)}
            </div>

            <div class="song-artist">
              ${escapeHtml(song.artist)}
            </div>

            ${
              claim
                ? `
                  <div class="taken-by">
                    Taken by ${escapeHtml(claim.name)}
                  </div>
                `
                : ""
            }

          </div>

          <button
            class="choose"
            data-id="${song.id}"
            ${claim ? "disabled" : ""}
          >
            ${claim ? "TAKEN" : "CHOOSE"}
          </button>

        </article>
      `;
    })
    .join("");

  const totalClaimed = Object.keys(claims).length;

  if (availableCount) {
    availableCount.textContent = Math.max(
      0,
      songs.length - totalClaimed
    );
  }

  if (claimedCount) {
    claimedCount.textContent = totalClaimed;
  }

  if (emptyState) {
    emptyState.classList.toggle(
      "hidden",
      filtered.length !== 0
    );
  }
}

async function openSong(id) {
  await loadClaims();

  if (claims[String(id)]) return;

  selectedSong = songs.find(song => song.id === id);

  if (!selectedSong) return;

  document.getElementById("modalTitle").textContent =
    selectedSong.title;

  document.getElementById("modalArtist").textContent =
    selectedSong.artist;

  stepChoose.classList.remove("hidden");
  stepName.classList.add("hidden");
  stepDone.classList.add("hidden");

  backdrop.classList.remove("hidden");

  document.body.style.overflow = "hidden";
}

function closeModal() {
  backdrop.classList.add("hidden");

  document.body.style.overflow = "";

  guestName.value = "";
}

async function claimSong() {
  const name = guestName.value.trim();

  if (!name) {
    guestName.focus();
    return;
  }

  const lockButton = document.getElementById("lockButton");

  lockButton.disabled = true;
  lockButton.textContent = "Locking it in…";

  try {
    const { data, error } = await supabaseClient
      .from("song_claims")
      .insert({
        song_id: selectedSong.id,
        guest_name: name
      })
      .select();

    if (error) {
      if (
        error.code === "23505" ||
        String(error.message)
          .toLowerCase()
          .includes("duplicate")
      ) {
        alert(
          "Sorry — somebody has just taken this song. Pick another one."
        );

        closeModal();
        await loadClaims();

        return;
      }

      throw error;
    }

    claims[String(selectedSong.id)] = {
      name,
      claimedAt:
        data?.[0]?.claimed_at ||
        new Date().toISOString()
    };

    document.getElementById("doneTitle").textContent =
      selectedSong.title;

    stepName.classList.add("hidden");
    stepDone.classList.remove("hidden");

    render();
  } catch (err) {
    console.error("Claim failed", err);

    alert(
      "Something went wrong while locking in the song. Please try again."
    );
  } finally {
    lockButton.disabled = false;
    lockButton.textContent = "Lock in my song";
  }
}

if (list) {
  list.addEventListener("click", event => {
    const button = event.target.closest("[data-id]");

    if (button && !button.disabled) {
      openSong(Number(button.dataset.id));
    }
  });
}

if (search) {
  search.addEventListener("input", render);
}

document.querySelectorAll(".chip").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach(chip => {
      chip.classList.remove("active");
    });

    button.classList.add("active");

    filter = button.dataset.filter;

    render();
  });
});

document
  .getElementById("closeModal")
  .addEventListener("click", closeModal);

backdrop.addEventListener("click", event => {
  if (event.target === backdrop) {
    closeModal();
  }
});

document
  .getElementById("continueButton")
  .addEventListener("click", () => {
    stepChoose.classList.add("hidden");
    stepName.classList.remove("hidden");

    setTimeout(() => {
      guestName.focus();
    }, 100);
  });

document
  .getElementById("backButton")
  .addEventListener("click", () => {
    stepName.classList.add("hidden");
    stepChoose.classList.remove("hidden");
  });

document
  .getElementById("lockButton")
  .addEventListener("click", claimSong);

document
  .getElementById("doneButton")
  .addEventListener("click", closeModal);

loadClaims();

// WEDDING PREDICTIONS

const submitPredictions = document.getElementById("submitPredictions");

if (submitPredictions) {
  submitPredictions.addEventListener("click", async () => {
    const name = document.getElementById("predName").value.trim();
    const table = document.getElementById("predTable").value;

    const q1 = document.getElementById("q1").value;
    const q2 = document.getElementById("q2").value;
    const q3 = document.getElementById("q3").value;
    const q4 = document.getElementById("q4").value;
    const q5 = document.getElementById("q5").value;
    const q6 = document.getElementById("q6").value;
    const q7 = document.getElementById("q7").value;
    const q8 = document.getElementById("q8").value;
    const q9 = document.getElementById("q9").value;
    const q10 = document.getElementById("q10").value.trim();

    if (
      !name || !table || !q1 || !q2 || !q3 ||
      !q4 || !q5 || !q6 || !q7 || !q8 || !q9 || !q10
    ) {
      alert("Don’t bottle it now 😂 Fill everything in first.");
      return;
    }

    submitPredictions.disabled = true;
    submitPredictions.textContent = "Locking them in...";

    try {
      const { error } = await supabaseClient
        .from("wedding_predictions")
        .insert({
          guest_name: name,
          table_number: Number(table),
          predictions: {
            biggest_lightweight: q1,
            dancefloor_first: q2,
            shoes_off_first: q3,
            rowdiest_table: q4,
            cries_first: q5,
            happens_first: q6,
            dancing_last_table: q7,
            rogue_microphone: q8,
            explain_tomorrow: q9,
            biggest_dancefloor_song: q10
          }
        });

      if (error) throw error;

      submitPredictions.textContent = "PREDICTIONS LOCKED 🔒";
    } catch (err) {
      console.error("Prediction submission failed:", err);
      alert("Couldn’t save your predictions. Try again.");
      submitPredictions.disabled = false;
      submitPredictions.textContent = "Lock in my predictions";
    }
  });
}
       // TABLE CHALLENGES

const tableChallenges = {
  1: [
  {
    title: "Get the whole table in one photo",
    text: "Nobody hiding. Nobody conveniently in the toilet."
  },
  {
    title: "Find someone from another table with the same first name",
    text: "If you manage it, get a photo together."
  },
  {
    title: "Get at least half your table on the dancefloor",
    text: "The other half can provide moral support."
  },
  {
    title: "Get a selfie with someone you've never met before",
    text: "Congratulations. You've made a new friend."
  },
  {
    title: "Start a table-wide toast",
    text: "Short and sweet. Nobody asked for a second speech."
  }
],

 2: [
  {
    title: "Get every bridesmaid on the dancefloor at the same time",
    text: "You're bridesmaids. Attendance is compulsory."
  },
  {
    title: "Recreate the most ridiculous bridesmaid photo possible",
    text: "The wedding photographer would never approve."
  },
  {
    title: "Convince a groomsman to copy your pose",
    text: "The more ridiculous the pose, the better. Evidence required."
  },
  {
    title: "Get Ian to join your table for a photo",
    text: "Steal the groom. Catherine can have him back afterwards."
  },
  {
    title: "Get Table 3 to cheer for Table 2",
    text: "They must do it willingly. Mostly."
  }
],

3: [
  {
    title: "Get every groomsman on the dancefloor at the same time",
    text: "No hiding at the bar."
  },
  {
    title: "Recreate a boyband album cover",
    text: "Take this far more seriously than necessary."
  },
  {
    title: "Convince a bridesmaid to copy your pose",
    text: "The more ridiculous the pose, the better. Evidence required."
  },
  {
    title: "Get Catherine to join your table for a photo",
    text: "You've stolen the bride. Try not to get Ian in trouble."
  },
  {
    title: "Get Table 2 to cheer for Table 3",
    text: "If the bridesmaids refuse, negotiate harder."
  }
],

  4: [
  {
    title: "Take a serious family portrait",
    text: "Even if none of you are actually related."
  },
  {
    title: "Find someone wearing the same colour as someone on your table",
    text: "Get them together for photographic evidence."
  },
  {
    title: "Get the whole table doing a ridiculous pose",
    text: "Absolutely no dignity required."
  },
  {
    title: "Recruit someone from another table for a dance",
    text: "They must actually join in."
  },
  {
    title: "Get a photo with both Ian and Catherine",
    text: "One photo. Both newlyweds. Choose your moment wisely."
  }
],

 5: [
  {
    title: "Get everyone pointing at the same person",
    text: "No explanation required."
  },
  {
    title: "Get the whole table in one photo",
    text: "Everyone in. Nice and easy."
  },
  {
    title: "Raise a glass together",
    text: "Get a photo of the table raising a glass."
  },
  {
    title: "Get a photo with Ian or Catherine",
    text: "Either one counts. We're not making this difficult."
  },
  {
    title: "Get three people from your table on the dancefloor",
    text: "Only three. You've been given the easy table."
  }
],
  6: [
  {
    title: "Take a photo where nobody is looking at the camera",
    text: "Make it look accidentally artistic."
  },
  {
    title: "Find the oldest and youngest person at your table",
    text: "Get them together for a photo."
  },
  {
    title: "Get everyone doing their worst dance move",
    text: "Evidence required. Dignity optional."
  },
  {
    title: "Get a photo with someone holding two drinks",
    text: "Hydration. Obviously."
  },
  {
    title: "Start a cheer for Ian & Catherine",
    text: "Bonus respect if another table joins in."
  }
],

  7: [
  {
    title: "Take the most chaotic table photo",
    text: "Normal smiles will not impress us."
  },
  {
    title: "Get a selfie with another table",
    text: "The more people squeezed in, the better."
  },
  {
    title: "Get everybody at your table dancing",
    text: "One song. Full attendance."
  },
  {
    title: "Find someone you've never met and get a photo together",
    text: "Congratulations, you've made a friend."
  },
  {
    title: "Make another table applaud yours",
    text: "How you achieve this is entirely your problem."
  }
]
};

const loadChallengesButton =
  document.getElementById("loadChallenges");

const challengeSetup =
  document.getElementById("challengeSetup");

const challengeGame =
  document.getElementById("challengeGame");

const challengeList =
  document.getElementById("challengeList");

const challengeCompleted =
  document.getElementById("challengeCompleted");

let activeChallengeName = "";
let activeChallengeTable = null;
let completedChallenges = new Set();

if (loadChallengesButton) {
  loadChallengesButton.addEventListener("click", async () => {
    const name =
      document.getElementById("challengeName").value.trim();

    const table =
      document.getElementById("challengeTable").value;

    if (!name || !table) {
      alert("We need your name and table number first 😂");
      return;
    }const { data: completedData, error: completedError } =
  await supabaseClient.rpc("get_completed_challenges", {
    p_guest_name: name,
    p_table_number: Number(table)
  });

if (completedError) {
  console.error("Could not load completed challenges", completedError);
  alert("Couldn't load your previous progress. Try again.");
  return;
}

completedChallenges = new Set(
  (completedData || []).map(row => Number(row.challenge_number))
);

    activeChallengeName = name;
    activeChallengeTable = Number(table);

    

    challengeSetup.classList.add("hidden");
    challengeGame.classList.remove("hidden");

    document.getElementById(
      "challengeTableTitle"
    ).textContent = `Table ${activeChallengeTable}`;

    challengeCompleted.textContent = completedChallenges.size;

    renderChallenges();
  });
}

function renderChallenges() {
  const challenges =
    tableChallenges[activeChallengeTable] || [];

  challengeList.innerHTML = challenges
    .map((challenge, index) => {

      const challengeNumber = index + 1;

      const isDone =
        completedChallenges.has(challengeNumber);

      return `
        <div class="challenge-item">

          <div>
            <h3>
              ${challengeNumber}. ${escapeHtml(challenge.title)}
            </h3>

            <p>
              ${escapeHtml(challenge.text)}
            </p>
          </div>

          <button
            class="challenge-complete ${isDone ? "done" : ""}"
            data-challenge="${challengeNumber}"
            ${isDone ? "disabled" : ""}
          >
            ${isDone ? "DONE ✓" : "DONE"}
          </button>

        </div>
      `;
    })
    .join("");
}

if (challengeList) {
  challengeList.addEventListener("click", async event => {

    const button =
      event.target.closest(".challenge-complete");

    if (!button || button.disabled) return;

    const challengeNumber =
      Number(button.dataset.challenge);

    button.disabled = true;
    button.textContent = "Saving…";

    try {
      const { error } = await supabaseClient
        .from("table_challenges")
        .insert({
          table_number: activeChallengeTable,
          guest_name: activeChallengeName,
          challenge_number: challengeNumber,
          completed: true
        });

      if (error) throw error;

      completedChallenges.add(challengeNumber);

      challengeCompleted.textContent =
        completedChallenges.size;

      renderChallenges();

      if (completedChallenges.size === 5) {
        setTimeout(() => {
          alert(
            `TABLE ${activeChallengeTable} HAS COMPLETED ALL FIVE 🔥`
          );
        }, 250);
      }

    } catch (err) {
      console.error(
        "Challenge submission failed",
        err
      );

      alert(
        "Couldn't save that challenge. Try again."
      );

      button.disabled = false;
      button.textContent = "DONE";
    }
  });
}

const challengeHome =
  document.getElementById("challengeHome");

if (challengeHome) {
  challengeHome.addEventListener("click", () => {

    challengeGame.classList.add("hidden");
    challengeSetup.classList.remove("hidden");

    document.getElementById(
      "challengeName"
    ).value = "";

    document.getElementById(
      "challengeTable"
    ).value = "";

    activeChallengeName = "";
    activeChallengeTable = null;
    completedChallenges = new Set();

    showPage("homePage");
  });
}const coupleQuizForm = document.getElementById("coupleQuizForm");
const quizTableNumber = document.getElementById("quizTableNumber");
const quizResult = document.getElementById("quizResult");
const quizSubmitButton = document.getElementById("quizSubmitButton");

const quizAnswers = {
  q1: "Ian",
  q2: "Catherine",
  q3: "Catherine",
  q4: "Ian",
  q5: "Who gets to tell everyone",
  q6: "Catherine",
  q7: "Catherine",
  q8: "Ian",
  q9: "Catherine",
  q10: "Whoever wants the argument to end",
  q11: "Looking for something Ian’s lost",
  q12: "The dogs"
};

if (coupleQuizForm) {
  coupleQuizForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const tableNumber = Number(quizTableNumber.value);

    if (!tableNumber) {
      alert("Choose your table first.");
      return;
    }

    const answers = {};
    let score = 0;

    for (let i = 1; i <= 12; i++) {
      const questionName = `q${i}`;
      const selected = coupleQuizForm.querySelector(
        `input[name="${questionName}"]:checked`
      );

      if (!selected) {
        alert(`Answer question ${i} before submitting.`);
        return;
      }

      answers[questionName] = selected.value;

      if (selected.value === quizAnswers[questionName]) {
        score++;
      }
    }

    quizSubmitButton.disabled = true;
    quizSubmitButton.textContent = "SUBMITTING...";

    const { error } = await supabaseClient
      .from("quiz_results")
      .insert({
        table_number: tableNumber,
        answers: answers,
        score: score
      });

    if (error) {
      console.error("Quiz submission failed:", error);
      alert("Couldn’t save your quiz. Try again.");
      quizSubmitButton.disabled = false;
      quizSubmitButton.textContent = "SUBMIT ANSWERS";
      return;
    }

    quizResult.classList.remove("hidden");
    quizResult.innerHTML = `
      <h3>You scored ${score}/12</h3>
      <p>Table ${tableNumber} — reputation officially recorded.</p>
    `;

    quizSubmitButton.textContent = "SUBMITTED";
  });
}