// State Variables
let currentTargetUrl = "";
let currentSourceCode = "";
const isDarkMode = localStorage.getItem('viewsource-dark') === 'true';

// Initialize Lucide Icons
lucide.createIcons();

// Theme Initialization
if (isDarkMode) {
    document.documentElement.classList.add('dark');
    document.getElementById('body-element').classList.add('dark', 'bg-slate-950');
    document.getElementById('sun-icon').classList.add('hidden');
    document.getElementById('moon-icon').classList.remove('hidden');
} else {
    document.documentElement.classList.remove('dark');
    document.getElementById('body-element').classList.add('bg-slate-50');
}

// Event Listeners
window.addEventListener('hashchange', handleHashRouting);
window.addEventListener('DOMContentLoaded', handleHashRouting);

document.getElementById('source-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const rawUrl = document.getElementById('url-input').value.trim();
    if (rawUrl) {
        navigateToUrl(rawUrl);
    }
});

// Routing Logic
function handleHashRouting() {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
        const encodedUrl = hash.substring(1);
        try {
            currentTargetUrl = decodeURIComponent(encodedUrl);
            // Standardize scheme if missing
            if (!/^https?:\/\//i.test(currentTargetUrl)) {
                currentTargetUrl = 'https://' + currentTargetUrl;
            }
            showViewerMode();
            fetchWebsiteSource(currentTargetUrl);
        } catch (e) {
            console.error("Failed to decode target URL: ", e);
            goHome();
        }
    } else {
        showLandingMode();
    }
}

function navigateToUrl(url) {
    window.location.hash = encodeURIComponent(url);
}

// Fast Quick-load mechanism
function quickLoad(url) {
    document.getElementById('url-input').value = url;
    navigateToUrl(url);
}

function goHome() {
    window.location.hash = "";
    document.getElementById('url-input').value = "";
}

function showLandingMode() {
    document.getElementById('landing-view').classList.remove('hidden');
    document.getElementById('viewer-view').classList.add('hidden');
    document.title = "View Source - Code Inspector";
}

function showViewerMode() {
    document.getElementById('landing-view').classList.add('hidden');
    document.getElementById('viewer-view').classList.remove('hidden');
    document.getElementById('current-inspect-url').innerText = currentTargetUrl;
    document.getElementById('external-link').href = currentTargetUrl;
    document.title = `view-source:${currentTargetUrl}`;
}

