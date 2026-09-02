/**
 * Bicentennial Junior High School — Student Webhook API Client
 * Mr. Waugh (Room 8)
 * 
 * Supports Cross-Device State Persistence:
 * Logs in with PIN + Name and recovers all previous answers from Google Sheet.
 */

const CONFIG = {
    DEFAULT_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzsfWqIHC5ToS-6tYPexArJ6SvW0NAChEnZR5YQmwkK4MYm1CMD-zqgleTTDqLMcPsW/exec',
    COURSES: {
        'CIT9': 'https://script.google.com/macros/s/AKfycbzsfWqIHC5ToS-6tYPexArJ6SvW0NAChEnZR5YQmwkK4MYm1CMD-zqgleTTDqLMcPsW/exec',
        'HL8':  'https://script.google.com/macros/s/AKfycbzsfWqIHC5ToS-6tYPexArJ6SvW0NAChEnZR5YQmwkK4MYm1CMD-zqgleTTDqLMcPsW/exec',
        'HL9':  'https://script.google.com/macros/s/AKfycbzsfWqIHC5ToS-6tYPexArJ6SvW0NAChEnZR5YQmwkK4MYm1CMD-zqgleTTDqLMcPsW/exec'
    }
};

const StudentAPI = {
    getScriptUrl(courseKey) {
        return CONFIG.COURSES[courseKey] || CONFIG.DEFAULT_SCRIPT_URL;
    },

    async login(className, firstName, pin, courseKey = 'HL9') {
        const url = this.getScriptUrl(courseKey);
        try {
            const res = await fetch(url, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'login',
                    className: className,
                    name: firstName,
                    pin: pin.toUpperCase().trim()
                })
            });
            const data = await res.json();
            if (data.status === 'success') {
                Session.set(className, data.name || firstName, pin.toUpperCase().trim(), data.email || '', data.pronouns || '');
            }
            return data;
        } catch (e) {
            console.warn("Offline or Demo Mode:", e);
            Session.set(className, firstName, pin.toUpperCase().trim());
            return { 
                status: 'success', 
                isOffline: true, 
                name: firstName, 
                className: className,
                savedData: {} 
            };
        }
    },

    async submitProfile(taskName, profileData, summaryText, courseKey = 'HL9') {
        const url = this.getScriptUrl(courseKey);
        const pin = Session.getPin();
        const name = profileData.name || Session.getName();
        const className = Session.getClass();
        const email = profileData.email || Session.getEmail();
        const pronouns = profileData.pronouns || Session.getPronouns();

        if (!pin) {
            return { status: 'error', message: 'Please log in with your Name and 3-Letter PIN first.' };
        }

        try {
            const res = await fetch(url, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'submit_profile',
                    taskName: taskName,
                    className: className,
                    name: name,
                    pin: pin,
                    email: email,
                    pronouns: pronouns,
                    data: profileData,
                    summary: summaryText
                })
            });
            const data = await res.json();
            if (data.status === 'success') {
                Session.set(className, name, pin, email, pronouns);
            }
            return data;
        } catch (e) {
            console.warn("Submission error / saving locally:", e);
            const localKey = `submission_${className}_${pin}_${taskName}`;
            localStorage.setItem(localKey, JSON.stringify({
                task: taskName,
                time: new Date().toISOString(),
                data: profileData,
                summary: summaryText
            }));
            return { status: 'success', isOffline: true, message: 'Saved locally on device (offline mode).' };
        }
    }
};

// Session storage helper with email and pronouns
const Session = {
    set(className, name, pin, email = '', pronouns = '') {
        sessionStorage.setItem('bh_class', className);
        sessionStorage.setItem('bh_name', name);
        sessionStorage.setItem('bh_pin', pin);
        sessionStorage.setItem('bh_email', email);
        sessionStorage.setItem('bh_pronouns', pronouns);
    },
    getClass() { return sessionStorage.getItem('bh_class') || '801'; },
    getName() { return sessionStorage.getItem('bh_name') || ''; },
    getPin() { return sessionStorage.getItem('bh_pin') || ''; },
    getEmail() { return sessionStorage.getItem('bh_email') || ''; },
    getPronouns() { return sessionStorage.getItem('bh_pronouns') || ''; },
    isLoggedIn() { return !!sessionStorage.getItem('bh_pin'); },
    clear() {
        sessionStorage.clear();
    }
};

// Common Toast UI
function showToast(msg, isError = false) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            padding: 12px 20px;
            border-radius: 6px;
            color: #ffffff;
            font-family: 'Open Sans', sans-serif;
            font-size: 0.9em;
            font-weight: 600;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: all 0.3s ease;
            opacity: 0;
            transform: translateY(10px);
        `;
        document.body.appendChild(toast);
    }
    toast.style.backgroundColor = isError ? '#dc2626' : '#16a34a';
    toast.innerText = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
    }, 3500);
}
