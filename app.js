
const songs = window.WEDDING_SONGS || [];
const SUPABASE_URL = "https://udgjglcwbljkrjzclxdg.supabase.co";
const SUPABASE_KEY = "sb_publishable_3l9YQHJYSMn4EUUGbB8MZA_p2P_Ydxw";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

function headers(extra = {}) {
  return {
    "apikey": SUPABASE_KEY,
    
    ...extra
  };
}




async function loadClaims() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/song_claims?select=song_id,guest_name,claimed_at`, {
      headers: headers({ "Accept": "application/json" })
    });
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    claims = Object.fromEntries(rows.map(r => [String(r.song_id), {
      name: r.guest_name,
      claimedAt: r.claimed_at
    }]));
    render();
  } catch (err) {
    console.error("Could not load claims", err);
  }
}

function render() {
  const q = search.value.trim().toLowerCase();
  const filtered = songs.filter(song => {
    const isClaimed = !!claims[String(song.id)];
    const matchesText = !q || `${song.title} ${song.artist}`.toLowerCase().includes(q);
    const matchesFilter = filter === "all" || (filter === "available" && !isClaimed) || (filter === "claimed" && isClaimed);
    return matchesText && matchesFilter;
  });

  list.innerHTML = filtered.map(song => {
    const claim = claims[String(song.id)];
    return `
      <article class="song ${claim ? "claimed" : ""}">
        <div class="song-number">${String(song.id).padStart(3,"0")}</div>
        <div>
          <div class="song-title">${escapeHtml(song.title)}</div>
          <div class="song-artist">${escapeHtml(song.artist)}</div>
          ${claim ? `<div class="taken-by">Taken by ${escapeHtml(claim.name)}</div>` : ""}
        </div>
        <button class="choose" data-id="${song.id}" ${claim ? "disabled" : ""}>${claim ? "TAKEN" : "CHOOSE"}</button>
      </article>`;
  }).join("");

  const totalClaimed = Object.keys(claims).length;
  availableCount.textContent = Math.max(0, songs.length - totalClaimed);
  claimedCount.textContent = totalClaimed;
  emptyState.classList.toggle("hidden", filtered.length !== 0);
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

async function openSong(id) {
  await loadClaims();
  if (claims[String(id)]) return;
  selectedSong = songs.find(s => s.id === id);
  if(!selectedSong) return;
  document.getElementById("modalTitle").textContent = selectedSong.title;
  document.getElementById("modalArtist").textContent = selectedSong.artist;
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
  if(!name) {
    guestName.focus();
    return;
  }
  const lockButton = document.getElementById("lockButton");
  lockButton.disabled = true;
  lockButton.textContent = "Locking it in…";

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/song_claims`, {
      method: "POST",
      headers: headers({
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      }),
      body: JSON.stringify({
        song_id: selectedSong.id,
        guest_name: name
      })
    });

    if (res.status === 409) {
      alert("Sorry — somebody has just taken this song. Pick another one.");
      closeModal();
      await loadClaims();
      return;
    }
    if (!res.ok) throw new Error(await res.text());

    claims[String(selectedSong.id)] = { name, claimedAt: new Date().toISOString() };
    document.getElementById("doneTitle").textContent = selectedSong.title;
    stepName.classList.add("hidden");
    stepDone.classList.remove("hidden");
    render();
  } catch (err) {
    console.error("Claim failed", err);
    alert( err.message);
  } finally {
    lockButton.disabled = false;
    lockButton.textContent = "Lock in my song";
  }
}

list.addEventListener("click", e => {
  const btn = e.target.closest("[data-id]");
  if(btn && !btn.disabled) openSong(Number(btn.dataset.id));
});
search.addEventListener("input", render);
document.querySelectorAll(".chip").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".chip").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  filter = btn.dataset.filter;
  render();
}));
document.getElementById("closeModal").addEventListener("click", closeModal);
backdrop.addEventListener("click", e => { if(e.target === backdrop) closeModal(); });
document.getElementById("paidButton").addEventListener("click", () => {
  stepChoose.classList.add("hidden");
  stepName.classList.remove("hidden");
  setTimeout(() => guestName.focus(), 100);
});
document.getElementById("backButton").addEventListener("click", () => {
  stepName.classList.add("hidden");
  stepChoose.classList.remove("hidden");
});
document.getElementById("lockButton").addEventListener("click", claimSong);
document.getElementById("doneButton").addEventListener("click", closeModal);

async function loadClaims() {
  try {
    const { data, error } = await supabaseClient
      .from("song_claims")
      .select("song_id, guest_name, claimed_at");

    if (error) throw error;

    claims = Object.fromEntries(
      (data || []).map(r => [
        String(r.song_id),
        {
          name: r.guest_name,
          claimedAt: r.claimed_at
        }
      ])
    );

    render();
  } catch (err) {
    console.error("Could not load claims", err);
  }
}
