// cards.js — Risk card deck management.
window.RISK_CARDS = (function () {
  const C = window.RISK_CONFIG;
  const U = window.RISK_UTILS;

  // Build a fresh 44-card deck and shuffle.
  function createDeck() {
    return U.shuffle(C.buildCardDeck());
  }

  function drawCard(deck) {
    if (deck.length === 0) return null; // reshuffle discard into deck if needed
    return deck.shift();
  }

  // Return the 44-card deck reshuffled from discard.
  function reshuffleDiscardInto(deck, discard) {
    while (discard.length) deck.push(discard.shift());
    return U.shuffle(deck);
  }

  return { createDeck, drawCard, reshuffleDiscardInto };
})();
