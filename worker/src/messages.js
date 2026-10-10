// The kidnapper ("The Raccoon") and his notes.
// Vars: {name} {species} {left} {steps} {goal} {day} {need} {togo} {dead} {how} {re}
const pick = a => a[Math.floor(Math.random() * a.length)];
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
export const NUDGES = {
  12: ['{name} says hi. {name} is fine. For now. {left} steps to go.',
       'Lunch break? Walk it. {left} steps or {name} meets my "toolbox".',
       'Noon check-in: {steps} steps. Day {day} of {need} for {name}. I have seen snails do better.'],
  15: ['Tick tock. {steps}/{goal}. I just bought an anvil. Unrelated.',
       '{left} steps to go. {name} keeps giving me the big eyes. Walk.',
       'Afternoon slump? {name} has no slump. {name} has hope. Do not waste it.'],
  18: ['Dinner time. {left} steps. My catapult needs a test pilot.',
       'Still {left} short. Day {day} of {need}. Miss it and {name} goes POP.',
       '{steps} steps. Cute. I am oiling the catapult.'],
  21: ['LAST CALL. {left} steps by midnight or the {species} gets it.',
       'Three hours. {left} steps. {name} is being so brave. Do not make it pointless.',
       'Walk now. Pace the hallway. Pace the kitchen. {left} steps. MOVE.'],
};
export const PAID = ['10,000. Fine. FINE. Day {day} of {need} banked for {name}.',
  'Ransom received. {name} lives. Day {day} of {need}.',
  'You paid. {name} did a happy wiggle. Cute. Annoying. Day {day} of {need}.'];
export const PAID_LAST = ['That is day {need} of {need}. At midnight {name} walks free. I hate this.',
  'Final payment received. {name} is packing a tiny suitcase. Rescue at midnight.'];
export const MET = ['Yesterday paid in full. {name}: day {streak} of {need} done. {togo} to go.',
  'Payment confirmed. {name} is bouncing off the walls. {togo} more days.'];
export const RESCUED = ['FINE. {dead} is free and on your shelf. But I have acquired {name}. {need} days this time.',
  'You rescued {dead}. Congratulations. Meet my new guest, {name}. Ransom: {need} days in a row.'];
export const DIED = ['You missed a day. {dead} {how}. Very sad. Very cartoon. I have taken {re} back off your shelf.',
  '{dead} {how}. Tragic. Anyway, {re} is back in my cage. {need} days, same as before.'];
export const DIED_SAME = ['You missed a day. {dead} {how}. Good news: I stitched him back together. Day 1 of {need}. Again.',
  '{dead} {how}. I put the pieces back. Mostly the right way round. Start over: {need} days.'];
export const TEST = ['This is a test. {name} is fine. {name} is always fine. Until they are not.',
  'Testing, testing. The Raccoon can reach your phone now. Sleep well.'];

export function note(kind, vars, slot) {
  const set = kind === 'nudge' ? NUDGES[slot] : { paid: PAID, paidLast: PAID_LAST, met: MET, rescued: RESCUED, died: DIED, diedSame: DIED_SAME, test: TEST }[kind];
  return fill(pick(set), vars);
}

