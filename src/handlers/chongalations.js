// Chongalations - Revered quotes from the Chonglers community
const chongalations = [
  {
    quote: "A dollar a pickle is probably a really good pickle",
    author: "Prophet Wemstoid",
    reference: "Chongalations 17:13",
    emoji: "🥒"
  },
  {
    quote: "I like it big.",
    author: "Yuna the Lustful toward Hodir",
    reference: "Chongalations 6:34",
    emoji: "💯"
  },
  {
    quote: "I'm expanding on the cook",
    author: "Chef Poppineddies",
    reference: "Chongalations 19:4",
    emoji: "🧪"
  },
  {
    quote: "I miss Shortnoob.",
    author: "Frosted",
    reference: "A Journal of the Walmart Mage",
    emoji: "😞"
  },
  {
    quote: "When I raid I have fun you break that.",
    author: "Frosted",
    reference: "A Journal of the Walmart Mage",
    emoji: "🧙"
  },
  {
    quote: "I love when people's pets die.",
    author: "Chongla",
    reference: "Book of Revelations, Nov Edition",
    emoji: "💀"
  },
  {
    quote: "Have you ever thought of bubbling?",
    author: "Sourced from Qzq's Book of Questions, Volume III, recorded by Vallance",
    reference: "Chongalations",
    emoji: "💡"
  },
  {
    quote: ".... yea like my girlfriend is level 13.... WAIT",
    author: "Fizzlewig",
    reference: "Fizzlewig's Fucked Up Phrases, pg 13",
    emoji: "😬"
  },
  {
    quote: "I might have room temperature IQ but please, enlighten me...",
    author: "Frosted",
    reference: "Frosted's Compendium of Stolen Phrases, Book 1 page 14",
    emoji: "🦥"
  },
  {
    quote: "She hit my heart but she wasnt hit capped",
    author: "Frosted",
    reference: "Frosted's Love Encyclopedia, Chongalations 5:10",
    emoji: "💔"
  },
  {
    quote: "Oops I accidentally drank my demon-healing elixir...",
    author: "Wemstoid",
    reference: "The Wemstold Saga, Chongalations 04:19",
    emoji: "👹"
  },
  {
    quote: "Gabagoo",
    author: "Fizzlewig",
    reference: "The Forbidden Text of Aprus, Chongulations Infinity",
    emoji: "🍝"
  },
  {
    quote: "Silly-don",
    author: "Vallance",
    reference: "Vallance's Fever Dreams, Chongulations 04:05",
    emoji: "😶‍🌫️"
  },
  {
    quote: "Ay, fun fact for McDonalds- if you just get a McDouble with mac sauce and shredded lettuce, you get a McDouble without the bun in the middle, and it's like - I mean you get a Big Mac, and it's like, twice as like, less expensive.",
    author: "Fizzle",
    reference: "Fizzle's Compendium of Life Hacks, Chongalations 2:24",
    emoji: "🍔"
  },
  {
    quote: "Let's just die Illidan and move on!",
    author: "Frosted",
    reference: "Chongalations 25:12",
    emoji: "⏳"
  },
  {
    quote: "BAMF has a fucking mental handicap",
    author: "Electricgoat",
    reference: "The Electric Illidan Saga, Chongalations 2:17",
    emoji: "♿"
  },
  {
    quote: "Well you know, whenever I feel like doing it, I just bait a pedophile every now and again",
    author: "Fizzle",
    reference: "Where there's a Fizz, there's a Way, Chongalations 12:1",
    emoji: "🎣"
  },
  {
    quote: "Making fun of poor kids is BIS",
    author: "Fizzle",
    reference: "Fizzle's Comtemplations on Socioeconomic Classism, Chongalations 18:3",
    emoji: "💸"
  },
  {
    quote: "Yeah thats sure",
    author: "Vallance",
    reference: "Vallance's Brain Farts, Chongalations 1:18",
    emoji: "💨"
  },
  {
    quote: "I shit my pants.",
    author: "Tankbad",
    reference: "Tankbad and the car ride home, Chongulations 1:87",
    emoji: "💩"
  },
  {
    quote: "friend but I will have to retire because I am not a tank magician",
    author: "Pheebie",
    reference: "The Hirene Story Arc, Chongalations 13:12",
    emoji: "🧙"
  },
  {
    quote: "I am not going to take criticism from someone who cant even click a cube",
    author: "Graperino",
    reference: "International, Chongalations 17:38",
    emoji: "🧊"
  },
  {
    quote: "Please stop telling guidlies that they look breedable",
    author: "Tankbad",
    reference: "Chongalations 09:34",
    emoji: "💋"
  },
  {
    quote: "Guys you aren't doing it right, you need to up down under the water inside the platform but avoid the mobs. Down up sideways, flash heal under the water move northeast accept the quest up top and then under!",
    author: "Grapejelly",
    reference: "Chongalations 06:90 (We killed The Luker That Night)",
    emoji: "🐙"
  },
  {
    quote: "Who was on triangle, come on guys",
    author: "Frosted (the guy on triangle)",
    reference: "The Trials of Magtheridon, Chongalations 6:10",
    emoji: "🔻"
  },
  {
    quote: "Spongler has me blocked??",
    author: "Graperino",
    reference: "Dark times and Bright walls, Chongalations 04:20",
    emoji: "🙅"
  },
  {
    quote: "It's just a fart.",
    author: "Tankbad",
    reference: "Song of Tankbad, Chongalations 2:14",
    emoji: "😓"
  },
  {
    quote: "when she",
    author: "Pheebie",
    reference: "Trials and Pheebielations, Chongalations 01:01",
    emoji: "👩"
  },
  {
    quote: "AND YOU'RE STILL CASTING CHAIN LIGHTNING!",
    author: "Frosted",
    reference: "The book of Frosted, Chongalations 27:13",
    emoji: "⚡"
  }
];

function getRandomChongalation() {
  const randomIndex = Math.floor(Math.random() * chongalations.length);
  return chongalations[randomIndex];
}

function getChongalationByAuthor(authorName) {
  const filtered = chongalations.filter(c => 
    c.author.toLowerCase().includes(authorName.toLowerCase())
  );
  if (filtered.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex];
}

function getAllAuthors() {
  const authors = [...new Set(chongalations.map(c => c.author))];
  return authors.sort();
}

module.exports = {
  chongalations,
  getRandomChongalation,
  getChongalationByAuthor,
  getAllAuthors
};
