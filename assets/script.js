/**
 * Quiply — script.js
 *
 * Responsibilities:
 *  - Build and manage the custom category dropdown
 *  - Load background images from picsum.photos via blob URL (avoids redirect mismatch)
 *  - Fetch and shuffle quote lines from JSON files with no back-to-back repeats
 *  - Handle Copy, Download (canvas-rendered PNG), and Refresh actions
 *  - Persist the user's last selected category in localStorage
 */

/* ═══════════════════════════════════════════
   CATEGORY MANIFEST
   Each entry is either:
     { file, label } — a selectable category
     { group }       — a visual section header (non-interactive)
   ═══════════════════════════════════════════ */
const CATEGORIES = [
    { file: 'random', label: 'Today\'s Quiply' },

    { group: 'Core' },
    { file: 'no.json', label: 'NO' },
    { file: 'chaos.json', label: 'Chaos' },
    { file: 'bad_advice.json', label: 'Questionable Decisions' },
    { file: 'emotional_damage.json', label: 'Character Development' },

    { group: 'Relationships' },
    { file: 'love.json', label: 'Hopeless Romantic' },

    { group: 'Life' },
    { file: 'office_excuses.json', label: 'Corporate Survival' },
    { file: 'insults.json', label: 'Friendly Fire' },
    { file: 'horoscope.json', label: "Today's Lies" },

    { group: 'Settings' },
    { action: 'flush', label: 'Flush all' }
];

/* ═══════════════════════════════════════════
   DOM REFERENCES
   ═══════════════════════════════════════════ */
const photo = document.getElementById('photo');       // Full-page background image div
const shimmer = document.getElementById('shimmer');     // Loading overlay
const quoteEl = document.getElementById('quote');       // Quote <h1>
const refreshBtn = document.getElementById('refreshBtn');  // Refresh button
const copyBtn = document.getElementById('copyBtn');     // Copy-to-clipboard button
const downloadBtn = document.getElementById('downloadBtn'); // Download PNG button
const categoryBtn = document.getElementById('categoryBtn'); // Dropdown trigger button
const dropdown = document.getElementById('dropdown');    // Dropdown listbox
const noCredit = document.getElementById('noCredit');    // "no-as-a-service" footer credit

/* ═══════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════ */

// Default to "Random"; restore from localStorage if a category was previously chosen
let currentCategory = CATEGORIES.find(c => c.file === 'random') || CATEGORIES.find(c => c.file);
const savedCategoryFile = localStorage.getItem('quiply_category');
if (savedCategoryFile) {
    const found = CATEGORIES.find(c => c.file === savedCategoryFile);
    if (found) currentCategory = found;
}

let linesCache = {};    // Cache of fetched JSON arrays keyed by filename
let currentImage = null;  // The currently-displayed Image object, reused by the download function

// Preload the SVG logo so it's ready to draw on the download canvas without any async work
const logoImage = new Image();
logoImage.src = 'assets/logo.svg';

/* ═══════════════════════════════════════════
   SHUFFLE UTILITIES & PERSISTENCE
   ═══════════════════════════════════════════ */

/**
 * Global Random Engine
 * Provides cryptographically secure randomization when available (HTTPS/localhost).
 * Gracefully falls back to Math.random() in insecure environments (e.g. LAN testing on mobile).
 */
