/**
 * Category manifest — grouped for display in the dropdown.
 * Items with only a `group` key are rendered as section headers.
 */
const CATEGORIES = [
    { file: 'random', label: 'Random' },

    { group: 'Daily' },
    { file: 'no.json', label: 'NO' },
    { file: 'chaos.json', label: 'Chaos' },
    { file: 'bad_advice.json', label: 'Questionable Decisions' },
    { file: 'emotional_damage.json', label: 'Character Development' },

    { group: 'Delulu' },
    { file: 'love.json', label: 'Hopeless Romantic' },

    { group: 'Everyday Chaos' },
    { file: 'office_excuses.json', label: 'Corporate Survival' },
    { file: 'insults.json', label: 'Friendly Fire' },
    { file: 'horoscope.json', label: 'Today\'s Lies' },
];

/* ── DOM refs ── */
const photo = document.getElementById('photo');
const shimmer = document.getElementById('shimmer');
const quoteEl = document.getElementById('quote');
const refreshBtn = document.getElementById('refreshBtn');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const categoryBtn = document.getElementById('categoryBtn');
const dropdown = document.getElementById('dropdown');
const noCredit = document.getElementById('noCredit');

/* ── State ── */
let currentCategory = CATEGORIES.find(c => c.file === 'random') || CATEGORIES.find(c => c.file);
const savedCategoryFile = localStorage.getItem('quiply_category');
if (savedCategoryFile) {
    const found = CATEGORIES.find(c => c.file === savedCategoryFile);
    if (found) {
        currentCategory = found;
    }
}

let linesCache = {};    // { fileName: string[] }
let shuffleQueues = {}; // { fileName: string[] } — per-category shuffle queues
let lastShown = {};     // { fileName: string }  — last quote shown per category
let currentImage = null; // Holds the loaded Image object for screenshot use

/**
 * Fisher-Yates shuffle (in-place).
 * Returns a new shuffled copy of the array.
 */
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Pull the next quote from a per-file shuffle queue.
 * Reshuffles when exhausted, ensuring the last shown quote
 * doesn't appear first in the new deck.
 */
function getNextQuote(lines, fileKey) {
    if (!shuffleQueues[fileKey] || shuffleQueues[fileKey].length === 0) {
        let deck = shuffle(lines);
        // Avoid back-to-back across reshuffle boundary
        if (lastShown[fileKey] && deck.length > 1 && deck[0] === lastShown[fileKey]) {
            // Move the duplicate to a random later position
            const swapIdx = 1 + Math.floor(Math.random() * (deck.length - 1));
            [deck[0], deck[swapIdx]] = [deck[swapIdx], deck[0]];
        }
        shuffleQueues[fileKey] = deck;
    }
    const quote = shuffleQueues[fileKey].shift();
    lastShown[fileKey] = quote;
    return quote;
}

/* ── Build dropdown items ── */
function buildDropdown() {
    dropdown.innerHTML = '';
    CATEGORIES.forEach((cat) => {
        // Group header
        if (cat.group) {
            const header = document.createElement('div');
            header.className = 'dropdown-group-header';
            header.textContent = cat.group;
            header.setAttribute('aria-hidden', 'true');
            dropdown.appendChild(header);
            return;
        }

        const btn = document.createElement('button');
        btn.setAttribute('role', 'option');
        btn.setAttribute('aria-selected', cat.file === currentCategory.file ? 'true' : 'false');
        btn.textContent = cat.label;
        if (cat.file === currentCategory.file) btn.classList.add('active');
        btn.addEventListener('click', () => selectCategory(cat));
        btn.addEventListener('keydown', (e) => handleDropdownKeydown(e, btn));
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
    categoryBtn.setAttribute('aria-expanded', isOpen);
    if (isOpen) {
        const activeBtn = dropdown.querySelector('.active');
        if (activeBtn) activeBtn.focus();
    } else {
        categoryBtn.focus();
    }
}

function closeDropdown() {
    dropdown.classList.remove('open');
    categoryBtn.classList.remove('open');
    categoryBtn.setAttribute('aria-expanded', 'false');
}

function handleDropdownKeydown(e, currentBtn) {
    // Helper: find the next/prev focusable button, skipping group headers
    function nextBtn(el) {
        let s = el.nextElementSibling;
        while (s && s.tagName !== 'BUTTON') s = s.nextElementSibling;
        return s;
    }
    function prevBtn(el) {
        let s = el.previousElementSibling;
        while (s && s.tagName !== 'BUTTON') s = s.previousElementSibling;
        return s;
    }

    if (e.key === 'Escape') {
        closeDropdown();
        categoryBtn.focus();
        e.preventDefault();
    } else if (e.key === 'ArrowDown') {
        const next = nextBtn(currentBtn);
        if (next) next.focus();
        e.preventDefault();
    } else if (e.key === 'ArrowUp') {
        const prev = prevBtn(currentBtn);
        if (prev) prev.focus();
        e.preventDefault();
    }
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.category-wrapper')) closeDropdown();
});

categoryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
});

