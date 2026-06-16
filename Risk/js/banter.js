// banter.js — Smack-talk chat system for players.
window.RISK_BANTER = (function () {
  const S = window.RISK_STATE;
  const C = window.RISK_CONFIG;
  const U = window.RISK_UTILS;

  let chatMessagesEl = null;
  let chatInputEl = null;
  let btnSendChatEl = null;

  // Rich set of contextual smack-talk templates for old friends vibe
  const BANTER_TEMPLATES = {
    aggressive: {
      turnStart: [
        "Alright dickheads, my turn. Prep your borders.",
        "Your defense here looks like hot garbage, honestly.",
        "No mercy this turn. I'm rolling heavy.",
        "Let's see which one of you bastards left a gap."
      ],
      conquest: [
        "Boom! Easiest fight of my life. Next?",
        "Took that like taking candy from a baby. Pathetically easy.",
        "Get that weak crap out of my face!",
        "And that's how you conquer a territory, you amateurs."
      ],
      loss: [
        "Are you fucking kidding me? Lucky ass rolls.",
        "You absolute bastard. Enjoy it while it lasts, I'm coming back twice as hard.",
        "Bullshit dice. I should have rolled you over.",
        "Okay, now it's personal."
      ],
      cardTrade: [
        "Trading in. Say hello to my new army. You guys are screwed.",
        "Just cashed in a set. Prepare to get steamrolled.",
        "Oh boy, look at all these units. RIP to whoever is next to me."
      ],
      elimination: [
        "Rest in pieces, you absolute loser. Your cards are mine now.",
        "Cleaned you off the board! Don't let the door hit you on the way out."
      ],
      replies: [
        "Talk all you want, you're still getting wiped next turn.",
        "Shut up and roll the dice, mouth breather.",
        "Are we playing Risk or typing class? Shut the hell up.",
        "Your tears only make my armies stronger."
      ]
    },
    defensive: {
      turnStart: [
        "Just reinforcing. Don't touch my stuff and we won't have problems.",
        "Borders are secure. Don't do anything stupid, guys.",
        "Building a wall. A very, very thick wall.",
        "Peace is nice. Try to attack me and see what happens."
      ],
      conquest: [
        "Had to secure my buffer zone. Strategic necessity.",
        "Sorry buddy, you were getting a bit too close to my turf.",
        "Nothing personal, just cleaning up my borders.",
        "Just a minor adjustment. Stay calm."
      ],
      loss: [
        "Hey! Unprovoked attack! What the hell, man?",
        "You'll regret that. My counter-fortress is already building.",
        "You wasted how many armies trying to crack my wall? Idiot.",
        "Cheap shot. I won't forget this."
      ],
      cardTrade: [
        "Cards turned in. More walls for me, stay back.",
        "Cashing in. Just building up my defense force.",
        "Trade-in complete. Dare you to try attacking me now."
      ],
      elimination: [
        "I told you not to mess with my fortress. Bye buddy.",
        "Sad to see you go, but you played way too reckless."
      ],
      replies: [
        "I'm just minding my own business. Leave me out of your dramas.",
        "I suggest we respect each other's boundaries before someone gets hurt.",
        "Type all you want, my defense rating is impenetrable.",
        "Let's keep it civil. We're all old friends here... mostly."
      ]
    },
    opportunistic: {
      turnStart: [
        "Let's see who left themselves completely exposed...",
        "Aha, a nice juicy target. Thank you very much.",
        "Calculating the odds... yes, you're weak here.",
        "Time to exploit some terrible positioning."
      ],
      conquest: [
        "Thanks for leaving the front door unlocked, dumbass!",
        "Easiest 2 armies I've ever beaten. Math doesn't lie.",
        "Saw an opening and took it. Basic strategy.",
        "You practically invited me in. I couldn't say no."
      ],
      loss: [
        "Well, that was statistically highly improbable. Bullshit.",
        "Ouch. That was a bad trade for me.",
        "You actually defended that? Damn it.",
        "Note to self: don't attack lucky bastards."
      ],
      cardTrade: [
        "Trading cards. Let's see where I can get the maximum value.",
        "Traded. Time to invest these reinforcements wisely.",
        "More armies for the calculation. This will be efficient."
      ],
      elimination: [
        "Thanks for the cards! Easiest cleanup job ever.",
        "You were the weakest link. Goodbye!"
      ],
      replies: [
        "I only attack when it's logical. Right now, talking to you is illogical.",
        "Don't cry to me about strategy. It's just numbers, friend.",
        "If you didn't want to get hit, you shouldn't have left 1 army on guard.",
        "Is that a threat or just bad math?"
      ]
    },
    chaotic: {
      turnStart: [
        "I have absolutely no idea what I'm doing this turn! Let's go!",
        "Let's roll some dice and see what explodes!",
        "Wild card time, baby! Who wants to get hit?",
        "Eeny, meeny, miny... YOU!"
      ],
      conquest: [
        "Chaos reigns! Mwahaha!",
        "I conquered this just because I liked the shape of the border.",
        "Did I win? Awesome! What were we fighting for again?",
        "Surprise, motherfucker!"
      ],
      loss: [
        "Haha! That was spectacular! Do it again!",
        "Wow, my armies melted like butter. Neat!",
        "You wiped me out? You crazy bastard, I love it!",
        "Roll again! I want to see more ones!"
      ],
      cardTrade: [
        "Trading cards! What do I get? Armies? Yay!",
        "Cashing in! Let's make a giant pile of units somewhere random!",
        "Look at all these shiny new soldiers. Time to cause some chaos!"
      ],
      elimination: [
        "Boom! You got deleted! Want some ice for that burn?",
        "And another one bites the dust! Chaos claims another soul!"
      ],
      replies: [
        "Are we playing Risk or typing class? Let's just roll the damn dice!",
        "I think Australia is upside down. Thoughts?",
        "Let's make a treaty! I promise to break it in 2 minutes.",
        "Do you think dice have feelings? I feel like they hate me today."
      ]
    }
  };

  function init() {
    chatMessagesEl = document.getElementById('chat-messages');
    chatInputEl = document.getElementById('chat-input');
    btnSendChatEl = document.getElementById('btn-send-chat');

    // Switch tabs
    const tabLog = document.getElementById('tab-log');
    const tabChat = document.getElementById('tab-chat');
    const logContainer = document.getElementById('game-log-container');
    const chatContainer = document.getElementById('smack-talk-container');

    if (tabLog && tabChat && logContainer && chatContainer) {
      tabLog.onclick = () => {
        tabLog.classList.add('active');
        tabChat.classList.remove('active');
        logContainer.style.display = 'block';
        chatContainer.style.display = 'none';
      };
      tabChat.onclick = () => {
        tabChat.classList.add('active');
        tabLog.classList.remove('active');
        logContainer.style.display = 'none';
        chatContainer.style.display = 'flex';
        // Scroll to bottom
        if (chatMessagesEl) {
          chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        }
      };
    }

    // Wire send buttons
    if (chatInputEl && btnSendChatEl) {
      btnSendChatEl.onclick = sendPlayerMessage;
      chatInputEl.onkeydown = (e) => {
        if (e.key === 'Enter') sendPlayerMessage();
      };
    }

    // Register state event listeners for automatic AI banter
    S.on('init', () => {
      if (chatMessagesEl) chatMessagesEl.innerHTML = '';
      postSystemMessage("Welcome to Smack Talk! Chat with your old friends (AIs) here.");
    });

    S.on('phase', (phase) => {
      const state = S.get();
      if (!state) return;
      const p = state.players[state.currentPlayer];
      if (!p || p.isHuman || p.eliminated) return;

      // Only talk smack at the start of REINFORCE (start of turn)
      if (phase === C.PHASES.REINFORCE) {
        triggerAIBanter(p, 'turnStart');
      }
    });

    S.on('conquest', (info) => {
      const state = S.get();
      if (!state) return;
      const p = state.players[state.currentPlayer];
      if (!p || p.isHuman) return;
      triggerAIBanter(p, 'conquest');
    });

    S.on('combat', (info) => {
      // If defender is human or AI, they can complain if they lost armies
      const state = S.get();
      if (!state || !info) return;
      
      const defenderId = state.territories[info.toId].owner;
      const defender = state.players[defenderId];
      if (defender && !defender.isHuman && info.defenderLosses > 0 && Math.random() < 0.3) {
        // AI complains about losing battle or defense
        triggerAIBanter(defender, 'loss', 1000);
      }
    });

    S.on('elimination', (info) => {
      const state = S.get();
      if (!state || !info) return;
      const conqueror = state.players[state.currentPlayer];
      if (conqueror && !conqueror.isHuman) {
        triggerAIBanter(conqueror, 'elimination', 1200);
      }
    });
  }

  function postSystemMessage(text) {
    if (!chatMessagesEl) return;
    const msg = document.createElement('div');
    msg.className = 'chat-msg system';
    msg.innerHTML = `<span class="chat-msg-text">${text}</span>`;
    chatMessagesEl.appendChild(msg);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }

  function postMessage(senderName, senderColorHex, text, isSelf = false) {
    if (!chatMessagesEl) return;
    const msg = document.createElement('div');
    msg.className = `chat-msg ${isSelf ? 'self' : 'other'}`;
    
    if (!isSelf) {
      msg.style.borderLeft = `3px solid ${senderColorHex}`;
    }

    msg.innerHTML = `
      <span class="chat-msg-sender" style="color: ${isSelf ? 'var(--accent-gold)' : senderColorHex}">${senderName}</span>
      <span class="chat-msg-text">${escapeHtml(text)}</span>
    `;
    chatMessagesEl.appendChild(msg);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  const G = window.RISK_GAS;

  function slurText(text) {
    let slurred = text;
    // Slur common letter combinations
    slurred = slurred.replace(/s/gi, 'sh');
    slurred = slurred.replace(/th/gi, 'f');
    slurred = slurred.replace(/ing\b/gi, 'in\'');
    slurred = slurred.replace(/you/gi, 'ya');
    slurred = slurred.replace(/are/gi, 'r');
    
    // Add typos
    const words = slurred.split(' ');
    const typoed = words.map(w => {
      if (w.length > 4 && Math.random() < 0.25) {
        const idx = Math.floor(Math.random() * (w.length - 2)) + 1;
        return w.substring(0, idx) + w[idx+1] + w[idx] + w.substring(idx+2);
      }
      return w;
    });
    slurred = typoed.join(' ');

    const fillers = [
      "... *hic*",
      " I swear to god I'm sober.",
      " ...dude.",
      " *burp*",
      " ...ya know?",
      " ...ish what it ish.",
      " ...trust me on this."
    ];
    if (Math.random() < 0.6) {
      slurred += fillers[Math.floor(Math.random() * fillers.length)];
    }
    
    if (Math.random() < 0.3) {
      slurred = slurred.toUpperCase() + "!!!";
    } else {
      slurred += "!!";
    }
    return slurred;
  }

  async function getLLMBanterReply(ai, humanPlayer, playerMessage) {
    const model = document.getElementById('settings-model')?.value || 'openrouter/free';
    const ginLemon = document.getElementById('settings-gin-lemon')?.checked;
    const state = S.get();
    
    const aiTerritories = Object.values(state.territories)
      .filter(t => t.owner === ai.id)
      .map(t => `${t.name} (${t.armies} armies)`)
      .join(', ');
      
    let drunkPrompt = '';
    if (ginLemon) {
      drunkPrompt = `You have had 3 gin & lemons and are slightly drunk. Slur your words slightly, write with minor typos, and act extra loud, silly, affectionate, or randomly confrontational.`;
    }
      
    const system = `You are playing Risk, a strategic board game.
You are playing as the AI player "${ai.name}" who has the personality: "${ai.personality || 'aggressive'}".
${drunkPrompt}
You and the other players are old friends who know each other well. You tease each other, make witty/sarcastic comments, and swear sometimes (e.g. use words like damn, hell, crap, bullshit, dickhead, bastard, dumbass, garbage, idiot).
Keep your response extremely short (1 to 2 sentences max) and in character. Do not include any JSON, prefixes, markdown, quote marks, or meta-commentary—just your direct reply in the chat.
Current board context:
- Your territories: ${aiTerritories || 'none'}
- Active opponents: ${state.players.filter(p => !p.eliminated && p.id !== ai.id).map(p => p.name).join(', ')}
`;
    const user = `${humanPlayer.name} just said to you: "${playerMessage}"`;

    try {
      const res = await G.llmChat({ model, system, user, maxTokens: 80, temperature: 0.8 });
      if (res && res.text) {
        return res.text.trim().replace(/^"|"$/g, '');
      }
      throw new Error('Empty response');
    } catch (e) {
      console.warn('LLM banter failed, falling back:', e.message);
      return null;
    }
  }

  function sendPlayerMessage() {
    const text = chatInputEl.value.trim();
    if (!text) return;
    chatInputEl.value = '';

    const state = S.get();
    const human = state.players.find(p => p.isHuman);
    if (!human) return;

    postMessage(human.name, human.colorHex, text, true);

    // AI replies after a short delay
    setTimeout(() => {
      // Pick a random active non-human player
      const activeAIs = state.players.filter(p => !p.isHuman && !p.eliminated);
      if (activeAIs.length === 0) return;
      
      const ai = U.pickRandom(activeAIs);
      showTypingIndicatorAndReply(ai, text);
    }, 400);
  }

  async function showTypingIndicatorAndReply(ai, playerMessage) {
    if (!chatMessagesEl) return;
    
    // Create indicator
    const indicator = document.createElement('div');
    indicator.className = 'chat-typing';
    indicator.textContent = `${ai.name} is typing...`;
    chatMessagesEl.appendChild(indicator);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;

    const state = S.get();
    const human = state.players.find(p => p.isHuman);

    let reply = null;
    if (G.getUrl() && G.getSession() && human) {
      // Try LLM first
      reply = await getLLMBanterReply(ai, human, playerMessage);
    }

    // Fallback if LLM failed or not logged in
    if (!reply) {
      const personality = ai.personality || 'aggressive';
      const list = BANTER_TEMPLATES[personality].replies;
      reply = U.pickRandom(list);
      
      const ginLemon = document.getElementById('settings-gin-lemon')?.checked;
      if (ginLemon) {
        reply = slurText(reply);
      }
    }

    indicator.remove();
    postMessage(ai.name, ai.colorHex, reply, false);
  }

  function triggerAIBanter(ai, category, delayMs = 500) {
    if (!chatMessagesEl || ai.isHuman || ai.eliminated) return;
    
    setTimeout(() => {
      // Random chance to banter to avoid spamming too much
      const chance = (category === 'turnStart' || category === 'elimination') ? 0.7 : 0.45;
      if (Math.random() > chance) return;

      const personality = ai.personality || 'aggressive';
      const list = BANTER_TEMPLATES[personality][category];
      if (!list || !list.length) return;
      let text = U.pickRandom(list);
      
      const ginLemon = document.getElementById('settings-gin-lemon')?.checked;
      if (ginLemon) {
        text = slurText(text);
      }
      postMessage(ai.name, ai.colorHex, text, false);
    }, delayMs + Math.random() * 500);
  }

  return { init, postSystemMessage, postMessage, triggerAIBanter };
})();