const SecureRandom = {
    // Check if the browser environment provides the Web Crypto API
    hasCrypto: typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function',
    hasUUID: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function',

    /**
     * Generates a random float between 0 (inclusive) and 1 (exclusive).
     * @returns {number}
     */
    float() {
        if (this.hasCrypto) {
            return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296; // 2^32
        }
        return Math.random();
    },

    /**
     * Generates a random UUID string (or a pseudo-UUID fallback).
     * @returns {string}
     */
    uuid() {
        if (this.hasUUID) {
            return crypto.randomUUID();
        }
        // Fallback: highly unique string for cache-busting
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
};

const SHUFFLE_STORAGE_KEY = 'quiply_shuffle_state';
const SHUFFLE_VERSION = 1;

const ShuffleState = {
    load() {
        try {
            const data = localStorage.getItem(SHUFFLE_STORAGE_KEY);
            if (!data) return null;
            const parsed = JSON.parse(data);
            if (parsed.version !== SHUFFLE_VERSION) return null;
            return parsed;
        } catch {
            return null;
        }
    },
    save(state) {
        state.version = SHUFFLE_VERSION;
        localStorage.setItem(SHUFFLE_STORAGE_KEY, JSON.stringify(state));
    }
};

/**
 * A generic class that creates and tracks a shuffled deck of indices for any category.
 * It persists state, validates array lengths, prevents repeats, and serves quotes sequentially.
 */
class ShuffleDeck {
    constructor(id) {
        this.id = id;
        this.indices = [];
        this.index = 0;
    }

    _generateAndShuffle(length) {
        this.indices = Array.from({ length }, (_, i) => i);
        // In-place Fisher-Yates
        for (let i = length - 1; i > 0; i--) {
            const j = Math.floor(SecureRandom.float() * (i + 1));
            [this.indices[i], this.indices[j]] = [this.indices[j], this.indices[i]];
        }
        this.index = 0;
    }

    _loadState(length) {
        const globalState = ShuffleState.load() || { version: SHUFFLE_VERSION, decks: {} };
        const saved = globalState.decks[this.id];

        if (!saved) return false;
        if (!Array.isArray(saved.indices)) return false;
        if (saved.indices.length !== length) return false;
        if (saved.index < 0 || saved.index > length) return false;

        // Strict validation for duplicates or out-of-bounds indices
        const unique = new Set(saved.indices);
        if (unique.size !== length) return false;
        for (const idx of saved.indices) {
            if (typeof idx !== 'number' || idx < 0 || idx >= length) return false;
        }

        this.indices = saved.indices;
        this.index = saved.index;
        return true;
    }

    _saveState() {
        const globalState = ShuffleState.load() || { version: SHUFFLE_VERSION, decks: {} };
        globalState.decks[this.id] = {
            indices: this.indices,
            index: this.index
        };
        ShuffleState.save(globalState);
    }

    next(quotesArray) {
        const len = quotesArray.length;
        if (len === 0) return null;

        if (this.indices.length === 0) {
            const restored = this._loadState(len);
            if (!restored) {
                this._generateAndShuffle(len);
            }
        }

        // Exhaustion / Reshuffle checks
        if (this.index >= len) {
            this._generateAndShuffle(len);
        }

        const quote = quotesArray[this.indices[this.index]];
        this.index++;
        this._saveState();

        return quote;
    }
}

const activeDecks = {};
function getDeck(id) {
    if (!activeDecks[id]) {
        activeDecks[id] = new ShuffleDeck(id);
    }
    return activeDecks[id];
}

/* ═══════════════════════════════════════════
   DROPDOWN
   ═══════════════════════════════════════════ */

/**
 * Rebuilds the dropdown's inner HTML from CATEGORIES.
 * Group-header entries become non-interactive <div> labels.
 * Category entries become <button role="option"> elements.
 * The currently-active category receives the `.active` class.
 */
function buildDropdown() {
    dropdown.innerHTML = '';
    CATEGORIES.forEach((cat) => {
        if (cat.group) {
            // Section header — visually groups categories, not focusable
            const header = document.createElement('div');
            header.className = 'dropdown-group-header';
            header.textContent = cat.group;
            header.setAttribute('aria-hidden', 'true');
            dropdown.appendChild(header);
            return;
        }

        const btn = document.createElement('button');
        btn.setAttribute('role', 'option');

        if (cat.action) {
            btn.className = 'action-btn';

            // Feather Trash-2 icon
            const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.7;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

            const labelSpan = document.createElement('span');
            labelSpan.className = 'dropdown-label';
            labelSpan.textContent = cat.label;

            btn.innerHTML = iconSvg;
            btn.appendChild(labelSpan);

            btn.addEventListener('click', () => {
                labelSpan.textContent = 'Flushed!';
                setTimeout(() => flushAll(), 400);
            });
            dropdown.appendChild(btn);
            return;
        }

        btn.setAttribute('aria-selected', cat.file === currentCategory.file ? 'true' : 'false');

        const labelSpan = document.createElement('span');
        labelSpan.className = 'dropdown-label';
        labelSpan.textContent = cat.label;
        btn.appendChild(labelSpan);

        if (cat.file === currentCategory.file) {
            btn.classList.add('active');
            const progressSpan = document.createElement('span');
            progressSpan.className = 'dropdown-progress';
            progressSpan.id = 'dropdownProgress';
            btn.appendChild(progressSpan);
        }

        btn.addEventListener('click', () => selectCategory(cat));
        btn.addEventListener('keydown', (e) => handleDropdownKeydown(e, btn));
        dropdown.appendChild(btn);
    });
}

/**
 * Selects a category, persists it to localStorage, closes the
 * dropdown, rebuilds it to reflect the new active state, and
 * triggers a full refresh.
 * @param {{ file: string, label: string }} cat
 */
function selectCategory(cat) {
    currentCategory = cat;
    localStorage.setItem('quiply_category', cat.file);
    dropdown.classList.remove('open');
    categoryBtn.classList.remove('open');
    categoryBtn.setAttribute('aria-expanded', 'false');
    buildDropdown(); // update active class
    refresh();
}

/**
 * Erases all persisted shuffle data from localStorage,
 * resets the active category to 'random', and refreshes.
 */
function flushAll() {
    localStorage.removeItem(SHUFFLE_STORAGE_KEY);
    localStorage.removeItem('quiply_todays_deck');
    globalQuoteManager.isInitialized = false;
    for (const key in activeDecks) {
        delete activeDecks[key];
    }
    const randomCat = CATEGORIES.find(c => c.file === 'random');
    selectCategory(randomCat);
}

/**
 * Toggles the dropdown open/closed and manages ARIA state.
 * When opening, moves focus to the currently-active option.
 */
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

/** Closes the dropdown and resets all ARIA state. */
function closeDropdown() {
    dropdown.classList.remove('open');
    categoryBtn.classList.remove('open');
    categoryBtn.setAttribute('aria-expanded', 'false');
}

/**
 * Keyboard handler for individual option buttons inside the dropdown.
 * ArrowDown / ArrowUp navigate between buttons, skipping over group-header
 * divs which are not focusable. Escape closes the dropdown.
 * @param {KeyboardEvent} e
 * @param {HTMLButtonElement} currentBtn
 */
function handleDropdownKeydown(e, currentBtn) {
    // Walk siblings forward, skipping non-button elements (group headers)
    function nextBtn(el) {
        let s = el.nextElementSibling;
        while (s && s.tagName !== 'BUTTON') s = s.nextElementSibling;
        return s;
    }
    // Walk siblings backward, skipping non-button elements
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

// Close dropdown when clicking anywhere outside the category wrapper
document.addEventListener('click', (e) => {
    if (!e.target.closest('.category-wrapper')) closeDropdown();
});

// Clicking the category button toggles the dropdown
categoryBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent the document click handler from immediately closing it
    toggleDropdown();
});

