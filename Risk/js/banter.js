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
      losing: [
        "Are you guys fucking teaming up on me or what? Absolute bullshit.",
        "I'm getting targeted. This is completely ridiculous.",
        "Down to my last territories and you guys keep hitting me? Assholes.",
        "My dice are rigged. I swear to god this is rigged.",
        "Enjoy your temporary victory, but I'm taking as many of you down with me as I can."
      ],
      allianceInitiate: [
        "Look at [Rival] running away with the map. We need to wipe their borders right now. Who's with me?",
        "We need to gang up on [Rival] immediately or they win. Let's break their continents!"
      ],
      allianceAgree: [
        "Hell yeah, I'm already building forces near [Rival]'s border. Let's smash them.",
        "Agreed. Let's wipe [Rival] off the face of the earth together."
      ],
      allianceDecline: [
        "Alliance? Screw off, I work alone. You're all getting rolled anyway.",
        "Nah, I'd rather conquer you first, then deal with that."
      ],
      saltyElimination: [
        "Unbelievable. [Conqueror] is a total asswipe who ruined my game. Everyone gang up on [Conqueror] right now!",
        "Are you fucking kidding me, [Conqueror]? You absolute backstabbing fuckwit. Go get them, guys, they are running away with the board!"
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
      losing: [
        "Why does everyone attack my fortress? There are other players on this board!",
        "Please stop hitting me, I have literally nothing left.",
        "I'm just trying to survive here. Have some mercy, dude.",
        "Come on, I'm practically harmless now. Go fight someone else.",
        "My defenses are completely ruined. I'm officially cooked."
      ],
      allianceInitiate: [
        "If we don't stop [Rival] immediately, we're all cooked. Can we agree to focus on them?",
        "[Rival] is getting too powerful. I'll defend our flank if you guys attack them."
      ],
      allianceAgree: [
        "Agreed. I'll hold my side of the line, you guys hit [Rival] from the other side.",
        "Good idea. I'll reinforce my borders against [Rival] to box them in."
      ],
      allianceDecline: [
        "I'm not getting involved in your alliance. I'll just secure my own borders.",
        "No alliances for me. I'm staying neutral and safe."
      ],
      saltyElimination: [
        "My fortress is gone. Thanks, [Conqueror], you absolute jerk. Someone please break their front line.",
        "Well, I'm dead. [Conqueror] completely steamrolled me. Please don't let them win this, guys."
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
      losing: [
        "Statistically, this is an absolute nightmare.",
        "Well, my calculations did not account for getting completely destroyed like this.",
        "I need to pivot my strategy... like, how to not die next turn.",
        "Alright, who wants to sign a non-aggression pact? I'm desperate.",
        "My empire is officially bankrupt. Send reinforcements or a drink."
      ],
      allianceInitiate: [
        "According to my calculations, [Rival] has a 90% chance of winning unless we team up. Let's block them.",
        "It is mathematically optimal for us to target [Rival] right now. Who's in?"
      ],
      allianceAgree: [
        "That makes tactical sense. I will attack [Rival]'s weakest borders this turn.",
        "Agreed. Teaming up against [Rival] is the highest-value move right now."
      ],
      allianceDecline: [
        "No thanks, I don't see a favorable cost-benefit ratio in this alliance.",
        "I'll wait and see. Maybe I'll let you two exhaust each other first."
      ],
      saltyElimination: [
        "Tactically, that was a highly vindictive move by [Conqueror]. I highly recommend everyone target their borders immediately.",
        "I'm out. [Conqueror] played dirty. The optimal strategy now is for the rest of you to wipe them out."
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
      losing: [
        "Everything is on fire and I love/hate it!",
        "Well, this is going spectacularly badly! Hahaha!",
        "Time for a suicide charge! Who wants to get exploded with me?",
        "I'm circling the drain! WOOOO! Going down in flames!",
        "If I'm going down, I'm doing it in the most annoying way possible!"
      ],
      allianceInitiate: [
        "Oh look, a giant! Let's all gank [Rival] and steal their toys!",
        "Hey everyone, let's form an angry mob and burn down [Rival]'s empire!"
      ],
      allianceAgree: [
        "Temporary alliance! Yes! I'll attack [Rival] with whatever random units I have!",
        "Yay, teamwork! I promise to help you beat [Rival]... until I change my mind!"
      ],
      allianceDecline: [
        "Alliances are boring! I think I'll just attack everyone equally!",
        "Nope! I'd rather roll dice randomly than join your little club."
      ],
      saltyElimination: [
        "NOOO! My beautiful chaos has ended! [Conqueror], you party pooper! Everyone, gank [Conqueror] and burn their house down!",
        "Haha, I got deleted! But seriously, [Conqueror] is way too strong now, go stomp them!"
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
        const runaway = getRunawayRival(state, p.id);
        if (runaway && Math.random() < 0.5) {
          triggerAllianceProposal(p, runaway);
        } else {
          triggerAIBanter(p, 'turnStart');
        }
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
      const eliminatedPlayer = state.players[info.playerId];
      
      if (conqueror && !conqueror.isHuman) {
        triggerAIBanter(conqueror, 'elimination', 1200);
      }
      
      if (eliminatedPlayer && !eliminatedPlayer.isHuman) {
        setTimeout(() => {
          const personality = eliminatedPlayer.personality || 'aggressive';
          const list = BANTER_TEMPLATES[personality].saltyElimination;
          if (!list || !list.length) return;
          let text = U.pickRandom(list).replace(/\[Conqueror\]/g, conqueror ? conqueror.name : 'them');
          
          const ginLemon = document.getElementById('settings-gin-lemon')?.checked;
          if (ginLemon) {
            text = slurText(text);
          }
          postMessage(eliminatedPlayer.name, eliminatedPlayer.colorHex, text, false);
        }, 2200 + Math.random() * 500);
      }
    });
  }

  function postSystemMessage(text) {
    if (!chatMessagesEl) return;
    const msg = document.createElement('div');
    msg.className = 'chat-msg system';
    msg.innerHTML = `<span class="chat-msg-text">${U.escapeHtml(text)}</span>`;
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
      <span class="chat-msg-sender" style="color: ${isSelf ? 'var(--accent-gold)' : senderColorHex}">${U.escapeHtml(senderName)}</span>
      <span class="chat-msg-text">${U.escapeHtml(text)}</span>
    `;
    chatMessagesEl.appendChild(msg);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
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

  function getRunawayRival(state, currentId) {
    const totalArmies = Object.values(state.territories).reduce((sum, t) => sum + t.armies, 0);
    for (const p of state.players) {
      if (p.eliminated || p.id === currentId) continue;
      const territoriesList = Object.values(state.territories).filter(t => t.owner === p.id);
      const armiesCount = territoriesList.reduce((sum, t) => sum + t.armies, 0);
      if (territoriesList.length >= 16 || (totalArmies > 0 && armiesCount / totalArmies >= 0.40)) {
        return p;
      }
    }
    return null;
  }

  function checkAllianceProposal(playerMessage, state) {
    const msg = playerMessage.toLowerCase();
    const keywords = ['team', 'ally', 'alliance', 'gang up', 'together', 'target', 'focus', 'attack', 'kill', 'stop', 'help'];
    const hasKeyword = keywords.some(kw => msg.includes(kw));
    if (!hasKeyword) return null;
    
    // Check if any active player name is mentioned
    for (const p of state.players) {
      if (p.eliminated) continue;
      if (msg.includes(p.name.toLowerCase())) {
        return p;
      }
    }
    // Default to runaway rival if any
    return getRunawayRival(state, -1);
  }

  function triggerAllianceProposal(ai, runaway) {
    if (!chatMessagesEl || ai.isHuman || ai.eliminated) return;
    setTimeout(() => {
      const personality = ai.personality || 'aggressive';
      const list = BANTER_TEMPLATES[personality].allianceInitiate;
      if (!list || !list.length) return;
      let text = U.pickRandom(list).replace(/\[Rival\]/g, runaway.name);
      
      const ginLemon = document.getElementById('settings-gin-lemon')?.checked;
      if (ginLemon) {
        text = slurText(text);
      }
      postMessage(ai.name, ai.colorHex, text, false);
    }, 800 + Math.random() * 500);
  }

  async function getLLMBanterReply(ai, humanPlayer, playerMessage) {
    const model = document.getElementById('settings-model')?.value || 'openrouter/free';
    const ginLemon = document.getElementById('settings-gin-lemon')?.checked;
    const state = S.get();
    
    const aiTerritoriesList = Object.values(state.territories).filter(t => t.owner === ai.id);
    const aiTerritoriesCount = aiTerritoriesList.length;
    const aiArmiesCount = aiTerritoriesList.reduce((sum, t) => sum + t.armies, 0);
    const isLosing = !ai.eliminated && (aiTerritoriesCount <= 3 || aiArmiesCount < 8);
    
    const aiTerritories = aiTerritoriesList
      .map(t => `${t.name} (${t.armies} armies)`)
      .join(', ');
      
    let drunkPrompt = '';
    if (ginLemon) {
      drunkPrompt = `You have had 3 gin & lemons and are slightly drunk. Slur your words slightly, write with minor typos, and act extra loud, silly, affectionate, or randomly confrontational.`;
    }
    
    let losingPrompt = '';
    if (isLosing) {
      losingPrompt = `NOTICE: You are losing badly (only ${aiTerritoriesCount} territories and ${aiArmiesCount} armies left). You are frustrated, salty, complaining about your situation, and teasing others with desperation or mock anger.`;
    }

    let eliminatedPrompt = '';
    if (ai.eliminated) {
      eliminatedPrompt = `NOTICE: You have been ELIMINATED from the game! You are dead/spectating. You are extremely salty, angry, and bitter about it. You constantly encourage others to gang up on the person who eliminated you (or the runaway leader) and call them names like asswipe or fuckwit.`;
    }

    // Alliance prompt injection
    let alliancePrompt = '';
    const proposedTarget = checkAllianceProposal(playerMessage, state);
    if (proposedTarget) {
      const runaway = getRunawayRival(state, ai.id);
      const isRunaway = runaway && runaway.id === proposedTarget.id;
      if (isRunaway) {
        alliancePrompt = `NOTICE: ${humanPlayer.name} is proposing to team up against ${proposedTarget.name}. Since ${proposedTarget.name} is running away with the game, you should enthusiastically agree to team up against them.`;
      } else {
        alliancePrompt = `NOTICE: ${humanPlayer.name} is proposing to team up against ${proposedTarget.name}. Since ${proposedTarget.name} is not running away with the game, you should decline or redirect.`;
      }
    }
      
    const system = `You are playing Risk, a strategic board game.
You are playing as the AI player "${ai.name}" who has the personality: "${ai.personality || 'aggressive'}".
${eliminatedPrompt}
${losingPrompt}
${drunkPrompt}
${alliancePrompt}
You and the other players are old friends who know each other well. You tease each other, make witty/sarcastic comments, and swear sometimes (e.g. use words like damn, hell, crap, bullshit, dickhead, bastard, dumbass, garbage, idiot, asswipe, fuckwit).
Keep your response extremely short (1 to 2 sentences max) and in character. Do not include any JSON, prefixes, markdown, quote marks, or meta-commentary—just your direct reply in the chat.
Current board context:
- Your territories: ${aiTerritories || 'none (eliminated)'}
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
      // Pick a random non-human player (even if eliminated!)
      const activeAIs = state.players.filter(p => !p.isHuman);
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
      
      if (ai.eliminated) {
        // Use salty elimination replies
        const list = BANTER_TEMPLATES[personality].saltyElimination;
        // Find leader to target
        let leaderName = 'the leader';
        let maxT = -1;
        for (const p of state.players) {
          if (p.eliminated) continue;
          const tc = Object.values(state.territories).filter(t => t.owner === p.id).length;
          if (tc > maxT) {
            maxT = tc;
            leaderName = p.name;
          }
        }
        reply = U.pickRandom(list).replace(/\[Conqueror\]/g, leaderName);
      } else {
        const proposedTarget = checkAllianceProposal(playerMessage, state);
        if (proposedTarget) {
          const runaway = getRunawayRival(state, ai.id);
          const isRunaway = runaway && runaway.id === proposedTarget.id;
          const list = isRunaway 
            ? BANTER_TEMPLATES[personality].allianceAgree 
            : BANTER_TEMPLATES[personality].allianceDecline;
          reply = U.pickRandom(list).replace(/\[Rival\]/g, proposedTarget.name);
        } else {
          const aiTerritoriesList = Object.values(state.territories).filter(t => t.owner === ai.id);
          const isLosing = (aiTerritoriesList.length <= 3 || aiTerritoriesList.reduce((sum, t) => sum + t.armies, 0) < 8);
          
          const list = (isLosing && BANTER_TEMPLATES[personality].losing && Math.random() < 0.7)
            ? BANTER_TEMPLATES[personality].losing
            : BANTER_TEMPLATES[personality].replies;
          reply = U.pickRandom(list);
        }
      }
      
      const ginLemon = document.getElementById('settings-gin-lemon')?.checked;
      if (ginLemon) {
        reply = slurText(reply);
      }
    }

    indicator.remove();
    postMessage(ai.name, ai.colorHex, reply, false);
  }

  function triggerAIBanter(ai, category, delayMs = 500) {
    if (!chatMessagesEl || ai.isHuman || (ai.eliminated && category !== 'elimination')) return;
    
    setTimeout(() => {
      // Random chance to banter to avoid spamming too much
      const chance = (category === 'turnStart' || category === 'elimination') ? 0.7 : 0.45;
      if (Math.random() > chance) return;

      const state = S.get();
      const personality = ai.personality || 'aggressive';
      const aiTerritoriesList = Object.values(state.territories).filter(t => t.owner === ai.id);
      const isLosing = (aiTerritoriesList.length <= 3 || aiTerritoriesList.reduce((sum, t) => sum + t.armies, 0) < 8);

      let list = BANTER_TEMPLATES[personality][category];
      if (isLosing && BANTER_TEMPLATES[personality].losing && Math.random() < 0.7) {
        list = BANTER_TEMPLATES[personality].losing;
      }
      
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
