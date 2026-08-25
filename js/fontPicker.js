// fontPicker.js - Searchable Font Picker Component for AI Dimension
const FontPicker = (function() {
    'use strict';

    const csInterface = (typeof CSInterface !== 'undefined') ? new CSInterface() : null;
    const STORAGE_RECENT_KEY = 'ai_meas_recent_fonts';
    const STORAGE_CACHE_KEY = 'ai_meas_font_cache';

    // Base / Default standard fonts (instant fallback)
    const BASE_FONTS = [
        { name: 'default', family: 'Default', style: 'Myriad Pro Bold Cond', label: 'Default (Myriad Pro Bold Cond)' },
        { name: 'MyriadPro-Regular', family: 'Myriad Pro', style: 'Regular', label: 'Myriad Pro Regular' },
        { name: 'MyriadPro-Bold', family: 'Myriad Pro', style: 'Bold', label: 'Myriad Pro Bold' },
        { name: 'Arial-BoldMT', family: 'Arial', style: 'Bold', label: 'Arial Bold' },
        { name: 'ArialMT', family: 'Arial', style: 'Regular', label: 'Arial Regular' },
        { name: 'Helvetica-Bold', family: 'Helvetica', style: 'Bold', label: 'Helvetica Bold' },
        { name: 'Helvetica', family: 'Helvetica', style: 'Regular', label: 'Helvetica Regular' },
        { name: 'Calibri-Bold', family: 'Calibri', style: 'Bold', label: 'Calibri Bold' },
        { name: 'Calibri', family: 'Calibri', style: 'Regular', label: 'Calibri Regular' },
        { name: 'SegoeUI-Bold', family: 'Segoe UI', style: 'Bold', label: 'Segoe UI Bold' },
        { name: 'SegoeUI', family: 'Segoe UI', style: 'Regular', label: 'Segoe UI Regular' },
        { name: 'Roboto-Bold', family: 'Roboto', style: 'Bold', label: 'Roboto Bold' },
        { name: 'Roboto-Regular', family: 'Roboto', style: 'Regular', label: 'Roboto Regular' },
        { name: 'Futura-Bold', family: 'Futura', style: 'Bold', label: 'Futura Bold' },
        { name: 'TrebuchetMS-Bold', family: 'Trebuchet MS', style: 'Bold', label: 'Trebuchet MS Bold' },
        { name: 'Verdana-Bold', family: 'Verdana', style: 'Bold', label: 'Verdana Bold' },
        { name: 'Tahoma-Bold', family: 'Tahoma', style: 'Bold', label: 'Tahoma Bold' },
        { name: 'CourierNewPS-BoldMT', family: 'Courier New', style: 'Bold', label: 'Courier New Bold' },
        { name: 'Consolas-Bold', family: 'Consolas', style: 'Bold', label: 'Consolas Bold' },
        { name: 'Impact', family: 'Impact', style: 'Regular', label: 'Impact' }
    ];

    let allFonts = [...BASE_FONTS];
    let recentFonts = [];
    let isLoadedFromHost = false;
    let selectedIndex = -1;
    let currentRenderedItems = [];

    function init() {
        loadRecentFonts();
        loadCachedFonts();
        bindUI();

        // Query host for all installed fonts immediately
        fetchFontsFromHost();
    }

    function loadRecentFonts() {
        try {
            const saved = Storage.get(STORAGE_RECENT_KEY);
            if (saved && Array.isArray(saved)) {
                recentFonts = saved;
            }
        } catch (e) {}
    }

    function saveRecentFont(fontItem) {
        if (!fontItem || !fontItem.name) return;
        recentFonts = recentFonts.filter(f => f.name !== fontItem.name);
        recentFonts.unshift({
            name: fontItem.name,
            family: fontItem.family || fontItem.name,
            style: fontItem.style || '',
            label: fontItem.label || ((fontItem.family || fontItem.name) + (fontItem.style ? ' ' + fontItem.style : '')).trim()
        });
        if (recentFonts.length > 5) recentFonts = recentFonts.slice(0, 5);
        try {
            Storage.set(STORAGE_RECENT_KEY, recentFonts);
        } catch (e) {}
    }

    function loadCachedFonts() {
        try {
            const cached = Storage.get(STORAGE_CACHE_KEY);
            if (cached && Array.isArray(cached) && cached.length > 0) {
                mergeFonts(cached);
            }
        } catch (e) {}
    }

    function fetchFontsFromHost(callback) {
        if (!csInterface) return;
        csInterface.evalScript('getAllInstalledFonts()', (res) => {
            if (res && res !== 'EvalScript error.' && res !== 'undefined' && res.trim() !== '') {
                try {
                    let hostFonts = [];
                    if (res.indexOf('@@') !== -1) {
                        const lines = res.split('\n');
                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i].trim();
                            if (!line) continue;
                            const parts = line.split('@@');
                            const nm = parts[0] || '';
                            const fam = parts[1] || nm;
                            const st = parts[2] || '';
                            if (nm) {
                                hostFonts.push({
                                    name: nm,
                                    family: fam,
                                    style: st,
                                    label: (fam + (st ? ' ' + st : '')).trim()
                                });
                            }
                        }
                    } else {
                        hostFonts = JSON.parse(res);
                    }

                    if (Array.isArray(hostFonts) && hostFonts.length > 0) {
                        isLoadedFromHost = true;
                        mergeFonts(hostFonts);
                        try {
                            Storage.set(STORAGE_CACHE_KEY, hostFonts);
                        } catch (eS) {}
                        if (typeof callback === 'function') {
                            callback();
                        }
                    }
                } catch (e) {
                    console.error('Error parsing host fonts', e);
                }
            }
        });
    }

    function mergeFonts(fontList) {
        const map = new Map();
        // Add Base fonts first
        BASE_FONTS.forEach(f => map.set(f.name, f));
        // Add Host fonts
        fontList.forEach(f => {
            if (f && f.name && !map.has(f.name)) {
                map.set(f.name, {
                    name: f.name,
                    family: f.family || f.name,
                    style: f.style || '',
                    label: f.label || ((f.family || f.name) + (f.style ? ' ' + f.style : '')).trim()
                });
            }
        });
        allFonts = Array.from(map.values());
    }

    function filterFonts(query) {
        const q = (query || '').trim().toLowerCase();
        if (!q) {
            return {
                recents: recentFonts,
                base: BASE_FONTS,
                all: allFonts.slice(0, 30)
            };
        }

        const filtered = allFonts.filter(f => {
            const labelMatch = (f.label || '').toLowerCase().indexOf(q) !== -1;
            const famMatch = (f.family || '').toLowerCase().indexOf(q) !== -1;
            const nameMatch = (f.name || '').toLowerCase().indexOf(q) !== -1;
            const styleMatch = (f.style || '').toLowerCase().indexOf(q) !== -1;
            return labelMatch || famMatch || nameMatch || styleMatch;
        });

        return {
            recents: [],
            base: [],
            all: filtered.slice(0, 50) // Top 50 matches for instant UI rendering
        };
    }

    function renderDropdown(query) {
        const listEl = document.getElementById('font_list');
        if (!listEl) return;
        listEl.innerHTML = '';
        currentRenderedItems = [];
        selectedIndex = -1;

        const data = filterFonts(query);
        const q = (query || '').trim();

        // 1. Recents (when not searching)
        if (!q && data.recents.length > 0) {
            const header = document.createElement('div');
            header.className = 'font-header-item';
            header.textContent = '⭐ Recent Fonts';
            listEl.appendChild(header);

            data.recents.forEach(item => {
                const el = createItemElement(item);
                listEl.appendChild(el);
                currentRenderedItems.push(item);
            });
        }

        // 2. Base / Popular Fonts (when not searching)
        if (!q) {
            const header = document.createElement('div');
            header.className = 'font-header-item';
            header.textContent = '🔤 Base & Standard Fonts';
            listEl.appendChild(header);

            data.base.forEach(item => {
                const el = createItemElement(item);
                listEl.appendChild(el);
                currentRenderedItems.push(item);
            });
        }

        // 3. Search Results or All Fonts
        if (q) {
            if (data.all.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'font-item-empty';
                empty.textContent = 'No matching fonts found';
                listEl.appendChild(empty);
            } else {
                data.all.forEach(item => {
                    const el = createItemElement(item);
                    listEl.appendChild(el);
                    currentRenderedItems.push(item);
                });
            }
        }
    }

    function createItemElement(item) {
        const div = document.createElement('div');
        div.className = 'font-item';
        div.setAttribute('data-name', item.name);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'font-item-family';
        nameSpan.textContent = item.family || item.name;

        const styleSpan = document.createElement('span');
        styleSpan.className = 'font-item-style';
        styleSpan.textContent = item.style || '';

        div.appendChild(nameSpan);
        if (item.style) div.appendChild(styleSpan);

        div.addEventListener('mousedown', (e) => {
            e.preventDefault();
            selectFont(item);
        });

        return div;
    }

    function selectFont(item) {
        const inputSearch = document.getElementById('font_search_input');
        const inputHidden = document.getElementById('font_name');
        if (!inputSearch || !inputHidden) return;

        inputHidden.value = item.name;
        inputSearch.value = item.label || item.family || item.name;

        saveRecentFont(item);
        hideDropdown();

        inputHidden.dispatchEvent(new Event('change', { bubbles: true }));
        Presets.saveLastUsed();
        Measurements.reRunMeasurement();
    }

    function showDropdown() {
        const dropdown = document.getElementById('font_dropdown');
        const inputSearch = document.getElementById('font_search_input');
        if (!dropdown || !inputSearch) return;

        if (!isLoadedFromHost) {
            fetchFontsFromHost(() => renderDropdown(inputSearch.value));
        }

        renderDropdown(inputSearch.value === 'Default (Myriad Pro)' ? '' : inputSearch.value);
        dropdown.classList.remove('hidden');
    }

    function hideDropdown() {
        const dropdown = document.getElementById('font_dropdown');
        if (dropdown) dropdown.classList.add('hidden');
        selectedIndex = -1;
    }

    function setFontByName(name) {
        const inputSearch = document.getElementById('font_search_input');
        const inputHidden = document.getElementById('font_name');
        if (!inputSearch || !inputHidden) return;

        if (!name || name === 'default') {
            inputHidden.value = 'default';
            inputSearch.value = 'Default (Myriad Pro)';
            return;
        }

        inputHidden.value = name;
        const match = allFonts.find(f => f.name === name);
        if (match) {
            inputSearch.value = match.label || match.family;
        } else {
            inputSearch.value = name;
        }
    }

    function bindUI() {
        const inputSearch = document.getElementById('font_search_input');
        const dropdown = document.getElementById('font_dropdown');
        if (!inputSearch || !dropdown) return;

        inputSearch.addEventListener('focus', () => {
            showDropdown();
            inputSearch.select();
        });

        inputSearch.addEventListener('click', () => {
            showDropdown();
        });

        inputSearch.addEventListener('input', () => {
            renderDropdown(inputSearch.value);
            dropdown.classList.remove('hidden');
        });

        inputSearch.addEventListener('keydown', (e) => {
            const items = dropdown.querySelectorAll('.font-item');
            if (dropdown.classList.contains('hidden')) {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    showDropdown();
                    e.preventDefault();
                    return;
                }
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                updateHighlight(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                updateHighlight(items);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < currentRenderedItems.length) {
                    selectFont(currentRenderedItems[selectedIndex]);
                } else if (currentRenderedItems.length > 0) {
                    selectFont(currentRenderedItems[0]);
                }
            } else if (e.key === 'Escape') {
                hideDropdown();
            }
        });

        document.addEventListener('mousedown', (e) => {
            const container = document.querySelector('.font-picker-wrapper');
            if (container && !container.contains(e.target)) {
                hideDropdown();
            }
        });
    }

    function updateHighlight(items) {
        items.forEach((it, idx) => {
            if (idx === selectedIndex) {
                it.classList.add('active-item');
                it.scrollIntoView({ block: 'nearest' });
            } else {
                it.classList.remove('active-item');
            }
        });
    }

    return {
        init,
        setFontByName,
        fetchFontsFromHost
    };
})();
