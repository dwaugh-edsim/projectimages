// config.js — Risk board data: 42 territories, 6 continents, adjacencies, colors
// All data is static and read-only at runtime.

window.RISK_CONFIG = (function () {
  // 6 player colors (curated, distinct on parchment + dark themes)
  const PLAYER_COLORS = [
    { name: 'Crimson',  hex: '#dc2626' },
    { name: 'Royal',    hex: '#2563eb' },
    { name: 'Emerald',  hex: '#059669' },
    { name: 'Amber',    hex: '#d97706' },
    { name: 'Violet',   hex: '#7c3aed' },
    { name: 'Teal',     hex: '#0891b2' },
  ];

  // Continent definitions (id, name, bonus, territory list)
  const CONTINENTS = {
    northAmerica: { id: 'northAmerica', name: 'North America', bonus: 5, color: '#e5c185' }, // desaturated gold
    southAmerica: { id: 'southAmerica', name: 'South America', bonus: 2, color: '#d98282' }, // soft terracotta
    europe:       { id: 'europe',       name: 'Europe',        bonus: 5, color: '#8ca6c2' }, // slate blue
    africa:       { id: 'africa',       name: 'Africa',        bonus: 3, color: '#bda280' }, // ochre sand
    asia:         { id: 'asia',         name: 'Asia',          bonus: 7, color: '#9bbfa1' }, // sage green
    australia:    { id: 'australia',    name: 'Australia',     bonus: 2, color: '#c9afc9' }, // dusty lavender
  };

  // 42 territories. Adjacency lists reference territory ids.
  // cx/cy are SVG coordinates (1000x700 viewBox) where the army badge centers.
  const TERRITORIES = {
    // ===== North America (9) =====
    alaska:        { id:'alaska',        name:'Alaska',        continent:'northAmerica', cx:120,  cy:170, cardType:'infantry' },
    northwest:     { id:'northwest',     name:'Northwest Terr.', continent:'northAmerica', cx:230, cy:140, cardType:'cavalry' },
    greenland:     { id:'greenland',     name:'Greenland',     continent:'northAmerica', cx:430, cy:90,  cardType:'artillery' },
    alberta:       { id:'alberta',       name:'Alberta',       continent:'northAmerica', cx:230, cy:215, cardType:'cavalry' },
    ontario:       { id:'ontario',       name:'Ontario',       continent:'northAmerica', cx:310, cy:225, cardType:'artillery' },
    quebec:        { id:'quebec',        name:'Quebec',        continent:'northAmerica', cx:380, cy:215, cardType:'infantry' },
    western_us:    { id:'western_us',    name:'Western US',    continent:'northAmerica', cx:235, cy:300, cardType:'infantry' },
    eastern_us:    { id:'eastern_us',    name:'Eastern US',    continent:'northAmerica', cx:310, cy:320, cardType:'cavalry' },
    central_america: { id:'central_america', name:'Central America', continent:'northAmerica', cx:265, cy:390, cardType:'artillery' },

    // ===== South America (4) =====
    venezuela:     { id:'venezuela',     name:'Venezuela',     continent:'southAmerica', cx:370, cy:430, cardType:'infantry' },
    brazil:        { id:'brazil',        name:'Brazil',        continent:'southAmerica', cx:410, cy:510, cardType:'cavalry' },
    peru:          { id:'peru',          name:'Peru',          continent:'southAmerica', cx:360, cy:540, cardType:'artillery' },
    argentina:     { id:'argentina',     name:'Argentina',     continent:'southAmerica', cx:370, cy:625, cardType:'infantry' },

    // ===== Europe (7) =====
    iceland:       { id:'iceland',       name:'Iceland',       continent:'europe', cx:500, cy:140, cardType:'cavalry' },
    scandinavia:   { id:'scandinavia',   name:'Scandinavia',   continent:'europe', cx:580, cy:155, cardType:'infantry' },
    ukraine:       { id:'ukraine',       name:'Ukraine',       continent:'europe', cx:680, cy:185, cardType:'artillery' },
    great_britain: { id:'great_britain', name:'Great Britain', continent:'europe', cx:530, cy:220, cardType:'cavalry' },
    northern_europe: { id:'northern_europe', name:'Northern Europe', continent:'europe', cx:580, cy:220, cardType:'infantry' },
    western_europe: { id:'western_europe', name:'Western Europe', continent:'europe', cx:540, cy:285, cardType:'artillery' },
    southern_europe: { id:'southern_europe', name:'Southern Europe', continent:'europe', cx:615, cy:280, cardType:'cavalry' },

    // ===== Africa (6) =====
    north_africa:  { id:'north_africa',  name:'North Africa',  continent:'africa', cx:560, cy:380, cardType:'infantry' },
    egypt:         { id:'egypt',         name:'Egypt',         continent:'africa', cx:635, cy:370, cardType:'cavalry' },
    east_africa:   { id:'east_africa',   name:'East Africa',   continent:'africa', cx:695, cy:445, cardType:'artillery' },
    congo:         { id:'congo',         name:'Congo',         continent:'africa', cx:625, cy:475, cardType:'infantry' },
    south_africa:  { id:'south_africa',  name:'South Africa',  continent:'africa', cx:650, cy:570, cardType:'cavalry' },
    madagascar:    { id:'madagascar',    name:'Madagascar',    continent:'africa', cx:740, cy:575, cardType:'artillery' },

    // ===== Asia (12) =====
    ural:          { id:'ural',          name:'Ural',          continent:'asia', cx:760, cy:175, cardType:'infantry' },
    siberia:       { id:'siberia',       name:'Siberia',       continent:'asia', cx:830, cy:140, cardType:'cavalry' },
    yakutsk:       { id:'yakutsk',       name:'Yakutsk',       continent:'asia', cx:890, cy:120, cardType:'artillery' },
    kamchatka:     { id:'kamchatka',     name:'Kamchatka',     continent:'asia', cx:935, cy:155, cardType:'infantry' },
    irkutsk:       { id:'irkutsk',       name:'Irkutsk',       continent:'asia', cx:860, cy:200, cardType:'cavalry' },
    afghanistan:   { id:'afghanistan',   name:'Afghanistan',   continent:'asia', cx:755, cy:240, cardType:'artillery' },
    middle_east:   { id:'middle_east',   name:'Middle East',   continent:'asia', cx:700, cy:295, cardType:'infantry' },
    india:         { id:'india',         name:'India',         continent:'asia', cx:790, cy:320, cardType:'cavalry' },
    siam:          { id:'siam',          name:'Siam',          continent:'asia', cx:830, cy:350, cardType:'artillery' },
    china:         { id:'china',         name:'China',         continent:'asia', cx:855, cy:265, cardType:'infantry' },
    mongolia:      { id:'mongolia',      name:'Mongolia',      continent:'asia', cx:855, cy:215, cardType:'cavalry' },
    japan:         { id:'japan',         name:'Japan',         continent:'asia', cx:920, cy:250, cardType:'artillery' },

    // ===== Australia (4) =====
    indonesia:     { id:'indonesia',     name:'Indonesia',     continent:'australia', cx:840, cy:430, cardType:'infantry' },
    new_guinea:    { id:'new_guinea',    name:'New Guinea',    continent:'australia', cx:910, cy:415, cardType:'cavalry' },
    western_australia: { id:'western_australia', name:'Western Australia', continent:'australia', cx:855, cy:510, cardType:'artillery' },
    eastern_australia: { id:'eastern_australia', name:'Eastern Australia', continent:'australia', cx:915, cy:500, cardType:'infantry' },
  };

  // Adjacency graph. Each territory lists neighbors.
  // Includes all standard Risk bridges (Alaska<->Kamchatka, etc.)
  const ADJ = {
    // North America
    alaska:          ['northwest','alberta','kamchatka'],
    northwest:       ['alaska','alberta','ontario','greenland'],
    greenland:       ['northwest','ontario','quebec','iceland'],
    alberta:         ['alaska','northwest','ontario','western_us'],
    ontario:         ['alberta','northwest','greenland','quebec','eastern_us','western_us'],
    quebec:          ['ontario','greenland','eastern_us'],
    western_us:      ['alberta','ontario','eastern_us','central_america'],
    eastern_us:      ['ontario','quebec','western_us','central_america'],
    central_america: ['western_us','eastern_us','venezuela'],

    // South America
    venezuela:       ['central_america','brazil','peru'],
    brazil:          ['venezuela','peru','argentina','north_africa'],
    peru:            ['venezuela','brazil','argentina'],
    argentina:       ['peru','brazil'],

    // Europe
    iceland:         ['greenland','great_britain','scandinavia'],
    scandinavia:     ['iceland','ukraine','northern_europe','great_britain'],
    ukraine:         ['scandinavia','northern_europe','southern_europe','ural','afghanistan','middle_east'],
    great_britain:   ['iceland','scandinavia','northern_europe','western_europe'],
    northern_europe: ['great_britain','scandinavia','ukraine','southern_europe','western_europe'],
    western_europe:  ['great_britain','northern_europe','southern_europe','north_africa'],
    southern_europe: ['western_europe','northern_europe','ukraine','middle_east','egypt','north_africa'],

    // Africa
    north_africa:    ['brazil','western_europe','southern_europe','egypt','congo','east_africa'],
    egypt:           ['southern_europe','north_africa','east_africa','middle_east'],
    east_africa:     ['egypt','north_africa','congo','south_africa','madagascar','middle_east'],
    congo:           ['north_africa','east_africa','south_africa'],
    south_africa:    ['congo','east_africa','madagascar'],
    madagascar:      ['east_africa','south_africa'],

    // Asia
    ural:            ['ukraine','afghanistan','siberia','china'],
    siberia:         ['ural','yakutsk','irkutsk','mongolia','china'],
    yakutsk:         ['siberia','kamchatka','irkutsk'],
    kamchatka:       ['yakutsk','irkutsk','alaska','japan','mongolia'],
    irkutsk:         ['siberia','yakutsk','kamchatka','mongolia','china'],
    afghanistan:     ['ukraine','ural','middle_east','india','china'],
    middle_east:     ['ukraine','southern_europe','egypt','east_africa','afghanistan','india'],
    india:           ['middle_east','afghanistan','china','siam'],
    siam:            ['india','china','indonesia'],
    china:           ['ural','siberia','mongolia','afghanistan','india','siam','irkutsk'],
    mongolia:        ['siberia','irkutsk','kamchatka','china','japan'],
    japan:           ['kamchatka','mongolia'],

    // Australia
    indonesia:       ['siam','new_guinea','western_australia'],
    new_guinea:      ['indonesia','eastern_australia','western_australia'],
    western_australia: ['indonesia','new_guinea','eastern_australia'],
    eastern_australia: ['new_guinea','western_australia'],
  };

  // Assign adjacency back into territory objects.
  for (const id in TERRITORIES) {
    TERRITORIES[id].adjacency = ADJ[id] || [];
  }

  // Populate territoryList for each continent
  for (const contId in CONTINENTS) {
    CONTINENTS[contId].territoryList = [];
  }
  for (const terrId in TERRITORIES) {
    const terr = TERRITORIES[terrId];
    if (CONTINENTS[terr.continent]) {
      CONTINENTS[terr.continent].territoryList.push(terrId);
    }
  }

  // Starting armies per player count
  const STARTING_ARMIES = { 2: 40, 3: 35, 4: 30, 5: 25, 6: 20 };

  // Card trade-in escalation
  const CARD_TRADE_VALUES = [4, 6, 8, 10, 12, 15]; // +5 each subsequent set

  // Card types & counts
  const CARD_TYPES = ['infantry', 'cavalry', 'artillery', 'wild'];

  // 44 cards: 14 infantry, 14 cavalry, 14 artillery, 2 wilds
  // Each non-wild card is tied to a territory
  function buildCardDeck() {
    const deck = [];
    const types = ['infantry', 'cavalry', 'artillery'];
    for (const t of types) {
      const territoriesOfType = Object.values(TERRITORIES).filter(ter => ter.cardType === t);
      for (const ter of territoriesOfType) {
        deck.push({ id: ter.id, type: t, territoryId: ter.id });
      }
    }
    deck.push({ id: 'wild1', type: 'wild', territoryId: null });
    deck.push({ id: 'wild2', type: 'wild', territoryId: null });
    return deck;
  }

  // AI personalities
  const PERSONALITIES = ['aggressive', 'defensive', 'opportunistic', 'chaotic'];

  // Model options for the setup dropdown
  const MODEL_OPTIONS = [
    { id: 'openrouter/free',                  label: 'openrouter/free (auto-routed free model)' },
    { id: 'inclusionai/ling-2.6-flash',       label: 'inclusionai/ling-2.6-flash' },
    { id: 'deepseek/deepseek-v4-flash',       label: 'deepseek/deepseek-v4-flash' },
  ];

  // Phases
  const PHASES = {
    CLAIM: 'claim',                 // picking unowned territory at game start
    PLACE_INITIAL: 'placeInitial',  // placing initial armies on owned territories
    REINFORCE: 'reinforce',
    ATTACK: 'attack',
    FORTIFY: 'fortify',
    GAME_OVER: 'gameOver',
  };

  return {
    PLAYER_COLORS,
    CONTINENTS,
    TERRITORIES,
    ADJ,
    STARTING_ARMIES,
    CARD_TRADE_VALUES,
    CARD_TYPES,
    PERSONALITIES,
    MODEL_OPTIONS,
    PHASES,
    buildCardDeck,
    territoryList: () => Object.values(TERRITORIES),
    territoryCount: () => Object.keys(TERRITORIES).length,
    getTerritory: (id) => TERRITORY_LOOKUP[id] || null,
  };

  const TERRITORY_LOOKUP = TERRITORIES;
})();
