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
const savedCategoryFile = localStorage.getItem('quiply_category');
if (savedCategoryFile) {
  const found = CATEGORIES.find(c => c.file === savedCategoryFile);
  if (found) {
    currentCategory = found;
  }
}

let linesCache = {};   // { fileName: string[] }

/* ── Build dropdown items ── */
function buildDropdown() {
  dropdown.innerHTML = '';
  CATEGORIES.forEach((cat) => {
    const btn = document.createElement('button');
    btn.textContent = cat.label;
    if (cat.file === currentCategory.file) btn.classList.add('active');
    btn.addEventListener('click', () => selectCategory(cat));
    dropdown.appendChild(btn);
  });
}

function selectCategory(cat) {
  currentCategory = cat;
  localStorage.setItem('quiply_category', cat.file);
  closeDropdown();
  buildDropdown();
  refresh();
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

/* ── Image loading — returns a Promise that resolves when image is shown ── */
function getDimensions() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  return {
    w: Math.min(Math.round(window.innerWidth  * dpr), 4000),
    h: Math.min(Math.round(window.innerHeight * dpr), 4000),
  };
}

function loadImage() {
  return new Promise((resolve) => {
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
        resolve();
      });
    };
    tmp.onerror = () => {
      setTimeout(() => loadImage().then(resolve), 1500);
    };
    tmp.src = url;
  });
}

/* ── Refresh: hide quote → load image → show new quote ── */
async function refresh() {
  // 1. Hide the quote immediately
  quoteEl.classList.remove('visible');

  // 2. Wait for new image to fully load and appear
  await loadImage();

  // 3. Only then fetch + show the new quote
  const lines = await getLines(currentCategory.file);
  const line = lines[Math.floor(Math.random() * lines.length)];
  quoteEl.textContent = `"${line}"`;
  requestAnimationFrame(() => quoteEl.classList.add('visible'));
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