categoryBtn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!dropdown.classList.contains('open')) {
            toggleDropdown();
        }
    } else if (e.key === 'Escape' && dropdown.classList.contains('open')) {
        closeDropdown();
        categoryBtn.focus();
        e.preventDefault();
    }
});

/* ── Load lines from JSON ── */
async function getLines(fileName) {
    if (linesCache[fileName]) return linesCache[fileName];
    try {
        const res = await fetch(`assets/data/${fileName}`);
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
        w: Math.min(Math.round(window.innerWidth * dpr), 4000),
        h: Math.min(Math.round(window.innerHeight * dpr), 4000),
    };
}

function loadImage() {
    return new Promise(async (resolve) => {
        shimmer.classList.remove('hidden');
        photo.classList.remove('loaded');

        const { w, h } = getDimensions();
        const url = `https://picsum.photos/${w}/${h}?random=${Date.now()}`;

        try {
            // Fetch once, convert to blob URL — no redirect mismatch
            const res = await fetch(url);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);

            const tmp = new Image();
            tmp.onload = () => {
                currentImage = tmp;
                photo.style.setProperty('--bg-url', `url(${blobUrl})`);
                requestAnimationFrame(() => {
                    photo.classList.add('loaded');
                    shimmer.classList.add('hidden');
                    resolve();
                });
            };
            tmp.onerror = () => {
                URL.revokeObjectURL(blobUrl);
                setTimeout(() => loadImage().then(resolve), 1500);
            };
            tmp.src = blobUrl;
        } catch {
            setTimeout(() => loadImage().then(resolve), 1500);
        }
    });
}

/* ── Refresh: hide quote → load image → show new quote ── */
async function refresh() {
    // 1. Hide the quote immediately
    quoteEl.classList.remove('visible');

    // 2. Wait for new image to fully load and appear
    await loadImage();

    // 3. Only then fetch + show the new quote
    let targetFile = currentCategory.file;
    if (targetFile === 'random') {
        const valid = CATEGORIES.filter(c => c.file && c.file !== 'random');
        targetFile = valid[Math.floor(Math.random() * valid.length)].file;
    }

    noCredit.classList.toggle('visible', targetFile === 'no.json');

    const lines = await getLines(targetFile);
    const queueKey = currentCategory.file === 'random' ? 'random' : targetFile;
    const line = getNextQuote(lines, queueKey);
    quoteEl.textContent = `"${line}"`;
    requestAnimationFrame(() => quoteEl.classList.add('visible'));
}

refreshBtn.addEventListener('click', refresh);

copyBtn.addEventListener('click', async () => {
    let quoteText = quoteEl.textContent;
    if (!quoteText) return;

    // Remove surrounding quotation marks
    if (quoteText.startsWith('"') && quoteText.endsWith('"')) {
        quoteText = quoteText.slice(1, -1);
    }

    try {
        await navigator.clipboard.writeText(quoteText);
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
        }, 1500);
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
});

// Reload on significant resize (debounced)
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(loadImage, 500);
});

/* ── Download: draw current state to canvas (instant, no re-fetch) ── */
downloadBtn.addEventListener('click', () => {
    if (!currentImage) return;

    const canvas = document.createElement('canvas');
    const W = currentImage.naturalWidth;
    const H = currentImage.naturalHeight;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // 1. Draw the already-loaded background image
    ctx.drawImage(currentImage, 0, 0, W, H);

    // 2. Dark overlay (matches the CSS gradient)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, W, H);

    // 3. Draw the quote text (centered)
    const quoteText = quoteEl.textContent;
    if (quoteText) {
        const fontSize = Math.max(Math.round(W * 0.035), 24);
        ctx.font = `400 ${fontSize}px 'Cormorant Garamond', serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 30;

        // Word-wrap the quote
        const maxWidth = W * 0.7;
        const words = quoteText.split(' ');
        const lines = [];
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            if (ctx.measureText(testLine).width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);

        const lineHeight = fontSize * 1.4;
        const totalHeight = lines.length * lineHeight;
        const startY = (H - totalHeight) / 2 + lineHeight / 2;

        lines.forEach((line, i) => {
            ctx.fillText(line, W / 2, startY + i * lineHeight);
        });

        // Reset shadow for branding
        ctx.shadowBlur = 0;
    }

    // 4. "from quiply" branding at bottom center
    const brandSize = Math.max(Math.round(W * 0.012), 10);
    ctx.font = `400 ${brandSize}px 'Martel Sans', sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('QUIPLY | https://codebydusk.github.io/quiply', W / 2, H - Math.round(H * 0.02));

    // 5. Trigger download
    const link = document.createElement('a');
    link.download = 'quiply-quote.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});

/* ── Init ── */
buildDropdown();
refresh();