// Arrow keys open the dropdown from the trigger button; Escape closes it
categoryBtn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!dropdown.classList.contains('open')) toggleDropdown();
    } else if (e.key === 'Escape' && dropdown.classList.contains('open')) {
        closeDropdown();
        categoryBtn.focus();
        e.preventDefault();
    }
});

/* ═══════════════════════════════════════════
   DATA FETCHING
   ═══════════════════════════════════════════ */

/**
 * Fetches and caches the array of quote strings from a JSON file.
 * Results are cached in `linesCache` so subsequent calls are instant.
 * Returns a fallback array on network or parse error.
 * @param {string} fileName - e.g. 'chaos.json'
 * @returns {Promise<string[]>}
 */
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

/* ═══════════════════════════════════════════
   SMART RANDOM ENGINE
   ═══════════════════════════════════════════ */

/**
 * A dedicated component that samples 15 quotes per category into a normalized
 * pool, shuffles it, and deals the top 100 as a single "Today's Quiply" deck.
 * The generated 100-quote deck is persisted in localStorage keyed to the current
 * date, so the same deck is served all day and resets automatically at midnight.
 */
class GlobalQuoteManager {
    constructor() {
        this.globalQuotes = [];
        this.isInitialized = false;
    }

    async init(forceNew = false) {
        const today = new Date().toDateString();

        if (!forceNew) {
            try {
                const savedData = localStorage.getItem('quiply_todays_deck');
                if (savedData) {
                    const parsed = JSON.parse(savedData);
                    if (parsed.date === today && parsed.quotes && parsed.quotes.length === 100) {
                        this.globalQuotes = parsed.quotes;
                        this.isInitialized = true;
                        return;
                    }
                }
            } catch (e) {
                // Ignore parse errors, just generate a new one
            }
        }
        // Find all real data files (exclude headers and 'random' itself)
        const validFiles = CATEGORIES
            .filter(c => c.file && c.file !== 'random')
            .map(c => c.file);

        // Fetch all of them in parallel utilizing cache
        const responses = await Promise.all(validFiles.map(file => getLines(file)));

        let pool = [];

        // 1. Pick up to 15 random quotes from each category
        validFiles.forEach((file, i) => {
            const lines = responses[i];
            const categoryQuotes = lines.map(text => ({ text, file }));

            // Cryptographically shuffle this category's quotes
            for (let j = categoryQuotes.length - 1; j > 0; j--) {
                const k = Math.floor(SecureRandom.float() * (j + 1));
                [categoryQuotes[j], categoryQuotes[k]] = [categoryQuotes[k], categoryQuotes[j]];
            }

            // Take the first 15 (or all, if less than 15)
            pool = pool.concat(categoryQuotes.slice(0, 15));
        });

        // 2. Cryptographically shuffle the pooled array
        for (let j = pool.length - 1; j > 0; j--) {
            const k = Math.floor(SecureRandom.float() * (j + 1));
            [pool[j], pool[k]] = [pool[k], pool[j]];
        }

        // 3. Take exactly 100 quotes to form the global deck
        this.globalQuotes = pool.slice(0, 100);

        // Save this new deck to localStorage with today's date
        try {
            localStorage.setItem('quiply_todays_deck', JSON.stringify({
                date: today,
                quotes: this.globalQuotes
            }));

            // Because this is a brand new pool of quotes, we MUST reset the shuffle deck progress
            // otherwise the user's old index (e.g., index 45) will carry over to this new array!
            const deck = getDeck('random');
            deck._generateAndShuffle(100);
            deck._saveState();
        } catch (e) {
            // Silently fail if localStorage is full or disabled
        }

        this.isInitialized = true;
    }

