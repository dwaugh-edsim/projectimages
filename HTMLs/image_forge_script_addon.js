
async function listGoogleModels() {
    const key = document.getElementById('api-key-gl').value;
    const display = document.getElementById('model-list-display');
    display.style.display = 'block';
    display.innerText = "QUERYING GOOGLE API...";

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);

        if (data.models) {
            const names = data.models.map(m => m.name.replace('models/', '')).join('\n');
            display.innerText = "AVAILABLE MODELS:\n" + names;
        } else {
            display.innerText = "NO MODELS FOUND.";
        }
    } catch (e) {
        display.innerText = "ERROR: " + e.message;
    }
}
