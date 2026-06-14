// dice.js — Dice animation + roll helpers.
window.RISK_DICE = (function () {
  const R = window.RISK_RULES;
  const U = window.RISK_UTILS;

  // Roll N dice, sorted desc, no animation (used by AI / rules internally).
  function rollN(count) {
    return R.rollDice(count);
  }

  // Compute face transform string for a 3D dice CSS animation.
  // We render dice using div.face wrappers rotated to show a pip layout.
  function diceFaceHTML(value, color) {
    const dot = (x, y) => `<span class="dot" style="--x:${x};--y:${y}"></span>`;
    const layouts = {
      1: [dot(50, 50)],
      2: [dot(25, 25), dot(75, 75)],
      3: [dot(25, 25), dot(50, 50), dot(75, 75)],
      4: [dot(25, 25), dot(75, 25), dot(25, 75), dot(75, 75)],
      5: [dot(25, 25), dot(75, 25), dot(50, 50), dot(25, 75), dot(75, 75)],
      6: [dot(25, 25), dot(75, 25), dot(25, 50), dot(75, 50), dot(25, 75), dot(75, 75)],
    };
    return `<div class="die" style="background:${color}">
      <div class="face">${layouts[value].join('')}</div>
    </div>`;
  }

  // Display an animated dice roll. Returns a promise that resolves with the
  // final rolls after the animation finishes.
  async function animateRoll(container, rolls, options = {}) {
    const color = options.color || '#dc2626';
    const duration = options.duration || 900;
    container.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (const v of rolls) {
      const wrap = document.createElement('div');
      wrap.className = 'die-wrap';
      wrap.innerHTML = diceFaceHTML(v, color);
      frag.appendChild(wrap);
    }
    container.appendChild(frag);
    // tumbling animation
    container.classList.add('rolling');
    await U.delay(duration);
    container.classList.remove('rolling');
    container.classList.add('done');
    return rolls;
  }

  return { rollN, animateRoll, diceFaceHTML };
})();
