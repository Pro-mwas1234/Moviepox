let CONFIG = null;

async function loadConfig() {
    try {
        const response = await fetch('config.json');
        CONFIG = await response.json();
        console.log('✓ Config loaded');
        return CONFIG;
    } catch (error) {
        console.error('Config load error:', error);
        alert('Failed to load config.json. Please use a local server (http-server, Live Server, or python -m http.server)');
        return null;
    }
}

window.loadConfig = loadConfig;
window.getConfig = () => CONFIG;