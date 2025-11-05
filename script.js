// script.js - cleaned + modal property search + copy icons + jump-to-item
const GITHUB_API = 'https://api.github.com/repos/Kapekoodaa/fn-sdk/contents/games';
const GITHUB_RAW = 'https://raw.githubusercontent.com/Kapekoodaa/fn-sdk/main/games';

let currentGame = null;
let currentGameData = null;
let currentCategory = 'classes';
let searchFilters = {
    names: true,
    properties: false,
    offsets: false
};
let searchTimeout = null;
let allItems = []; // currently loaded items in items-list (reflects currentCategory)

// Initialize
async function init() {
    createStars();
    await loadGames();

    // Ensure filters visible by default
    const filters = document.getElementById('searchFilters');
    if (filters) filters.classList.add('active');

    // Hook global property search enter -> open modal
    const propertyInput = document.getElementById('propertySearchTop');
    propertyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const q = propertyInput.value.trim();
            openPropertyModal(q);
        }
    });

    // modal close buttons / backdrop
    document.getElementById('propertyModalClose').addEventListener('click', closePropertyModal);
    document.getElementById('propertyModalBackdrop').addEventListener('click', (e) => {
        if (e.target === document.getElementById('propertyModalBackdrop')) closePropertyModal();
    });
}

// Create star background
function createStars() {
    const starsContainer = document.getElementById('stars');
    for (let i = 0; i < 120; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 3 + 's';
        starsContainer.appendChild(star);
    }
}

// Load games list and SDK update date
async function loadGames() {
    try {
        // Fetch games list
        const response = await fetch(GITHUB_API, {
            headers: {
                Accept: 'application/vnd.github.v3+json'
            }
        });
        if (!response.ok) throw new Error('Failed to fetch games');
        const data = await response.json();
        const games = data.filter(item => item.type === 'dir');

        // Store games for later use
        window.availableGames = games;

        // Fetch last update date from GitHub commits API
        try {
            const commitsResponse = await fetch('https://api.github.com/repos/Kapekoodaa/fn-sdk/commits?path=games&per_page=1', {
                headers: {
                    Accept: 'application/vnd.github.v3+json'
                }
            });
            if (commitsResponse.ok) {
                const commits = await commitsResponse.json();
                if (commits.length > 0) {
                    const lastCommitDate = new Date(commits[0].commit.author.date);
                    const formattedDate = formatDate(lastCommitDate);
                    document.getElementById('sdkUpdated').textContent = formattedDate;
                } else {
                    document.getElementById('sdkUpdated').textContent = 'Unknown';
                }
            } else {
                document.getElementById('sdkUpdated').textContent = 'Unknown';
            }
        } catch (err) {
            console.error('Error fetching update date:', err);
            document.getElementById('sdkUpdated').textContent = 'Unknown';
        }
    } catch (err) {
        console.error('Error loading games:', err);
        showNotification('❌ Failed to load games from GitHub');
        document.getElementById('sdkUpdated').textContent = 'Error';
    }
}

// Format date to readable string
function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Enter SDK Viewer - automatically open the first (and only) game
async function enterSDKViewer() {
    if (!window.availableGames || window.availableGames.length === 0) {
        showNotification('❌ No games available. Please wait...');
        return;
    }

    // Open the first game
    const firstGame = window.availableGames[0];
    await openGame(firstGame);
}

// Display games grid - no longer needed, but keeping for compatibility
function displayGames(games) {
    // This function is kept for compatibility but no longer displays games
    // Games are now accessed via the "Enter SDK Viewer" button
}

function getGameIcon(gameName) {
    const name = gameName.toLowerCase();
    if (name.includes('fps') || name.includes('shooter')) return '🔫';
    if (name.includes('fortnite')) return '🎮';
    if (name.includes('valorant')) return '🎯';
    if (name.includes('apex')) return '🏆';
    if (name.includes('cod') || name.includes('warzone')) return '💣';
    if (name.includes('test') || name.includes('dev')) return '🧪';
    return '🎮';
}