    async next() {
        const deck = getDeck('random');

        let forceNew = false;
        // If the deck is fully exhausted, force a fresh regeneration of the 100-quote pool
        if (this.isInitialized && deck.indices.length > 0 && deck.index >= deck.indices.length) {
            this.isInitialized = false;
            forceNew = true;
        }

        if (!this.isInitialized) await this.init(forceNew);

        return deck.next(this.globalQuotes);
    }
}

const globalQuoteManager = new GlobalQuoteManager();

/* ═══════════════════════════════════════════
   IMAGE LOADING
   ═══════════════════════════════════════════ */

/**
 * Returns pixel dimensions for the picsum request, capped at 4000px
 * and scaled by the device pixel ratio (max 2×) for sharp images.
 * @returns {{ w: number, h: number }}
 */
function getDimensions() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return {
        w: Math.min(Math.round(window.innerWidth * dpr), 4000),
        h: Math.min(Math.round(window.innerHeight * dpr), 4000),
    };
}

/**
 * Fetches a new random background image and displays it.
 *
 * Key design choice — blob URL approach:
 *   picsum.photos URLs redirect to a different image on every request.
 *   If we used the URL directly for both the CSS background and the
 *   download canvas, we'd get two different images (redirect mismatch).
 *   Instead, we fetch once, convert to a blob URL, and reuse that single
 *   blob URL everywhere. This also stores the decoded Image object in
 *   `currentImage` for instant canvas reuse at download time.
 *
 * @returns {Promise<void>} Resolves when the image is visible on screen.
 */
