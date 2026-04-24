const scriptURL = 'https://script.google.com/macros/s/AKfycby4WhfTJuGo8-9vskV23Y661wvQD-OD5L2MTDH87hhnwyxOgoUh3JoS6tCDo7Qndvto/exec';
const politicalStatements = [
  {
    id: 1,
    text: "The government should tax the wealthy more to provide free university for everyone.",
    alignment: "Left",
    category: "Economic"
  },
  {
    id: 2,
    text: "Taxes should be as low as possible so people can decide how to spend their own money.",
    alignment: "Right",
    category: "Economic"
  },
  {
    id: 3,
    text: "The government should strictly regulate businesses to protect the environment, even if it slows down the economy.",
    alignment: "Left",
    category: "Environment"
  },
  {
    id: 4,
    text: "Protecting jobs and the economy is more important than passing strict new environmental laws.",
    alignment: "Right",
    category: "Environment"
  },
  {
    id: 5,
    text: "The government should provide a 'guaranteed basic income' to all citizens so no one lives in poverty.",
    alignment: "Left",
    category: "Social Safety Net"
  },
  {
    id: 6,
    text: "People should be responsible for their own success; if you work hard, you should keep the rewards.",
    alignment: "Right",
    category: "Economic"
  },
  {
    id: 7,
    text: "Public services like transit and electricity should be owned by the government, not private companies.",
    alignment: "Left",
    category: "Public Services"
  },
  {
    id: 8,
    text: "Private companies are usually more efficient than the government at running services.",
    alignment: "Right",
    category: "Public Services"
  },
  {
    id: 9,
    text: "The government should spend more money on social programs (like housing and mental health) than on the military.",
    alignment: "Left",
    category: "Spending"
  },
  {
    id: 10,
    text: "A strong military and police force are the most important ways for a government to stay safe and stable.",
    alignment: "Right",
    category: "Spending"
  },
  {
    id: 11,
    text: "Canada should welcome more immigrants to help grow our culture and economy.",
    alignment: "Left",
    category: "Social"
  },
  {
    id: 12,
    text: "The government should limit immigration to protect the jobs and traditions of people already living here.",
    alignment: "Right",
    category: "Social"
  },
  {
    id: 13,
    text: "We should focus on rehabilitation (help and therapy) for people who break the law.",
    alignment: "Left",
    category: "Justice"
  },
  {
    id: 14,
    text: "Prison sentences should be tougher to discourage people from committing crimes.",
    alignment: "Right",
    category: "Justice"
  },
  {
    id: 15,
    text: "Healthcare should be 100% public; no one should be able to pay to skip the line.",
    alignment: "Left",
    category: "Healthcare"
  },
  {
    id: 16,
    text: "If people want to pay for private healthcare to get faster service, they should be allowed to.",
    alignment: "Right",
    category: "Healthcare"
  },
  {
    id: 17,
    text: "The minimum wage should be significantly increased to ensure everyone can afford to live.",
    alignment: "Left",
    category: "Economic"
  },
  {
    id: 18,
    text: "If the minimum wage is too high, businesses will struggle and might have to fire workers.",
    alignment: "Right",
    category: "Economic"
  },
  {
    id: 19,
    text: "The government should pass laws to make sure large corporations pay their fair share of taxes.",
    alignment: "Left",
    category: "Economic"
  },
  {
    id: 20,
    text: "Lowering taxes on corporations encourages them to invest more and create more jobs.",
    alignment: "Right",
    category: "Economic"
  },
  {
    id: 21,
    text: "The provincial government should invest more in protecting Nova Scotia's coastline from sea level rise, even if it means higher taxes.",
    alignment: "Left",
    category: "Environment"
  },
  {
    id: 22,
    text: "Nova Scotia should prioritize attracting new residents from other provinces to help grow our economy and fill labour shortages.",
    alignment: "Left",
    category: "Social"
  },
  {
    id: 23,
    text: "The government should reduce regulations on small businesses in Nova Scotia to help them compete and grow.",
    alignment: "Right",
    category: "Economic"
  },
  {
    id: 24,
    text: "Public transit should be made free for all students in Nova Scotia to encourage its use and reduce traffic.",
    alignment: "Left",
    category: "Transportation"
  },
  {
    id: 25,
    text: "Nova Scotia should focus on developing our offshore oil and gas resources to create jobs and generate revenue.",
    alignment: "Right",
    category: "Energy"
  },
  {
    id: 26,
    text: "The government should spend more on building affordable housing in Halifax and other Nova Scotia cities.",
    alignment: "Left",
    category: "Housing"
  },
  {
    id: 27,
    text: "Nova Scotia's fishing industry should be protected with stricter regulations, even if it limits some commercial activities.",
    alignment: "Left",
    category: "Fishing"
  },
  {
    id: 28,
    text: "Taxes on alcohol and tobacco should be increased in Nova Scotia to discourage use and fund healthcare.",
    alignment: "Left",
    category: "Healthcare"
  },
  {
    id: 29,
    text: "The provincial government should reduce spending on political advertising and focus on core services.",
    alignment: "Right",
    category: "Spending"
  },
  {
    id: 30,
    text: "Nova Scotia should invest more in preserving our Mi'kmaq heritage and supporting reconciliation efforts.",
    alignment: "Left",
    category: "Reconciliation"
  }
];

const platformIssues = [
  "Healthcare",
  "Education",
  "Environment",
  "Lowering/Raising Voting Age",
  "Halifax Local Issue",
  "Cost of Living/Inflation",
  "Foreign Policy",
  "Inequality/Reconciliation",
  "Nova Scotia Coastline Protection",
  "Offshore Oil and Gas",
  "Affordable Housing",
  "Public Transit",
  "Fishing Industry",
  "Mi'kmaq Reconciliation"
];
