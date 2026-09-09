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
    const q4 = document.getElementById("q4").value.trim();

    if (!name || !table || !q4) {
      alert("Don't bottle it now 😂 Fill everything in first.");
      return;
    }

    submitPredictions.disabled = true;
    submitPredictions.textContent = "Locking them in…";

    try {
      const { error } = await supabaseClient
        .from("wedding_predictions")
        .insert({
          guest_name: name,
          table_number: Number(table),
          predictions: {
            biggest_lightweight: q1,
            dancing_last: q2,
            shoes_off_first: q3,
            dancefloor_song: q4
          }
        });

      if (error) throw error;

      const predictionsMain = document.querySelector(".predictions-main");

      predictionsMain.innerHTML = `
        <div class="prediction-card prediction-success">
          <div class="tick">✓</div>
          <div class="modal-kicker">LOCKED IN</div>
          <h2>Predictions submitted.</h2>
          <p>
            No changing your mind now.<br>
            We'll see how badly you got it wrong later 😂
          </p>
          <button class="primary button back-home prediction-home">
            Back to WedPlay
          </button>
        </div>
      `;

      document
        .querySelector(".prediction-home")
        .addEventListener("click", () => showPage("homePage"));

    } catch (err) {
      console.error("Prediction submission failed", err);
      alert("Something went wrong. Try that again.");

      submitPredictions.disabled = false;
      submitPredictions.textContent = "Lock in my predictions";
    }
  });
}// TABLE CHALLENGES

const tableChallenges = {
  1: [
    {
      title: "Get the whole table in one photo",
      text: "Nobody hiding. Nobody conveniently in the toilet."
    },
    {
      title: "Get a photo with someone from another table",
      text: "Bonus respect if you didn't know them before today."
    },
    {
      title: "Get your whole table onto the dancefloor",
      text: "Yes. Even the ones claiming they don't dance."
    },
    {
      title: "Get a selfie with a member of the wedding party",
      text: "Bride and groom do not count."
    },
    {
      title: "Start a table-wide toast",
      text: "Keep it short. Nobody asked for a second speech."
    }
  ],

  2: [
    {
      title: "Recreate a famous album cover",
      text: "Use as many people from your table as possible."
    },
    {
      title: "Get someone from another table to join your photo",
      text: "Recruitment is part of the challenge."
    },
    {
      title: "Get the entire table dancing at once",
      text: "No excuses."
    },
    {
      title: "Take the most dramatic group selfie possible",
      text: "Overacting is strongly encouraged."
    },
    {
      title: "Get someone to raise a toast to your table",
      text: "Preferably someone who isn't actually sitting with you."
    }
  ],

  3: [
    {
      title: "Get a photo of everyone pretending to argue",
      text: "The more ridiculous, the better."
    },
    {
      title: "Find another table captain and take a selfie",
      text: "Diplomatic relations are encouraged."
    },
    {
      title: "Get everyone at your table doing the same dance move",
      text: "Coordination optional."
    },
    {
      title: "Get a photo with somebody you've never met before",
      text: "Make a new mate."
    },
    {
      title: "Make the whole table cheer at the same time",
      text: "Loud enough that another table notices."
    }
  ],

  4: [
    {
      title: "Take a serious family portrait",
      text: "Even if none of you are actually related."
    },
    {
      title: "Get a photo with someone wearing the same colour",
      text: "Close enough counts."
    },
    {
      title: "Get the whole table doing a ridiculous pose",
      text: "Absolutely no dignity required."
    },
    {
      title: "Recruit somebody from another table for a dance",
      text: "They must actually join in."
    },
    {
      title: "Get a table selfie before somebody disappears",
      text: "You know it's going to happen."
    }
  ],

  5: [
    {
      title: "Get everyone pointing at the same person",
      text: "No explanation required."
    },
    {
      title: "Take a photo with another table's captain",
      text: "Keep your enemies close."
    },
    {
      title: "Get the whole table onto the dancefloor",
      text: "Yes, this includes the stubborn one."
    },
    {
      title: "Get the funniest group photo you can",
      text: "We'll judge this afterwards."
    },
    {
      title: "Convince another table to cheer for yours",
      text: "Bribery isn't technically forbidden."
    }
  ],

  6: [
    {
      title: "Take a photo where nobody is looking at the camera",
      text: "Make it look accidentally artistic."
    },
    {
      title: "Get a selfie with somebody from the opposite side of the family",
      text: "Time to mingle."
    },
    {
      title: "Get everyone doing their worst dance move",
      text: "Evidence required."
    },
    {
      title: "Get a photo with somebody holding two drinks",
      text: "Hydration. Obviously."
    },
    {
      title: "Start a cheer for Ian & Catherine",
      text: "Subtlety gets no points."
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
  loadChallengesButton.addEventListener("click", () => {

    const name =
      document.getElementById("challengeName").value.trim();

    const table =
      document.getElementById("challengeTable").value;

    if (!name || !table) {
      alert("We need your name and table number first 😂");
      return;
    }

    activeChallengeName = name;
    activeChallengeTable = Number(table);

    completedChallenges = new Set();

    challengeSetup.classList.add("hidden");
    challengeGame.classList.remove("hidden");

    document.getElementById(
      "challengeTableTitle"
    ).textContent = `Table ${activeChallengeTable}`;

    challengeCompleted.textContent = "0";

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
}