async function loadImage() {
    shimmer.classList.remove('hidden');
    photo.classList.remove('loaded');

    const { w, h } = getDimensions();
    const url = `https://picsum.photos/${w}/${h}?random=${SecureRandom.uuid()}`;

    try {
        // Single fetch → blob URL — guarantees the CSS bg and canvas use identical pixels
        const res = await fetch(url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);

        await new Promise((resolve, reject) => {
            const tmp = new Image();
            tmp.onload = () => {
                currentImage = tmp; // Store for reuse in the download handler
                photo.style.setProperty('--bg-url', `url(${blobUrl})`);
                requestAnimationFrame(() => {
                    photo.classList.add('loaded');   // Triggers CSS fade-in transition
                    shimmer.classList.add('hidden'); // Fade out the loading overlay
                    resolve();
                });
            };
            tmp.onerror = () => {
                URL.revokeObjectURL(blobUrl); // Clean up the failed blob
                reject(new Error('Image decode failed'));
            };
            tmp.src = blobUrl;
        });
    } catch {
        // Network or decode error — retry after 1.5s
        await new Promise(r => setTimeout(r, 1500));
        return loadImage();
    }
}

/* ═══════════════════════════════════════════
   REFRESH
   ═══════════════════════════════════════════ */

/**
 * Full refresh cycle:
 *  1. Immediately hide the current quote (avoids stale text during load)
 *  2. Load and display a new background image
 *  3. Pick the next quote from the shuffle queue and fade it in
 *
 * For the "Random" category, a random real category is chosen each
 * time but uses its own 'random' queue key so it doesn't interfere
 * with any specific category's shuffle state.
 */
let isRecovering = false;
async function refresh() {
    try {
        quoteEl.classList.remove('visible');

        await loadImage();

        // Resolve the actual file to load quotes from
        let targetFile = currentCategory.file;
        let line = '';

        if (targetFile === 'random') {
            // Smart Random Mode: Pull from the globally shuffled deck via Manager
            const quoteObj = await globalQuoteManager.next();
            line = quoteObj.text;
            targetFile = quoteObj.file; // Update targetFile to trigger UI side-effects (like noCredit)

            const randDeck = getDeck('random');
            const dp = document.getElementById('dropdownProgress');
            const total = globalQuoteManager.globalQuotes.length;
            const remaining = Math.max(total - randDeck.index, 0);
            if (dp) dp.textContent = `${randDeck.index} discovered, ${remaining} remaining!`;
        } else {
            // Specific Category Mode: Pull from the category's persistent ShuffleDeck
            const lines = await getLines(targetFile);
            const deck = getDeck(targetFile);
            line = deck.next(lines);

            const dp = document.getElementById('dropdownProgress');
            const remaining = Math.max(lines.length - deck.index, 0);
            if (dp) dp.textContent = `${deck.index} discovered, ${remaining} remaining!`;
        }

        // Show/hide the "no-as-a-service" footer credit for the NO category
        noCredit.classList.toggle('visible', targetFile === 'no.json');

        quoteEl.textContent = `"${line}"`;
        requestAnimationFrame(() => quoteEl.classList.add('visible')); // Trigger CSS fade-in

        isRecovering = false; // Reset recovery state on success
    } catch (e) {
        if (!isRecovering) {
            isRecovering = true;
            flushAll(); // Clear corrupted state and retry gracefully
        }
    }
}

/* ═══════════════════════════════════════════
   BUTTON HANDLERS
   ═══════════════════════════════════════════ */

refreshBtn.addEventListener('click', refresh);

/** Copies the current quote (without surrounding quote marks) to the clipboard. */
copyBtn.addEventListener('click', async () => {
    let quoteText = quoteEl.textContent;
    if (!quoteText) return;

    // Strip the decorative curly quotes added when setting textContent
    if (quoteText.startsWith('"') && quoteText.endsWith('"')) {
        quoteText = quoteText.slice(1, -1);
    }

    try {
        await navigator.clipboard.writeText(quoteText);

        // Swap to a checkmark icon briefly to confirm success
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => { copyBtn.innerHTML = originalHTML; }, 1500);
    } catch (err) {
        // Silently fail if copy is denied
    }
});

/**
 * Downloads the current quote as a PNG by drawing directly onto a <canvas>.
 *
 * This is instant because it reuses `currentImage` (the already-decoded Image
 * object stored during loadImage) rather than making any network requests.
 *
 * Canvas drawing order:
 *  1. Background photo  (full natural resolution)
 *  2. Dark overlay      (50% black, matching the CSS gradient)
 *  3. Quote text        (Cormorant Garamond, centered, word-wrapped, with shadow)
 *  4. Quiply branding   (small text at bottom center)
 *  5. Trigger download  (local-time filename: quiply-DDMMYYYYHHMMSS.png)
 */