// Game search on home - no longer needed since we removed the games grid

// Open single game and load JSON files
async function openGame(game) {
    try {
        showNotification('⏳ Loading game data...');
        const gameName = game.name;
        const filesUrl = `${GITHUB_API}/${gameName}`;
        const filesResponse = await fetch(filesUrl, {
            headers: {
                Accept: 'application/vnd.github.v3+json'
            }
        });
        if (!filesResponse.ok) throw new Error('Failed to fetch game files');
        const files = await filesResponse.json();
        const jsonFiles = files.filter(f => f.name.endsWith('.json'));
        document.getElementById('totalFiles').textContent = jsonFiles.length;

        const gameData = {
            name: decodeURIComponent(gameName),
            files: {}
        };

        for (const file of jsonFiles) {
            try {
                const fileResponse = await fetch(file.download_url);
                if (fileResponse.ok) {
                    const data = await fileResponse.json();
                    gameData.files[file.name] = data;
                }
            } catch (err) {
                console.error(`Failed to load ${file.name}:`, err);
            }
        }

        currentGame = game;
        currentGameData = gameData;

        const displayName = decodeURIComponent(game.name);
        document.getElementById('currentGameTitle').textContent = getGameIcon(displayName) + ' ' + displayName;

        document.getElementById('homePage').classList.remove('active');
        document.getElementById('viewerPage').classList.add('active');
        document.getElementById('viewerPage').style.display = 'block';

        // default to classes
        switchCategory('classes');
        showNotification('✅ Game loaded successfully!');
    } catch (err) {
        console.error('Error loading game:', err);
        showNotification('❌ Failed to load game data');
    }
}

// Go back to home
function goHome() {
    document.getElementById('viewerPage').style.display = 'none';
    document.getElementById('homePage').classList.add('active');
    currentGame = null;
    currentGameData = null;
    document.getElementById('itemSearch').value = '';
    document.getElementById('propertySearchTop').value = '';
    allItems = [];
}

// switchCategory with optional callback (invoked after items loaded)
function switchCategory(category, callback) {
    currentCategory = category;
    document.querySelectorAll('.sidebar-tab').forEach(tab => tab.classList.remove('active'));
    const activeTab = document.querySelector(`[data-tab="${category}"]`);
    if (activeTab) activeTab.classList.add('active');

    document.getElementById('itemSearch').value = '';
    document.getElementById('searchResultsInfo').textContent = '';
    loadItems(category, callback);
}

