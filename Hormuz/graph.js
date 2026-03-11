/**
 * Shared graphing logic.
 * Connects to a <canvas> element and handles drawing curved Demand and Supply lines.
 */

class EconomicsGraph {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Padding
        this.pLeft = 60;
        this.pBottom = 60;
        this.pTop = 30;
        this.pRight = 30;

        // Curves
        this.demandCurve = null;  // {x1, y1, x2, y2}
        this.supplyCurve1 = null; // {x1, y1, x2, y2}
        this.supplyCurve2 = null; // {x1, y1, x2, y2}

        // Grid spacing for snapping
        this.gridSize = 20;
    }

    // --- Core Rendering ---

    drawBase() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Grid Lines
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        this.ctx.lineWidth = 1;
        for (let x = this.pLeft; x <= this.width - this.pRight; x += this.gridSize) {
            this.ctx.moveTo(x, this.pTop);
            this.ctx.lineTo(x, this.height - this.pBottom);
        }
        for (let y = this.pTop; y <= this.height - this.pBottom; y += this.gridSize) {
            this.ctx.moveTo(this.pLeft, y);
            this.ctx.lineTo(this.width - this.pRight, y);
        }
        this.ctx.stroke();

        // Axes lines
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#94a3b8'; // Slate 400
        this.ctx.lineWidth = 2;
        // Y Axis (Price)
        this.ctx.moveTo(this.pLeft, this.pTop);
        this.ctx.lineTo(this.pLeft, this.height - this.pBottom);
        // X Axis (Quantity)
        this.ctx.lineTo(this.width - this.pRight, this.height - this.pBottom);
        this.ctx.stroke();

        // Labels
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = '14px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Quantity (Q)', this.width / 2, this.height - 20);

        this.ctx.save();
        this.ctx.translate(20, this.height / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText('Price ($)', 0, 0);
        this.ctx.restore();
    }

    // Draws a quadratic curve from top-left to bottom-right bowing *inward* toward origin
    drawCurvedLine(curve, color, label, curveType) {
        if (!curve) return;
        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 4;

        const x1 = curve.x1;
        const y1 = curve.y1;
        const x2 = curve.x2;
        const y2 = curve.y2;

        // Control point for the bow. 
        // For standard economic curves, it pulls slightly inward toward the origin (bottom left)
        let cpX, cpY;

        if (curveType === 'demand') {
            // Demand goes top-left to bottom-right. Bow inward (down and left).
            cpX = Math.min(x1, x2) - 40;
            cpY = Math.max(y1, y2) + 40;
        } else {
            // Supply goes bottom-left to top-right. Bow inward (up and left).
            cpX = Math.min(x1, x2) - 20;
            cpY = Math.min(y1, y2) - 20;
        }

        this.ctx.moveTo(x1, y1);
        this.ctx.quadraticCurveTo(cpX, cpY, x2, y2);
        this.ctx.stroke();

        // Label
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 16px Inter';
        this.ctx.fillText(label, x2 + 10, y2);
    }

    render() {
        this.drawBase();

        if (this.demandCurve) this.drawCurvedLine(this.demandCurve, '#3b82f6', 'D', 'demand');
        if (this.supplyCurve1) this.drawCurvedLine(this.supplyCurve1, '#10b981', 'S1', 'supply');
        if (this.supplyCurve2) this.drawCurvedLine(this.supplyCurve2, '#ef4444', 'S2', 'supply');

        // For equilibrium, we estimate intersection since exact math on quadratic beziers is overkill for this sim
        if (this.demandCurve && this.supplyCurve1) {
            const eq1 = this.estimateIntersection(this.demandCurve, this.supplyCurve1, 'demand', 'supply');
            if (eq1) this.drawEquilibrium(eq1.x, eq1.y, 'E1', '#f8fafc');
        }

        if (this.demandCurve && this.supplyCurve2) {
            const eq2 = this.estimateIntersection(this.demandCurve, this.supplyCurve2, 'demand', 'supply');
            if (eq2) {
                const shockPrice = this.drawEquilibrium(eq2.x, eq2.y, 'E2', '#ef4444');
                const readout = document.getElementById('readout-p2');
                if (readout) readout.innerText = shockPrice;
            }
        }
    }

    drawEquilibrium(x, y, label, color) {
        if (x < this.pLeft || x > this.width - this.pRight || y < this.pTop || y > this.height - this.pBottom) return;

        this.ctx.beginPath();
        this.ctx.arc(x, y, 6, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(this.pLeft, y);
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x, this.height - this.pBottom);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 14px Inter';
        this.ctx.textAlign = 'right';

        // Scale 0 to ~3.00 based on Y
        const ratio = 1 - ((y - this.pTop) / (this.height - this.pBottom - this.pTop));
        const price = (ratio * 3.00).toFixed(2);
        const priceText = `$${price}`;

        this.ctx.fillText(priceText, this.pLeft - 8, y + 5);
        return priceText;
    }

    // A rough estimator for visual curve intersection
    estimateIntersection(line1, line2, type1, type2) {
        // Just use linear intersection for the simulation's mathematical anchor, 
        // even though it's drawn curved, it looks close enough for high school S/D.
        const x1 = line1.x1, y1 = line1.y1, x2 = line1.x2, y2 = line1.y2;
        const x3 = line2.x1, y3 = line2.y1, x4 = line2.x2, y4 = line2.y2;

        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (denom == 0) return null;

        const intersectX = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
        const intersectY = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;

        return { x: intersectX, y: intersectY };
    }

    snapToGrid(val) {
        return Math.round(val / this.gridSize) * this.gridSize;
    }
}
