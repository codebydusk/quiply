/**
 * Category manifest — maps file names to display labels.
 * Order here = order in the dropdown.
 */
const CATEGORIES = [
  { file: 'bad_advice.json',       label: 'Bad Advice' },
  { file: 'chaos.json',            label: 'Chaos' },
  { file: 'emotional_damage.json', label: 'Emotional Damage' },
  { file: 'horoscope.json',        label: 'Horoscope' },
  { file: 'insults.json',          label: 'Insults' },
  { file: 'love.json',             label: 'Love' },
  { file: 'no.json',               label: 'No.' },
  { file: 'office_excuses.json',   label: 'Office Excuses' },
];

/* ── DOM refs ── */
const photo       = document.getElementById('photo');
const shimmer     = document.getElementById('shimmer');
const quoteEl     = document.getElementById('quote');
const refreshBtn  = document.getElementById('refreshBtn');
const categoryBtn = document.getElementById('categoryBtn');
const dropdown    = document.getElementById('dropdown');

/* ── State ── */
let currentCategory = CATEGORIES[0];
let linesCache = {};   // { fileName: string[] }

/* ── Build dropdown items ── */
function buildDropdown() {
  dropdown.innerHTML = '';
  CATEGORIES.forEach((cat) => {
    const btn = document.createElement('button');
    btn.innerHTML = `<span class="dot"></span>${cat.label}`;
    if (cat.file === currentCategory.file) btn.classList.add('active');
    btn.addEventListener('click', () => selectCategory(cat));
    dropdown.appendChild(btn);
  });
}

function selectCategory(cat) {
  currentCategory = cat;
  closeDropdown();
  buildDropdown();
  showRandomQuote();
}

/* ── Dropdown toggle ── */
function toggleDropdown() {
  const isOpen = dropdown.classList.toggle('open');
  categoryBtn.classList.toggle('open', isOpen);
}

function closeDropdown() {
  dropdown.classList.remove('open');
  categoryBtn.classList.remove('open');
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.category-wrapper')) closeDropdown();
});

categoryBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleDropdown();
});

/* ── Load lines from JSON ── */
async function getLines(fileName) {
  if (linesCache[fileName]) return linesCache[fileName];
  try {
    const res = await fetch(`assets/${fileName}`);
    const data = await res.json();
    linesCache[fileName] = data;
    return data;
  } catch {
    return ['Something went wrong. Try refreshing.'];
  }
}

/* ── Show a random quote ── */
async function showRandomQuote() {
  quoteEl.classList.remove('visible');

  // Small delay so the fade-out is visible before swapping text
  await new Promise((r) => setTimeout(r, 200));

  const lines = await getLines(currentCategory.file);
  const line = lines[Math.floor(Math.random() * lines.length)];
  quoteEl.textContent = `"${line}"`;

  requestAnimationFrame(() => quoteEl.classList.add('visible'));
}

/* ── Image loading ── */
function getDimensions() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  return {
    w: Math.min(Math.round(window.innerWidth  * dpr), 4000),
    h: Math.min(Math.round(window.innerHeight * dpr), 4000),
  };
}

function loadImage() {
  shimmer.classList.remove('hidden');
  photo.classList.remove('loaded');

  const { w, h } = getDimensions();
  const url = `https://picsum.photos/${w}/${h}?random=${Date.now()}`;

  const tmp = new Image();
  tmp.onload = () => {
    photo.src = url;
    requestAnimationFrame(() => {
      photo.classList.add('loaded');
      shimmer.classList.add('hidden');
    });
  };
  tmp.onerror = () => setTimeout(loadImage, 1500);
  tmp.src = url;
}

/* ── Refresh: new image + new quote ── */
function refresh() {
  loadImage();
  showRandomQuote();
}

refreshBtn.addEventListener('click', refresh);

// Reload on significant resize (debounced)
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(loadImage, 500);
});

/* ── Init ── */
buildDropdown();
refresh();
