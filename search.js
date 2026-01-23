/**
 * Search Module
 * Handles search functionality with debouncing
 */

const Search = (() => {
    // Cache DOM elements
    const elements = {
        searchToggle: null,
        searchBox: null,
        searchInput: null
    };
    
    // Search state
    let searchTimeout = null;
    let isSearching = false;
    
    /**
     * Initialize search
     */
    function init() {
        elements.searchToggle = document.getElementById('searchToggle');
        elements.searchBox = document.getElementById('searchBox');
        elements.searchInput = document.getElementById('searchInput');
        
        // Toggle search box
        elements.searchToggle?.addEventListener('click', toggleSearchBox);
        
        // Search input with debouncing
        elements.searchInput?.addEventListener('input', handleSearchInput);
        
        // Close search on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                closeSearchBox();
            }
        });
    }
    
    /**
     * Toggle search box visibility
     */
    function toggleSearchBox(e) {
        e.stopPropagation();
        
        if (elements.searchBox?.classList.contains('active')) {
            closeSearchBox();
        } else {
            openSearchBox();
        }
    }
    
    /**
     * Open search box
     */
    function openSearchBox() {
        elements.searchBox?.classList.add('active');
        elements.searchInput?.focus();
    }
    
    /**
     * Close search box
     */
    function closeSearchBox() {
        elements.searchBox?.classList.remove('active');
        if (!elements.searchInput?.value) {
            UI.hideSearchResults();
        }
    }
    
    /**
     * Handle search input with debouncing
     */
    function handleSearchInput(e) {
        const query = e.target.value.trim();
        
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // If query is empty, hide search results
        if (!query) {
            UI.hideSearchResults();
            return;
        }
        
        // Debounce search - wait 500ms after user stops typing
        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 500);
    }
    
    /**
     * Perform search
     */
    async function performSearch(query) {
        if (isSearching) return;
        
        isSearching = true;
        UI.showLoading();
        
        try {
            const data = await API.searchMulti(query);
            
            if (data && data.results) {
                UI.showSearchResults(data.results);
            } else {
                UI.showSearchResults([]);
            }
        } catch (error) {
            console.error('Search error:', error);
            UI.showSearchResults([]);
        } finally {
            isSearching = false;
            UI.hideLoading();
        }
    }
    
    /**
     * Clear search
     */
    function clearSearch() {
        if (elements.searchInput) {
            elements.searchInput.value = '';
        }
        UI.hideSearchResults();
    }
    
    // Public API
    return {
        init,
        clearSearch
    };
})();