// ---- twice-daily nudges (v0.3.3): the hostage pleading, or The Raccoon taunting ----
// Vars: {name} {animal} {left} {steps} {dish} {item} {day} {need}
export const DISH = { bunny: 'bunny soup', hamster: 'hamster kebab', squirrel: 'squirrel pot pie', hedgehog: 'hedgehog crisps', kitten: 'kitten casserole', duckling: "duck à l'orange", piglet: 'bacon', panda: 'panda dumplings' };
export const ITEM = { bunny: 'a hat', hamster: 'a keychain', squirrel: 'a scarf', hedgehog: 'a hairbrush', kitten: 'a pair of mittens', duckling: 'a pillow', piglet: 'a football', panda: 'a rug' };
export const PET_EMOJI = { bunny: '🐰', hamster: '🐹', squirrel: '🐿️', hedgehog: '🦔', kitten: '🐱', duckling: '🐥', piglet: '🐷', panda: '🐼' };
export const PLEAD = {
  afternoon: [
    '{name} here... I can hear the raccoon sharpening something. {left} more steps, please?',
    "Hi, it's {name}. Just checking in. Not panicking. {left} steps would really help me not panic.",
    "{name} again. He measured me for a pot this morning. {left} steps? For me?",
    "It's {name}! You're at {steps}. That's a great start! Please don't stop at the start.",
    "This is {name}. The raccoon keeps saying 'yum'. {left} more steps and he has to stop.",
    "{name} here. I believe in you! {left} steps! (I have to believe in you. I'm in a cage.)",
    "Psst. It's {name}. Lunch walk? {left} steps and I don't become {item}.",
    "{name} the {animal} reporting: still alive! {left} steps would keep it that way.",
    "Hi! {name}! Day {day} of {need}! Only {left} steps between me and not being {dish}!",
    "It's {name}. I'm doing little laps in my cage to motivate you. Your turn. {left} steps.",
  ],
  evening: [
    "{name} here... it's getting late and he's chopping carrots. {left} more steps, please?",
    "It's {name}. He's reading a recipe out loud. It's called {dish}. {left} steps. PLEASE.",
    "{name} again. I don't want to be {item}. I want to be your {animal}. {left} steps!",
    "This is {name}. Evening walk? Kitchen laps? Anything? {left} to go.",
    "{name} here. The pot is out. The POT IS OUT. {left} steps!!",
    "It's {name}. If you walk {left} more steps I'll do the happiest little dance. Promise.",
    "{name} the {animal}, begging politely: {left} steps before midnight. Pretty please with a carrot on top.",
    "Hi, {name}. Day {day} of {need}. I really, really like being alive. {left} more steps?",
    "{name} here. Don't sit down. Whatever you're doing, do it standing up and walking. {left} steps.",
    "It's {name}. I wrote you a song. It goes: walk, walk, walk, {left} steps, walk.",
  ],
};
export const TAUNT = {
  afternoon: [
    "{steps} steps? Cute. I've already picked out a pot for {name}.",
    'Tick tock, couch potato. {left} steps to go and I\'m betting you won\'t.',
    "Lovely afternoon for {dish}. Don't you think?",
    "{left} steps. LOL. I'm sharpening the good knife.",
    "{name} keeps asking if you'll make it. I keep laughing.",
    "Sit down. Relax. Have a snack. {name} certainly won't.",
    "Nobody walks {left} more steps today. Nobody. Prove me wrong. You can't.",
    'Is {steps} a step count or a typo?',
    "I've invited friends over for {dish}. {left} steps or they're not leaving hungry.",
    "Your couch misses you. Go back to it. I'll take care of {name}. Heh.",
  ],
  evening: [
    "Evening! The water's boiling. {left} steps, or {name} goes in.",
    "{left} steps by midnight? From you? I'm already setting the table.",
    'Bon appétit to me. {name} becomes {dish} at midnight unless you walk {left} steps.',
    "I can smell the {dish} already. Oh wait, that's just {name}'s fear.",
    "Last call, legs. {left} steps. You won't. You never do.",
    "{name} is being brave. You're being horizontal. {left} steps.",
    "Put your shoes on. Actually don't. I'm hungry.",
    "I'm warming up the catapult. {left} steps if you want to stop me.",
    'Day {day} of {need}? More like day {day} of NEVER. {left} steps.',
    "I've got the salt. I've got the pepper. I've got {name}. You've got {left} steps to go.",
  ],
};
export function nudgeText(voice, slot, v) {
  const set = (voice === 'pet' ? PLEAD : TAUNT)[slot];
  return fill(pick(set), v);
}
