
const songs = window.WEDDING_SONGS || [];
const STORAGE_KEY = "ian-catherine-wedding-claimed-v1";
let selectedSong = null;
let filter = "all";

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

function getClaims(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function saveClaims(claims){ localStorage.setItem(STORAGE_KEY, JSON.stringify(claims)); }

function render(){
  const claims = getClaims();
  const q = search.value.trim().toLowerCase();
  const filtered = songs.filter(song => {
    const isClaimed = !!claims[song.id];
    const matchesText = !q || `${song.title} ${song.artist}`.toLowerCase().includes(q);
    const matchesFilter = filter === "all" || (filter === "available" && !isClaimed) || (filter === "claimed" && isClaimed);
    return matchesText && matchesFilter;
  });

  list.innerHTML = filtered.map(song => {
    const claim = claims[song.id];
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
  availableCount.textContent = songs.length - totalClaimed;
  claimedCount.textContent = totalClaimed;
  emptyState.classList.toggle("hidden", filtered.length !== 0);
}
function escapeHtml(value){
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
function openSong(id){
  const claims = getClaims();
  if(claims[id]) return render();
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
function closeModal(){
  backdrop.classList.add("hidden");
  document.body.style.overflow = "";
  guestName.value = "";
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
  stepChoose.classList.add("hidden"); stepName.classList.remove("hidden");
  setTimeout(() => guestName.focus(), 100);
});
document.getElementById("backButton").addEventListener("click", () => {
  stepName.classList.add("hidden"); stepChoose.classList.remove("hidden");
});
document.getElementById("lockButton").addEventListener("click", () => {
  const name = guestName.value.trim();
  if(!name){ guestName.focus(); return; }
  const claims = getClaims();
  if(claims[selectedSong.id]){
    alert("Sorry — somebody has already taken this song.");
    closeModal(); render(); return;
  }
  claims[selectedSong.id] = { name, claimedAt: new Date().toISOString() };
  saveClaims(claims);
  document.getElementById("doneTitle").textContent = selectedSong.title;
  stepName.classList.add("hidden"); stepDone.classList.remove("hidden");
  render();
});
document.getElementById("doneButton").addEventListener("click", closeModal);
render();