// Multi-tier Fallback Fetch System
async function fetchWebsiteSource(url) {
    const loadingText = document.getElementById('loading-status-text');
    const loadingBar = document.getElementById('loading-bar-progress');
    const logContainer = document.getElementById('connection-steps');
    const statusBadge = document.getElementById('status-badge');

    // Reset UI states
    document.getElementById('loading-container').classList.remove('hidden');
    document.getElementById('error-container').classList.add('hidden');
    document.getElementById('source-wrapper').classList.add('hidden');
    logContainer.innerHTML = "";
    currentSourceCode = "";

    statusBadge.innerText = "Connecting...";
    statusBadge.className = "px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200/50";

    const addLog = (message, isSuccess = true) => {
        const item = document.createElement('div');
        item.className = isSuccess ? "text-slate-600 dark:text-slate-300" : "text-red-500 dark:text-red-400";
        item.innerHTML = `&gt; ${message}`;
        logContainer.appendChild(item);
        logContainer.scrollTop = logContainer.scrollHeight;
    };

    // Stage 1: Direct Fetch Attempt
    loadingText.innerText = "Attempting direct fetch...";
    loadingBar.style.width = "30%";
    addLog(`Requesting Direct Fetch to: ${url}`);

    try {
        const response = await fetch(url, { headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml' } });
        if (response.ok) {
            const text = await response.text();
            if (text && text.trim().length > 0) {
                addLog("Success! Directly connected to origin server.", true);
                loadingBar.style.width = "100%";
                handleFetchSuccess(text, url);
                return;
            }
        }
        throw new Error(`Direct connection returned status: ${response.status}`);
    } catch (err) {
        addLog(`Direct Fetch Failed (CORS or Blocked): ${err.message}`, false);
    }

    // Stage 2: Modern AllOrigins Proxy (JSON format retrieval)
    loadingText.innerText = "Bypassing restrictions (AllOrigins Engine)...";
    loadingBar.style.width = "60%";
    addLog("Switching to Tier 2: Resolving using modern proxy (AllOrigins API)...");

    try {
        const allOriginsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(allOriginsUrl);
        if (response.ok) {
            const json = await response.json();
            if (json.contents) {
                addLog("Success! Content bypassed through Tier 2 proxy.", true);
                loadingBar.style.width = "100%";
                handleFetchSuccess(json.contents, url);
                return;
            }
        }
        throw new Error(`Tier 2 returned status: ${response.status}`);
    } catch (err) {
        addLog(`Tier 2 Proxy Failed: ${err.message}`, false);
    }

    // Stage 3: Classic CORSProxy.io Method as last resort
    loadingText.innerText = "Bypassing restrictions (CorsProxy Gateway)...";
    loadingBar.style.width = "85%";
    addLog("Switching to Tier 3: Resolving with fallback CORSProxy.io gateway...");

    try {
        const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const response = await fetch(corsProxyUrl);
        if (response.ok) {
            const text = await response.text();
            if (text && text.trim().length > 0) {
                addLog("Success! Connection established via Tier 3 fallback gateway.", true);
                loadingBar.style.width = "100%";
                handleFetchSuccess(text, url);
                return;
            }
        }
        throw new Error(`Tier 3 returned status: ${response.status}`);
    } catch (err) {
        addLog(`Tier 3 Proxy Failed: ${err.message}`, false);
    }

    // If everything fails:
    loadingBar.style.width = "100%";
    setTimeout(() => {
        document.getElementById('loading-container').classList.add('hidden');
        document.getElementById('error-container').classList.remove('hidden');
        statusBadge.innerText = "Error";
        statusBadge.className = "px-2.5 py-1 rounded-xl text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200/50 dark:border-red-800/50";
    }, 600);
}

// Retry helper
function retryCurrentFetch() {
    if (currentTargetUrl) {
        fetchWebsiteSource(currentTargetUrl);
    }
}

// Process source html, parse relative paths securely, convert to hyperlinked view-source pointers
function handleFetchSuccess(rawHtml, baseUrl) {
    currentSourceCode = rawHtml;
    const statusBadge = document.getElementById('status-badge');
    statusBadge.innerText = "Success";
    statusBadge.className = "px-2.5 py-1 rounded-xl text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border border-green-200/50 dark:border-green-800/50";

    document.getElementById('loading-container').classList.add('hidden');
    const wrapper = document.getElementById('source-wrapper');
    wrapper.classList.remove('hidden');

    const placeholders = [];
    let placeholderCounter = 0;

    // Step 1: Detect href and src attributes in raw HTML string
    // Replace with unique identifiers, resolving target URLs dynamically using baseUrl Context
    let processedHtml = rawHtml.replace(/(href|src)\s*=\s*(["'])(.*?)\2/gi, (match, attribute, quote, relativePath) => {
        // Ignore hash jumps or inline scripts/base64
        if (!relativePath || relativePath.startsWith('#') || relativePath.startsWith('javascript:') || relativePath.startsWith('data:')) {
            return match;
        }
        try {
            const absoluteUrl = new URL(relativePath, baseUrl).href;
            const placeholderId = `___ATTR_REPLACE_${placeholderCounter++}___`;
            placeholders.push({
                id: placeholderId,
                type: 'attribute',
                attrName: attribute,
                quote: quote,
                originalPath: relativePath,
                absoluteUrl: absoluteUrl
            });
            return `${attribute}=${quote}${placeholderId}${quote}`;
        } catch (e) {
            return match; // Keep matching syntax intact if URL fails to resolve
        }
    });

    // Step 2: Detect raw standalone URLs that start with http/https
    processedHtml = processedHtml.replace(/https?:\/\/[^\s<"'`]+/g, (match) => {
        const placeholderId = `___URL_REPLACE_${placeholderCounter++}___`;
        placeholders.push({
            id: placeholderId,
            type: 'standalone',
            absoluteUrl: match
        });
        return placeholderId;
    });

    // Step 3: Strictly sanitize entire text to protect host runtime from execution
    let escapedHtml = escapeHtml(processedHtml);

    // Step 4: Substitute secure hyperlinked tags back where placeholders were tracked
    placeholders.forEach(item => {
        const safeAbsoluteUrl = escapeHtml(item.absoluteUrl);
        const localSourcePointer = `${window.location.origin}${window.location.pathname}#${encodeURIComponent(item.absoluteUrl)}`;

        if (item.type === 'attribute') {
            const safeOriginalPath = escapeHtml(item.originalPath);
            const safeLink = `<a href="${localSourcePointer}" class="source-link" title="View Source of ${safeAbsoluteUrl}">${safeOriginalPath}</a>`;
            escapedHtml = escapedHtml.replace(item.id, safeLink);
        } else if (item.type === 'standalone') {
            const safeLink = `<a href="${localSourcePointer}" class="source-link" title="View Source of ${safeAbsoluteUrl}">${safeAbsoluteUrl}</a>`;
            escapedHtml = escapedHtml.replace(item.id, safeLink);
        }
    });

    // Render output inside table structures matching native browser layouts
    const lines = escapedHtml.split('\n');
    const tbody = document.getElementById('source-table-body');
    tbody.innerHTML = "";

    const fragment = document.createDocumentFragment();
    lines.forEach((lineText, idx) => {
        const row = document.createElement('tr');
        
        const numCell = document.createElement('td');
        numCell.className = "line-num";
        numCell.innerText = idx + 1;
        
        const codeCell = document.createElement('td');
        codeCell.className = "code-cell";
        codeCell.innerHTML = lineText === "" ? "<br>" : lineText;

        row.appendChild(numCell);
        row.appendChild(codeCell);
        fragment.appendChild(row);
    });
    tbody.appendChild(fragment);
}

// Safe HTML Escaper
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Global Action Helpers
function copySourceCode() {
    if (!currentSourceCode) return;
    // Standard iframe-safe copy command implementation
    const textarea = document.createElement("textarea");
    textarea.value = currentSourceCode;
    textarea.style.position = "fixed";  // Prevent scrolling page context
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast("Source code copied to clipboard!");
    } catch (err) {
        console.error("Copy operation failed", err);
    }
    document.body.removeChild(textarea);
}

function toggleDarkMode() {
    const active = document.documentElement.classList.toggle('dark');
    const body = document.getElementById('body-element');
    const sun = document.getElementById('sun-icon');
    const moon = document.getElementById('moon-icon');

    if (active) {
        body.classList.add('dark', 'bg-slate-950');
        sun.classList.add('hidden');
        moon.classList.remove('hidden');
        localStorage.setItem('viewsource-dark', 'true');
    } else {
        body.classList.remove('dark', 'bg-slate-950');
        sun.classList.remove('hidden');
        moon.classList.add('hidden');
        localStorage.setItem('viewsource-dark', 'false');
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').innerText = message;
    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}