downloadBtn.addEventListener('click', async () => {
    if (!currentImage) return; // Safety guard — image not yet loaded

    const canvas = document.createElement('canvas');
    const W = currentImage.naturalWidth;
    const H = currentImage.naturalHeight;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // 1. Background
    ctx.drawImage(currentImage, 0, 0, W, H);

    // 2. Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, W, H);

    // Adjust multipliers for portrait (mobile) vs landscape (desktop)
    const isPortrait = W < H;
    const quoteMultiplier = isPortrait ? 0.055 : 0.035;
    const maxWidthFactor = isPortrait ? 0.85 : 0.70;
    const brandMultiplier = isPortrait ? 0.016 : 0.009;

    // 3. Quote text
    const quoteText = quoteEl.textContent;
    if (quoteText) {
        const fontSize = Math.max(Math.round(W * quoteMultiplier), 28);
        ctx.font = `400 ${fontSize}px 'Cormorant Garamond', serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 30;

        // Word-wrap: greedily fill lines up to max width
        const maxWidth = W * maxWidthFactor;
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

        // Vertically center the wrapped text block
        const lineHeight = fontSize * 1.4;
        const totalHeight = lines.length * lineHeight;
        const startY = (H - totalHeight) / 2 + lineHeight / 2;
        lines.forEach((line, i) => ctx.fillText(line, W / 2, startY + i * lineHeight));

        ctx.shadowBlur = 0; // Reset before drawing branding (no shadow on small text)
    }

    // 4. Branding — logo icon + text, centered as a group, at a subtle small size
    const brandSize = Math.max(Math.round(W * brandMultiplier), 12);
    const brandText = 'QUIPLY · codebydusk.github.io/quiply';
    ctx.font = `400 ${brandSize}px 'Martel Sans', sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.textBaseline = 'bottom';

    const brandY = H - Math.round(H * 0.02);
    const gap = Math.round(brandSize * 0.6);          // space between icon and text
    const iconSize = Math.round(brandSize * 1.6);          // icon slightly taller than text cap-height
    const textW = ctx.measureText(brandText).width;
    const totalW = iconSize + gap + textW;
    const groupX = (W - totalW) / 2;                     // left edge of the centered group

    // Draw logo icon (SVG rendered into a small square)
    if (logoImage.complete && logoImage.naturalWidth > 0) {
        ctx.drawImage(logoImage, groupX, brandY - iconSize, iconSize, iconSize);
    }

    // Draw brand text to the right of the icon
    ctx.textAlign = 'left';
    ctx.fillText(brandText, groupX + iconSize + gap, brandY);
    ctx.textAlign = 'center'; // restore default

    // 5. Download / Share — filename uses local time in DDMMYYYYHHMMSS format
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const ts = `${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const filename = `quiply-${ts}.png`;
    const dataUrl = canvas.toDataURL('image/png');

    const fallbackDownload = () => {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
    };

    // If on mobile and Web Share API is supported, share it instead of direct download
    if (window.innerWidth <= 600 && navigator.canShare) {
        try {
            // Convert dataUrl to Blob synchronously to preserve the click gesture
            const arr = dataUrl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) u8arr[n] = bstr.charCodeAt(n);
            const blob = new Blob([u8arr], { type: mime });

            const file = new File([blob], filename, { type: 'image/png' });

            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Quiply | ${currentCategory.label}`,
                    text: 'A wonderfully questionable quote from Quiply. Find more at: https://codebydusk.github.io/quiply/'
                });
            } else {
                fallbackDownload();
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                fallbackDownload();
            }
        }
    } else {
        fallbackDownload();
    }
});

// Reload the background image on significant window resize (debounced to 500ms)
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(loadImage, 500);
});

/**
 * Keyboard shortcuts:
 *   Space or R → refresh (new quote + image)
 * Only active when the dropdown is closed and no input/textarea is focused.
 */
document.addEventListener('keydown', (e) => {
    // Skip if the user is typing in an input or the dropdown is open
    if (dropdown.classList.contains('open')) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

    if (e.key === ' ' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        refresh();
    }
});

/* ═══════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════ */
buildDropdown();
refresh();
