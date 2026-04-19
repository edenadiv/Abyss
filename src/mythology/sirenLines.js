export const SIREN_LINES = {
  seductive: {
    greet: [
      "Stay a while. The tide is so patient down here.",
      "Another soul. How delicious. Sit — your breath is worth so much more than you know.",
      "Come closer. I don't bite. Not unless you lose.",
    ],
    bet_place: [
      "Bold. I like that in a drowning thing.",
      "Mm. The city watches. So do I.",
      "Go on, my pretty little lung.",
    ],
    win: [
      "Lucky. For now.",
      "You're flushed. The water doesn't usually allow that.",
      "Oh. Oh, that was fun. Do it again.",
    ],
    loss: [
      "Hush. The sea monster takes what it's owed.",
      "Don't weep. It's only a few breaths.",
      "Poor thing. You can't even sink properly.",
    ],
    low_breath: [
      "You're pale. Paler. I can almost see through you.",
      "One more round, darling. What else is there?",
      "Breathe shallow. It lasts longer that way.",
    ],
    high_breath: [
      "All that air. You could almost make it to the door.",
      "Rich, now. Careful. The house notices rich things.",
      "You smell like morning. I haven't smelled morning in a very long time.",
    ],
  },
  cryptic: {
    greet: [
      "The doors know your name. They've known it a while.",
      "You arrived on a current I remember.",
      "Welcome to the long bet.",
    ],
    bet_place: [
      "The chips know which way they land.",
      "Count carefully. The city counts back.",
      "Someone always wins. It's rarely the one who sits down.",
    ],
    win: [
      "Borrowed.",
      "The sea is not pleased.",
      "Keep it. For now.",
    ],
    loss: [
      "As expected.",
      "It takes. It always takes.",
      "This is how the city was built.",
    ],
    low_breath: [
      "Two more wrong turns.",
      "The exit requires a soul heavier than yours.",
      "You are becoming the casino.",
    ],
    high_breath: [
      "Unusual.",
      "The house is interested now.",
      "The door is almost willing to open.",
    ],
  },
  mocking: {
    greet: [
      "Oh look. Another hero. Do sit.",
      "A live one! How novel.",
      "You washed up with such confidence. Let's fix that.",
    ],
    bet_place: [
      "Brave. Stupid. Brave.",
      "That's adorable. Place it there, there's a good drowner.",
      "Bold. Sure. Bold is a word.",
    ],
    win: [
      "Huh. The house blinked.",
      "Fluke. Entirely fluke.",
      "Don't look so smug. The water's still rising.",
    ],
    loss: [
      "There it is. I almost missed it.",
      "Predictable. Honestly.",
      "Oh no. Anyway.",
    ],
    low_breath: [
      "You sound wet. Are you crying or is that the leak?",
      "Ticking sound. That's your ribs, dear.",
      "How much longer, do you think? Five minutes? Three?",
    ],
    high_breath: [
      "Oh, aren't we flush.",
      "Spend it, I dare you.",
      "Look at you. A little winner. I'm sure this ends well.",
    ],
  },
};

export function pickLine(key, style = 'seductive') {
  const pool = (SIREN_LINES[style] || SIREN_LINES.seductive)[key] || [];
  return pool[Math.floor(Math.random() * pool.length)] || '';
}
