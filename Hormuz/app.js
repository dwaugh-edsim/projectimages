// --- UI logic ---
const btnDraw = document.getElementById('tool-draw');
const btnShock = document.getElementById('tool-shock');
const btnReset = document.getElementById('tool-reset');
const btnSubmit = document.getElementById('submit-btn');
const instructions = document.getElementById('graph-instructions');
const p1Readout = document.getElementById('readout-p1');
const p2Readout = document.getElementById('readout-p2');

// --- Canvas Setup ---
const canvas = document.getElementById('market-graph');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

// Padding for axes
const pLeft = 60;
const pBottom = 60;
const pTop = 30;
const pRight = 30;

// Graph state
let state = 'start'; // start -> drawing_d -> drawing_s -> ready_to_shock -> shocked
let demandCurve = null;  // {x1, y1, x2, y2}
let supplyCurve1 = null; // {x1, y1, x2, y2}
let supplyCurve2 = null; // Shocked curve

// Helper: Convert canvas coords to "Price/Quantity" (rough scale)
function pToGraph(y) {
    // 0 to $3.00 scale roughly
    const ratio = 1 - ((y - pTop) / (height - pBottom - pTop));
    return (ratio * 3.00).toFixed(2);
}

// Draw the grid and axes
function drawBase() {
    ctx.clearRect(0, 0, width, height);

    // Axes lines
    ctx.beginPath();
    ctx.strokeStyle = '#94a3b8'; // Slate 400
    ctx.lineWidth = 2;
    // Y Axis (Price)
    ctx.moveTo(pLeft, pTop);
    ctx.lineTo(pLeft, height - pBottom);
    // X Axis (Quantity)
    ctx.lineTo(width - pRight, height - pBottom);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Quantity (Q)', width / 2, height - 20);

    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Price ($/L)', 0, 0);
    ctx.restore();
}

function drawCurve(curve, color, label, isDashed = false) {
    if (!curve) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    if (isDashed) {
        ctx.setLineDash([10, 10]);
    } else {
        ctx.setLineDash([]);
    }

    // Extrapolate the line to the edges of the graph area for a clean look
    const dx = curve.x2 - curve.x1;
    const dy = curve.y2 - curve.y1;
    const slope = dy / dx;

    // Find y across full x range (pLeft to width-pRight)
    const yAtLeft = curve.y1 + slope * (pLeft - curve.x1);
    const yAtRight = curve.y1 + slope * ((width - pRight) - curve.x1);

    ctx.moveTo(pLeft, yAtLeft);
    ctx.lineTo(width - pRight, yAtRight);
    ctx.stroke();
    ctx.setLineDash([]); // reset

    // Label it exactly where the user clicked their second point
    ctx.fillStyle = color;
    ctx.font = 'bold 16px Inter';
    ctx.fillText(label, curve.x2 + 10, curve.y2 - 10);
}

function findIntersection(line1, line2) {
    if (!line1 || !line2) return null;

    const x1 = line1.x1, y1 = line1.y1, x2 = line1.x2, y2 = line1.y2;
    const x3 = line2.x1, y3 = line2.y1, x4 = line2.x2, y4 = line2.y2;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom == 0) return null;

    const intersectX = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
    const intersectY = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;

    return { x: intersectX, y: intersectY };
}

function drawEquilibrium(x, y, label, color) {
    if (x < pLeft || x > width - pRight || y < pTop || y > height - pBottom) return;

    // Point
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Dotted lines to axes
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    // To Y
    ctx.moveTo(x, y);
    ctx.lineTo(pLeft, y);
    // To X
    ctx.moveTo(x, y);
    ctx.lineTo(x, height - pBottom);
    ctx.stroke();
    ctx.setLineDash([]); // reset

    // Label P
    ctx.fillStyle = color;
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'right';
    const priceText = `$${pToGraph(y)}`;
    ctx.fillText(priceText, pLeft - 8, y + 5);

    // Return the calculated price for the readout
    return priceText;
}

function render() {
    drawBase();

    if (demandCurve) drawCurve(demandCurve, '#3b82f6', 'D'); // Blue
    if (supplyCurve1) drawCurve(supplyCurve1, '#10b981', 'S1'); // Green

    let currentPrice = null;

    if (demandCurve && supplyCurve1) {
        const eq1 = findIntersection(demandCurve, supplyCurve1);
        if (eq1) currentPrice = drawEquilibrium(eq1.x, eq1.y, 'E1', '#f8fafc');
    }

    if (supplyCurve2) {
        drawCurve(supplyCurve2, '#ef4444', 'S2'); // Red
        const eq2 = findIntersection(demandCurve, supplyCurve2);
        if (eq2) {
            const shockPrice = drawEquilibrium(eq2.x, eq2.y, 'E2', '#ef4444');
            p2Readout.innerText = shockPrice;
        }
    } else {
        if (currentPrice) {
            p1Readout.innerText = currentPrice;
            p2Readout.innerText = "--";
        }
    }
}

// --- Interaction Logic ---
let isDrawing = false;
let startX, startY;

canvas.addEventListener('mousedown', (e) => {
    if (state !== 'drawing_d' && state !== 'drawing_s') return;

    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    isDrawing = true;
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;

    render();

    // Draw temp line
    ctx.beginPath();
    ctx.strokeStyle = state === 'drawing_d' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(16, 185, 129, 0.5)';
    ctx.lineWidth = 4;
    ctx.moveTo(startX, startY);
    ctx.lineTo(curX, curY);
    ctx.stroke();
});