// loadItems builds the items list and sets 'allItems'
function loadItems(category, callback) {
    const itemsList = document.getElementById('itemsList');
    itemsList.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading...</p></div>';

    if (!currentGameData) return;

    requestAnimationFrame(() => {
        const categoryMap = {
            'classes': 'ClassesInfo.json',
            'structs': 'StructsInfo.json',
            'enums': 'EnumsInfo.json',
            'functions': 'FunctionsInfo.json',
            'offsets': 'OffsetsInfo.json'
        };

        const fileName = categoryMap[category];
        const fileData = currentGameData.files[fileName];

        if (!fileData || !fileData.data) {
            itemsList.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📁</div><p>No ${category} data available</p></div>`;
            allItems = [];
            if (callback) callback();
            return;
        }

        allItems = [];
        itemsList.innerHTML = '';

        const fragment = document.createDocumentFragment();

        if (category === 'offsets') {
            fileData.data.forEach((item) => {
                const itemEntry = document.createElement('div');
                itemEntry.className = 'item-entry';
                const name = item[0];
                const value = item[1];
                const hexValue = typeof value === 'number' ?
                    '0x' + value.toString(16).toUpperCase() :
                    String(value);

                itemEntry.innerHTML = `
                <div>
                    <div class="item-name">${name}</div>
                    <div class="item-type">${hexValue}</div>
                </div>
                <span class="copy-btn" title="Copy Offset">
                    <svg xmlns="http://www.w3.org/2000/svg" height="14" width="14" viewBox="0 0 24 24" fill="none" stroke="#90EE90" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </span>
            `;

                itemEntry.onclick = (e) => {
                    if (e.target.closest('.copy-btn')) return; // prevent navigation on copy click
                    showDetails({
                        name,
                        value,
                        hexValue
                    }, category, itemEntry);
                };

                const copyBtn = itemEntry.querySelector('.copy-btn');
                copyBtn.onclick = () => {
                    copyToClipboard(hexValue, name);
                    copyBtn.classList.add('copied');
                    setTimeout(() => copyBtn.classList.remove('copied'), 700);
                };

                fragment.appendChild(itemEntry);
                allItems.push({
                    element: itemEntry,
                    name,
                    value,
                    hexValue,
                    rawData: item,
                    category
                });
            });
        } else {
            fileData.data.forEach((item) => {
                const itemEntry = document.createElement('div');
                itemEntry.className = 'item-entry';
                const name = Object.keys(item)[0];
                const data = item[name];

                itemEntry.innerHTML = `
                <div>
                    <div class="item-name">${name}</div>
                    <div class="item-type">${category}</div>
                </div>
            `;

                itemEntry.onclick = () => showDetails({
                    name,
                    data
                }, category, itemEntry);

                fragment.appendChild(itemEntry);
                allItems.push({
                    element: itemEntry,
                    name,
                    data,
                    rawData: item,
                    category
                });
            });
        }


        itemsList.appendChild(fragment);

        // auto-open first item
        if (allItems.length > 0) {
            setTimeout(() => {
                allItems[0].element.click();
                if (callback) callback();
            }, 40);
        } else {
            if (callback) callback();
        }
    });
}

/* --------------- Search (items) ----------------- */
function updateSearchFilters() {
    const checkboxes = document.querySelectorAll('[data-filter]');
    checkboxes.forEach(checkbox => {
        const filter = checkbox.dataset.filter;
        searchFilters[filter] = checkbox.checked;
        const label = checkbox.parentElement;
        if (checkbox.checked) label.classList.add('checked');
        else label.classList.remove('checked');
    });

    const searchInput = document.getElementById('itemSearch');
    if (searchInput.value.trim()) performSearch(searchInput.value.trim());
}

document.getElementById('itemSearch').addEventListener('input', (e) => {
    const search = e.target.value.trim().toLowerCase();
    clearTimeout(searchTimeout);

    if (search === '') {
        allItems.forEach(item => {
            item.element.style.display = 'block';
            item.element.classList.remove('search-highlight');
            const matchInfo = item.element.querySelector('.item-match-info');
            if (matchInfo) matchInfo.remove();
        });
        document.getElementById('searchResultsInfo').textContent = '';
        return;
    }

    searchTimeout = setTimeout(() => performSearch(search), 250);
});

function performSearch(searchTerm) {
    if (!currentGameData || !searchTerm || searchTerm.length < 2) return;
    let matchCount = 0,
        totalMatches = 0;

    allItems.forEach(item => {
        const existingMatchInfo = item.element.querySelector('.item-match-info');
        if (existingMatchInfo) existingMatchInfo.remove();
        item.element.classList.remove('search-highlight');

        const matches = [];

        if (searchFilters.names && item.name && item.name.toLowerCase().includes(searchTerm)) matches.push('name');

        if (currentCategory === 'offsets') {
            if (searchFilters.offsets && item.hexValue && item.hexValue.toLowerCase().includes(searchTerm)) matches.push('offset value');
        } else if (item.data && Array.isArray(item.data) && (searchFilters.properties || searchFilters.offsets)) {
            const propertyMatches = searchInItemData(item.data, searchTerm);
            matches.push(...propertyMatches);
        }

        if (matches.length > 0) {
            item.element.style.display = 'block';
            item.element.classList.add('search-highlight');
            matchCount++;
            totalMatches += matches.length;

            const uniqueMatches = [...new Set(matches)];
            const matchInfo = document.createElement('div');
            matchInfo.className = 'item-match-info';
            matchInfo.textContent = `✓ ${uniqueMatches.slice(0,2).join(', ')}${uniqueMatches.length > 2 ? '...' : ''}`;
            item.element.appendChild(matchInfo);
        } else {
            item.element.style.display = 'none';
        }
    });

    const resultsInfo = document.getElementById('searchResultsInfo');
    resultsInfo.textContent = matchCount > 0 ? `Found ${matchCount} items (${totalMatches} matches)` : 'No matches found';
}

function searchInItemData(itemData, searchTerm) {
    const matches = [];
    itemData.forEach(prop => {
        if (prop.__InheritInfo || prop.__MDKClassSize !== undefined) return;
        const propName = Object.keys(prop)[0];
        const propDetails = prop[propName];
        if (searchFilters.properties && propName.toLowerCase().includes(searchTerm)) matches.push(`property: ${propName.substring(0,20)}`);
        if (Array.isArray(propDetails)) {
            if (searchFilters.offsets && propDetails[1] !== undefined) {
                const offset = '0x' + propDetails[1].toString(16).toLowerCase();
                if (offset.includes(searchTerm)) matches.push(`offset in ${propName.substring(0,15)}`);
            }
        }
    });
    return matches;
}

/* --------------- Details rendering ----------------- */
function showDetails(item, category, element) {
    document.querySelectorAll('.item-entry').forEach(e => e.classList.remove('active'));
    if (element) element.classList.add('active');

    const detailsPanel = document.getElementById('detailsPanel');
    if (category === 'offsets') {
        detailsPanel.innerHTML = `
            <div class="details-header">
                <h2>${item.name}</h2>
                <div class="details-meta">
                    <div class="meta-badge">Offset</div>
                    <div class="copy-value copy-inline">
                        <button class="copy-btn" title="Copy offset" onclick="copyToClipboard('${item.hexValue}', '${escapeHtml(item.name)}')">
                            ${clipboardSVG()}
                        </button>
                        <span style="margin-left:8px; color:#90EE90; font-family:'Courier New', monospace;">${item.hexValue}</span>
                    </div>
                </div>
            </div>
        `;
    } else if (category === 'classes' || category === 'structs') {
        renderClassOrStruct(item, category, detailsPanel);
    } else if (category === 'enums') {
        renderEnum(item, detailsPanel);
    } else if (category === 'functions') {
        renderFunctions(item, detailsPanel);
    }
}

function renderClassOrStruct(item, category, panel) {
    let inheritInfo = [];
    let classSize = 0;
    let properties = [];
    if (Array.isArray(item.data)) {
        item.data.forEach(prop => {
            if (prop.__InheritInfo) inheritInfo = prop.__InheritInfo;
            else if (prop.__MDKClassSize !== undefined) classSize = prop.__MDKClassSize;
            else {
                const propName = Object.keys(prop)[0];
                properties.push({
                    name: propName,
                    details: prop[propName]
                });
            }
        });
    }

    let html = `
        <div class="details-header">
            <h2>${item.name}</h2>
            <div class="details-meta">
                <div class="meta-badge">${category}</div>
                <div class="meta-badge">Size: ${classSize} bytes</div>
                <div class="meta-badge">${properties.length} properties</div>
            </div>
        </div>
    `;

    if (inheritInfo.length > 0) {
        html += `<div class="details-section"><div class="section-title">🔗 Inheritance Chain</div><div class="inherit-chain">${inheritInfo.map(parent => `<div class="inherit-item">${parent}</div>`).join('<span class="arrow">→</span>')}</div></div>`;
    }

    if (properties.length > 0) {
        html += `<div class="details-section"><div class="section-title">📋 Properties (${properties.length})</div>`;
        properties.forEach(prop => {
            const details = prop.details;
            const type = Array.isArray(details) && details[0] ? details[0][0] : 'Unknown';
            const offset = Array.isArray(details) && details[1] !== undefined ? details[1] : '';
            const size = Array.isArray(details) && details[2] !== undefined ? details[2] : '';
            const hexOffset = (offset !== '') ? '0x' + offset.toString(16).toUpperCase() : '';

            html += `
                <div class="property-item" data-propname="${escapeHtml(prop.name)}" data-propoffset="${hexOffset}">
                    <div class="property-header">
                        <div style="display:flex; gap:12px; align-items:center;">
                            <span class="property-name">${prop.name}</span>
                            <span class="property-type">${type}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            ${hexOffset !== '' ? `<span class="property-details">Offset: <span style="color:#90EE90; font-family:'Courier New', monospace;">${hexOffset}</span> | Size: ${size} bytes</span>` : `<span class="property-details">Size: ${size} bytes</span>`}
                            ${hexOffset !== '' ? `<button class="copy-btn" title="Copy offset" onclick="copyToClipboard('${hexOffset}', '${escapeHtml(prop.name)}')">${clipboardSVG()}</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }

    panel.innerHTML = html;
    // after rendering, ensure property click behaviour (if wanted later)
}

function renderEnum(item, panel) {
    const enumValues = Array.isArray(item.data) && Array.isArray(item.data[0]) ? item.data[0][0] : [];
    const enumType = Array.isArray(item.data) && item.data[0] ? item.data[0][1] : 'unknown';
    const valuesCount = Array.isArray(enumValues) ? enumValues.length : Object.keys(enumValues).length;

    let html = `
        <div class="details-header">
            <h2>${item.name}</h2>
            <div class="details-meta">
                <div class="meta-badge">Enum</div>
                <div class="meta-badge">Type: ${enumType}</div>
                <div class="meta-badge">${valuesCount} values</div>
            </div>
        </div>
        <div class="details-section"><div class="section-title">📋 Values</div>
    `;
    if (Array.isArray(enumValues)) {
        enumValues.forEach(val => {
            const key = Object.keys(val)[0];
            const value = val[key];
            html += `<div class="property-item"><div class="property-header"><span class="property-name">${key}</span><span class="copy-value copy-inline"><button class="copy-btn" onclick="copyToClipboard('${value}')">${clipboardSVG()}</button><span style="margin-left:8px;color:#90EE90;font-family:'Courier New',monospace;">${value}</span></span></div></div>`;
        });
    } else if (typeof enumValues === 'object') {
        Object.keys(enumValues).forEach(key => {
            html += `<div class="property-item"><div class="property-header"><span class="property-name">${key}</span><span class="copy-value copy-inline"><button class="copy-btn" onclick="copyToClipboard('${enumValues[key]}')">${clipboardSVG()}</button><span style="margin-left:8px;color:#90EE90;font-family:'Courier New',monospace;'>${enumValues[key]}</span></span></div></div>`;
        });
    }
    html += `</div>`;
    panel.innerHTML = html;
}

function renderFunctions(item, panel) {
    const functions = item.data;
    let functionsCount = 0;
    if (Array.isArray(functions)) {
        functions.forEach(funcObj => functionsCount += Object.keys(funcObj).length);
    }

    let html = `<div class="details-header"><h2>${item.name}</h2><div class="details-meta"><div class="meta-badge">Class Functions</div><div class="meta-badge">${functionsCount} functions</div></div></div>`;
    if (Array.isArray(functions)) {
        functions.forEach(funcObj => {
            Object.keys(funcObj).forEach(funcName => {
                const funcData = funcObj[funcName];
                const returnType = Array.isArray(funcData) && funcData[0] ? funcData[0][0] : 'void';
                const params = Array.isArray(funcData) && funcData[1] ? funcData[1] : [];
                const address = Array.isArray(funcData) && funcData[2] ? funcData[2] : '';
                let paramString = params.length > 0 ? params.map(param => {
                    const paramType = param[0] ? param[0][0] : 'unknown';
                    const paramName = param[2] || 'param';
                    return `${paramType} ${paramName}`;
                }).join(', ') : '';

                html += `<div class="details-section"><div class="section-title">⚙️ ${funcName}</div><div style="background: rgba(0, 0, 0, 0.28); border:1px solid rgba(255,255,255,0.04); border-radius:8px; padding:12px; margin:8px 0; font-family: 'Courier New', monospace; font-size:0.85rem; color:#a8daff; overflow-x:auto;">${returnType} ${funcName}(${paramString})</div>`;

                if (params.length > 0) {
                    html += `<div class="property-item"><div class="property-name">Parameters (${params.length})</div><div style="margin-top:8px; padding-left:15px;">`;
                    params.forEach(param => {
                        const paramType = param[0] ? param[0][0] : 'unknown';
                        const paramName = param[2] || 'unnamed';
                        html += `<div style="color:#FFB6C1; font-size:0.75rem; margin:2px 0; font-family:'Courier New',monospace;">• ${paramType} ${paramName}</div>`;
                    });
                    html += `</div></div>`;
                }

                if (address) {
                    const hexAddr = '0x' + address.toString(16).toUpperCase();
                    html += `<div class="property-item"><div class="property-header"><span class="property-name">Address</span><span class="copy-value"><button class="copy-btn" onclick="copyToClipboard('${hexAddr}')">${clipboardSVG()}</button><span style="margin-left:8px;color:#90EE90;font-family:'Courier New',monospace;">${hexAddr}</span></span></div></div>`;
                }

                html += `</div>`;
            });
        });
    }

    panel.innerHTML = html;
}

/* --------------- Copy to clipboard + small utils --------------- */
function copyToClipboard(text, name = null) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        if (name) {
            // Show offset name and value in notification
            showNotification(`📋 Copied ${name}: ${text}`);
        } else {
            showNotification('📋 Copied: ' + text);
        }
    }).catch(err => {
        console.error('Copy failed', err);
        showNotification('❌ Failed to copy');
    });
}

