const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzetjsitM2UvkjMg6crFdUy1MgqKm1rfcsSL353RSE96bOTqelnn9d_6EY08QFANwfm/exec';

// Centralized API calls
const API = {
    async login(name, pin) {
        try {
            const res = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'login', name, pin })
            });
            const data = await res.json();
            return data;
        } catch (e) {
            console.error(e);
            return { status: 'error', message: 'Network connection failed.' };
        }
    },

    async saveState(pin, stage) {
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'save_state', pin, stage })
            });
        } catch (e) {
            console.error(e);
        }
    },

    async submitFinal(pin, predictions, policy, imageData) {
        try {
            const res = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'submit_final', pin, predictions, policy, imageData })
            });
            return await res.json();
        } catch (e) {
            console.error(e);
            return { status: 'error' };
        }
    },

    async fetchAI(model, messages) {
        try {
            const res = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'fetch_ai', pin: this.getPinFallback(), model, messages })
            });
            const data = await res.json();

            // Intercept Apps Script error wrapper
            if (data && data.status === 'error') {
                console.error("Backend Proxy Error:", data.message);
                return { error: { message: data.message } };
            }

            return data;
        } catch (e) {
            console.error(e);
            return { status: 'error', error: { message: e.toString() } };
        }
    },

    async getLeaderboard() {
        try {
            const res = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'get_leaderboard', pin: '0000' }) // Dummy PIN
            });
            return await res.json();
        } catch (e) {
            console.error(e);
            return { status: 'error' };
        }
    },

    // Internal helper for when Session isn't available or we need a quick PIN
    getPinFallback() {
        return sessionStorage.getItem('hormuz_pin') || '0000';
    }
};

// Global session helper (Uses sessionStorage just to pass the PIN between pages during one sitting)
const Session = {
    setPin(pin) { sessionStorage.setItem('hormuz_pin', pin); },
    getPin() { return sessionStorage.getItem('hormuz_pin'); },
    setName(name) { sessionStorage.setItem('hormuz_name', name); },
    getName() { return sessionStorage.getItem('hormuz_name'); }
};

// Common toast UI
function showToast(msg, isError = false) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.style.backgroundColor = isError ? 'var(--urgent)' : 'var(--success)';
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