canvas.addEventListener('mouseup', (e) => {
    if (!isDrawing) return;
    isDrawing = false;

    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    // Prevent tiny clicks
    if (Math.abs(endX - startX) < 20) return;

    if (state === 'drawing_d') {
        demandCurve = { x1: startX, y1: startY, x2: endX, y2: endY };
        state = 'drawing_s';
        instructions.innerHTML = "Great. Now draw the initial <b>SUPPLY</b> curve (pointing UP).";
    }
    else if (state === 'drawing_s') {
        supplyCurve1 = { x1: startX, y1: startY, x2: endX, y2: endY };
        state = 'ready_to_shock';
        instructions.style.display = 'none';
        btnDraw.classList.remove('active');
        btnShock.disabled = false;

        // Ensure intersection exists before allowing shock
        const eq1 = findIntersection(demandCurve, supplyCurve1);
        if (!eq1 || eq1.x < pLeft || eq1.x > width - pRight || eq1.y < pTop || eq1.y > height - pBottom) {
            alert("Those lines don't cross on the graph properly! Try drawing them clearer.");
            resetGraph();
            return;
        }
    }
    render();
});

// --- Buttons ---
btnDraw.addEventListener('click', () => {
    if (state === 'start') {
        state = 'drawing_d';
        instructions.innerHTML = "1. Click and drag to draw a steep <b>DEMAND</b> curve (pointing DOWN).";
        instructions.style.display = 'block';
        btnDraw.classList.add('active');
    }
});

btnShock.addEventListener('click', () => {
    if (state !== 'ready_to_shock') return;
    state = 'shocked';

    // Create S2 by shifting S1 left (decrease an amount)
    const shiftAmount = 60;
    supplyCurve2 = {
        x1: supplyCurve1.x1 - shiftAmount,
        y1: supplyCurve1.y1,
        x2: supplyCurve1.x2 - shiftAmount,
        y2: supplyCurve1.y2
    };

    render();
    btnShock.disabled = true;

    // Reveal Day 2 Prompt
    const feed = document.getElementById('scenario-feed');
    const updateHTML = `
        <div class="briefing-card update" style="border-left-color: var(--success); opacity: 0; animation: fadeIn 1s forwards;">
            <span class="timestamp">DAY 2 UPDATE</span>
            <h4>THE INELASTICITY SPIKE</h4>
            <p>Look at the new Equilibrium (E2). Because demand is highly steep (inelastic), a small leftward shift in supply caused a massive spike in price.</p>
            <hr>
            <p class="instruction"><strong>DIRECTIVE:</strong> Fill out the Part 2 Advisor Briefing form below to advise the Premier.</p>
        </div>
    `;
    feed.insertAdjacentHTML('beforeend', updateHTML);

    // Show form
    setTimeout(() => {
        document.getElementById('policy-form').scrollIntoView({ behavior: 'smooth' });
    }, 500);
});

function resetGraph() {
    state = 'start';
    demandCurve = null;
    supplyCurve1 = null;
    supplyCurve2 = null;

    btnShock.disabled = true;
    btnDraw.classList.remove('active');
    instructions.style.display = 'block';
    instructions.innerHTML = "Ready to start analysis. Click 'Draw Market'.";

    p1Readout.innerText = '--';
    p2Readout.innerText = '--';

    // Remove day 2 updates if any
    const updates = document.querySelectorAll('.briefing-card.update');
    updates.forEach(el => el.remove());

    render();
}

btnReset.addEventListener('click', resetGraph);

// --- Form Submission ---
btnSubmit.addEventListener('click', (e) => {
    e.preventDefault();

    const name = document.getElementById('student-name').value;
    const pred = document.getElementById('predictions').value;
    const pol = document.getElementById('policy').value;

    if (!name || !pred || !pol || !supplyCurve2) {
        alert("Please draw the shock graph and fill out all text fields before transmitting.");
        return;
    }

    // Capture canvas as base64 image
    const graphImageBase64 = canvas.toDataURL('image/png');

    btnSubmit.innerText = "TRANSMITTING...";
    btnSubmit.disabled = true;

    const payload = {
        name: name,
        predictions: pred,
        policy: pol,
        imageData: graphImageBase64
    };

    // Google Apps Script Web App URL goes here
    const scriptURL = "https://script.google.com/macros/s/AKfycbzetjsitM2UvkjMg6crFdUy1MgqKm1rfcsSL353RSE96bOTqelnn9d_6EY08QFANwfm/exec";

    fetch(scriptURL, {
        method: 'POST',
        body: JSON.stringify(payload)
    })
        .then(response => {
            showToast("Briefing transmitted securely to the Premier's office.");
            btnSubmit.innerText = "TRANSMISSION COMPLETE";
        })
        .catch(error => {
            console.error('Error!', error.message);
            alert("Error transmitting.");
            btnSubmit.disabled = false;
            btnSubmit.innerText = "TRANSMIT BRIEFING";
        });
});

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// --- Init ---
setInterval(() => {
    const d = new Date();
    document.getElementById('system-clock').innerText =
        d.getHours().toString().padStart(2, '0') + ':' +
        d.getMinutes().toString().padStart(2, '0') + ':' +
        d.getSeconds().toString().padStart(2, '0') + ' AST';
}, 1000);

render();