function showNotification(message) {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transition = 'opacity .2s';
        setTimeout(() => notif.remove(), 220);
    }, 2200);
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"'`=\/]/g, s => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    } [s]));
}

/* Minimal clipboard SVG icon (returns HTML string) */
function clipboardSVG() {
    return `<svg class="clipboard-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M16 2H10a1 1 0 0 0-1 1v1H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V3a1 1 0 0 0-1-1zM10 4h6v1h-6V4z" fill="currentColor"/>
    </svg>`;
}

/* --------------- Property search modal logic --------------- */

/**
 * openPropertyModal(q)
 * - q: optional query string. If empty, will show empty state.
 */
function openPropertyModal(q = '') {
    const backdrop = document.getElementById('propertyModalBackdrop');
    const modal = document.getElementById('propertyModal');
    const list = document.getElementById('propertyResultsList');
    const empty = document.getElementById('propertyModalEmpty');
    const countEl = document.getElementById('propertyModalCount');

    list.innerHTML = '';
    countEl.textContent = '';
    if (!q || q.trim().length < 1) {
        empty.style.display = 'block';
        backdrop.classList.add('active');
        return;
    }

    empty.style.display = 'none';
    backdrop.classList.add('active');

    // perform search across ClassesInfo.json and StructsInfo.json
    const term = q.trim().toLowerCase();
    const classesFile = currentGameData && currentGameData.files ? currentGameData.files['ClassesInfo.json'] : null;
    const structsFile = currentGameData && currentGameData.files ? currentGameData.files['StructsInfo.json'] : null;
    const sources = [classesFile, structsFile].filter(Boolean);

    const results = [];

    sources.forEach((file, idx) => {
        const category = (file === classesFile) ? 'classes' : 'structs';
        if (!file.data) return;
        file.data.forEach(obj => {
            const name = Object.keys(obj)[0];
            const data = obj[name];
            if (!Array.isArray(data)) return;
            data.forEach(prop => {
                if (prop.__InheritInfo || prop.__MDKClassSize !== undefined) return;
                const propName = Object.keys(prop)[0];
                const details = prop[propName];
                if (!propName.toLowerCase().includes(term)) return;
                const type = Array.isArray(details) && details[0] ? details[0][0] : 'Unknown';
                const offset = Array.isArray(details) && details[1] !== undefined ? details[1] : null;
                const hexOffset = offset !== null ? '0x' + offset.toString(16).toUpperCase() : '';
                results.push({
                    propName,
                    className: name,
                    category,
                    type,
                    offset,
                    hexOffset
                });
            });
        });
    });

    // sort alphabetically by class then prop (optional)
    results.sort((a, b) => {
        if (a.className < b.className) return -1;
        if (a.className > b.className) return 1;
        if (a.propName < b.propName) return -1;
        if (a.propName > b.propName) return 1;
        return 0;
    });

    if (results.length === 0) {
        list.innerHTML = `<div class="empty-state small"><p>No properties found for "${escapeHtml(q)}"</p></div>`;
        countEl.textContent = '0 results';
        return;
    }

    // populate results list
    const frag = document.createDocumentFragment();
    results.forEach(res => {
        const row = document.createElement('div');
        row.className = 'property-result-item';
        const main = document.createElement('div');
        main.className = 'property-result-main';
        main.innerHTML = `<div class="property-result-top"><div class="property-result-name">🔹 ${escapeHtml(res.propName)}</div><div class="property-result-offset">${res.hexOffset || '-'}</div></div><div class="property-result-meta">in <b>${escapeHtml(res.className)}</b> • ${escapeHtml(res.type)}</div>`;
        const right = document.createElement('div');
        right.style.display = 'flex';
        right.style.alignItems = 'center';
        right.style.gap = '8px';

        // Copy button (clipboard icon)
        if (res.hexOffset) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.title = 'Copy offset';
            copyBtn.innerHTML = clipboardSVG();
            copyBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                copyToClipboard(res.hexOffset, res.propName);
            });
            right.appendChild(copyBtn);
        }

        row.appendChild(main);
        row.appendChild(right);

        // click to jump to class/prop
        row.addEventListener('click', async () => {
            // close modal
            closePropertyModal();
            // switch to category and highlight
            switchCategory(res.category, () => {
                // small timeout to allow DOM update
                setTimeout(() => {
                    // find item in allItems (loaded for that category)
                    const target = allItems.find(i => i.name === res.className);
                    if (target && target.element) {
                        target.element.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                        target.element.click();

                        // after opening details, highlight the property position in details panel
                        setTimeout(() => {
                            const detailsPanel = document.getElementById('detailsPanel');
                            const propItems = detailsPanel.querySelectorAll('[data-propname]');
                            for (const p of propItems) {
                                const pn = p.getAttribute('data-propname') || '';
                                if (pn === res.propName) {
                                    p.style.outline = '2px solid rgba(144,238,144,0.3)';
                                    p.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'center'
                                    });
                                    setTimeout(() => p.style.outline = '', 2200);
                                    break;
                                }
                            }
                        }, 120);
                    } else {
                        showNotification('⚠️ Could not find parent class in list');
                    }
                }, 120);
            });
        });

        frag.appendChild(row);
    });

    list.appendChild(frag);
    countEl.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
}

/* Close modal */
function closePropertyModal() {
    document.getElementById('propertyModalBackdrop').classList.remove('active');
}

/* --------------- Dump request modal helpers --------------- */
function openDumpRequestModal() {
    document.getElementById('dumpRequestModal').classList.add('active');
}

function closeDumpRequestModal() {
    document.getElementById('dumpRequestModal').classList.remove('active');
}

/* --------------- Init --------------- */
document.addEventListener('DOMContentLoaded', init);