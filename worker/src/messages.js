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
// v0.4.0: more nudges, plus per-animal ones mixed into both slots.
for (const slot of ['afternoon', 'evening']) { PLEAD[slot].push(...{"afternoon": ["{name} here. Quick question: are you walking right now? You should be. {left} to go.", "It's {name}. The raccoon is humming while he chops. {left} steps, please!", "{name} reporting from the cage: {steps} so far! Keep going!", "Hi, {name} again. He asked how I feel about gravy. {left} steps?", "{name} here. Afternoon stroll? For a cute {animal}? {left} steps!", "It's {name}! I made you a step chart with my paws. You need {left} more!", "{name} here. He's sniffing me. Why is he sniffing me. {left} steps!", "Psst, {name} here. Coffee walk? Water walk? Any walk? {left} to go.", "It's {name}. I'm practicing being brave. You practice walking. {left} steps.", "{name} here. He stuck a note on my cage that says 'dinner?'. {left} steps!", "Hi! {name}! Take your next call standing up and pacing. {left} steps!", "{name} again. He's testing knives on a tomato. {left} steps, quick!", "It's {name}. Day {day} of {need}. I'd love to see day {need}. {left} steps.", "{name} here. Not to be dramatic, but I'm a {animal} and he owns a pot.", "It's {name}! Halfway is a great place to not stop. {left} more!", "{name} here. He held a casserole dish up next to me. Like he was checking. {left} steps!", "Hi, it's {name}. Every step you take, he sighs. Make him sigh {left} times.", "{name} here, sending tiny brave vibes. Walk {left} steps with them.", "It's {name}. The raccoon is on his lunch break. Use it. {left} steps!", "{name} here. Paw push-ups for moral support! {left} steps, go!"], "evening": ["{name} here. The kitchen light just came on. {left} steps, please hurry!", "It's {name}. He's pre-heating. I can feel it from here. {left} steps!", "{name} again. Doing dishes? Pace between plates. {left} steps.", "Hi, it's {name}. He tied on a bib. A BIB. {left} steps!", "{name} here. The show can wait. I can't. {left} steps.", "It's {name}. A walk around the block is like {left} hugs for me.", "{name} here. Midnight is a deadline. A DEAD line. {left} steps.", "It's {name}. He keeps saying 'just a little longer'. {left} steps!", "{name} the {animal} here. Pajamas on? Pace in them! {left} to go.", "It's {name}. You've got {steps}. So close! Just {left} more!", "{name} here. He's sharpening and whistling. Bad combo. {left} steps.", "It's {name}. I don't want to be a cautionary tale. {left} steps, please.", "{name} here. Walk the hallway like it's a red carpet. {left} more!", "It's {name}. I've been brave all day. Your turn. {left} steps.", "{name} here. He just looked up '{dish} cooking time'. {left} steps!", "Hi, it's {name}. Day {day} of {need}. Don't let tonight be the night. {left} steps.", "{name} here. Brushing your teeth? Walk while you brush. {left} to go!", "It's {name}. Get {left} more steps and I'll do zoomies in your honor.", "{name} again. The raccoon said 'soon'. Please make soon never. {left} steps.", "It's {name}. Before bed: {left} steps. After bed: me, alive. Deal?"]}[slot]); TAUNT[slot].push(...{"afternoon": ["{steps} steps. I'm not worried. I'm shopping for garnish.", "Afternoon update: {name} is marinating. Emotionally, for now.", "{left} steps to go? I'll dust off the roasting pan.", "Take a nap. You deserve it. I deserve {dish}.", "Breaking news: local human sits. Local raccoon thrilled.", "Priced out butter today. For {name}. {left} steps, if you care.", "Your step count looks like my bank account. Sad.", "{left} steps. Ha. Garden gnomes move more than you.", "I'm writing a cookbook. Chapter one: {name}.", "The afternoon slump is my favorite season.", "Lunch was good. Dinner will be better. Right, {name}?", "Don't walk. Walking is for people with places to be. Like my grocery store.", "{steps}? That's barely an appetizer.", "Timer's set for midnight. It goes 'ding'. Then 'yum'.", "{name} asked for a blanket. I gave them a tortilla.", "Bet you can't do {left} steps. Loser buys {dish}. Oh wait, I've got it.", "Stay put. The couch is load-bearing. It needs you.", "Practicing my plating. {name} looks great on a plate.", "Legs are a suggestion. Ignore them. I'll handle {name}.", "Day {day} of {need}? Bold. Very bold. Pass the pepper."], "evening": ["Good evening. Pot's on. Lid's off. {left} steps.", "{left} steps before midnight? I'm already tucking in my napkin.", "Stay on the couch. I'll narrate {name}'s last dinner.", "Tonight's special: {dish}. Served at 12:01.", "Your legs went to bed early. Smart legs.", "{steps} steps. I'll carve that on {name}'s little tombstone.", "Tick. Tock. Sizzle.", "Lighting candles. Romantic dinner for one. With {name}.", "Stay home. Get cozy. I'll get cooking.", "Shoes off? Good. Shoes are for people who save their pets.", "{left} steps at this hour? You? I've seen you.", "The catapult's wound. The anvil's hoisted. The pot's hot. Pick one, {name}.", "Midnight's coming, and so is dessert. {name}-flavored.", "Sit back. Relax. Let the raccoon handle dinner.", "I said goodbye to {name}. Very touching. I cried. Then I laughed.", "Your bed's warm. My oven's warmer. {left} steps.", "Big night. I bought the fancy salt.", "{left} more? Cute. I'll run the dishwasher early.", "Go to sleep. Dream of steps. I'll dream of {dish}.", "Last chance, legs. Oh, legs aren't listening. Great."]}[slot]); }
export const PLEAD_SP = {"bunny": ["{name} here. My nose is wiggling at emergency speed. {left} steps!", "It's {name}. He keeps dangling a carrot near the pot. Not falling for it. Walk {left}!", "It's {name}. My ears are flat. That's bunny for terrified. {left} steps!", "It's {name}. Bunnies belong in meadows, not stews. {left} steps please!"], "hamster": ["{name} here. I'm pacing my cage in tiny circles. You pace too! {left} steps!", "It's {name}. I hid seeds in my cheeks for you. Walk {left} steps and they're yours.", "It's {name}. He called me 'snack size'. {left} steps!", "It's {name}. He's eyeing my cheeks like they're dumplings. {left} to go!"], "squirrel": ["{name} here. My tail is puffed to max. That's squirrel for PLEASE. {left} steps!", "It's {name}. I've been flicking my tail at you for hours. {left} steps!", "{name} here. Storing up courage for winter. It's running out. {left} steps!", "It's {name}. He's rolling out pie dough. I'm not pie. {left} steps!"], "hedgehog": ["{name} here, snuffling nervously. {left} steps please!", "It's {name}. I'm spiky, not snack-y! {left} steps!", "It's {name}. Hedgehogs need walks too. Take me in spirit. {left} steps!", "It's {name}. He's shopping for chip seasoning. {left} steps!"], "kitten": ["{name} here, kneading the cage floor. Nervous kneading. {left} steps!", "It's {name}. I'd chase a laser for you. Chase {left} steps for me!", "{name} here. My tail is a bottle brush. Walk {left} steps!", "{name} here. Mew. Mew. That's {left} steps in kitten."], "duckling": ["{name} here. I imprinted on you. You're my mom now. Moms walk {left} steps!", "It's {name}. My fluff is shaking. {left} steps please!", "{name} here, about to have my first swim. In a pot. HELP. {left} steps!", "It's {name}. Tiny webbed feet, huge hopes. {left} steps!"], "piglet": ["{name} here. Squeal! That was a scared squeal. {left} steps!", "It's {name}. I'd rather roll in mud than breadcrumbs. {left} steps!", "{name} here. He's reading pancake recipes. Why pancakes. {left} steps!", "It's {name}. Pigs are smart. Smart enough to beg. {left} steps please!"], "panda": ["{name} here. I'd give you my bamboo. All of it. Walk {left} steps!", "It's {name}. My eye patches are hiding very scared eyes. {left} steps!", "{name} here. He keeps pinching my cheeks. Like testing dough. {left} steps!", "It's {name}. Pandas sleep a lot. You can't. {left} steps first!"]};
export const TAUNT_SP = {"bunny": ["Rabbit stew needs rosemary. I have rosemary. I have {name}. {left} steps.", "Hop, hop, plop. Into the pot, {name}.", "{name} keeps twitching that little nose. Smells the soup already.", "Carrots chopped. {name} next. {left} steps."], "hamster": ["Skewers out. {name} is the perfect bite size.", "{name}'s cheeks are full. Soon my belly will be too.", "Hamster kebab, grilled and glazed. {left} steps if you object.", "{name} would fit perfectly between two onions."], "squirrel": ["Pie crust rolled. Filling: {name}. {left} steps, nut.", "{name}'s tail will make a lovely pie decoration.", "{name} hid acorns all fall. Shame nobody's hiding {name}.", "Nutty, flaky, golden. {dish} at midnight."], "hedgehog": ["Hedgehog crisps: lightly salted, slightly pokey.", "Bought tweezers for {name}'s spines. Ready for dinner.", "Spines make great skewers. {name} is self-serving.", "{left} steps? Crunch time. Literally."], "kitten": ["Kitten casserole serves nine. One per life.", "Curiosity didn't kill this cat. Your couch did.", "Nine lives? I only need one dinner.", "{name} always lands on their feet. Let's see them land in a casserole."], "duckling": ["Oranges zested. Duckling ready. {left} steps, quack.", "{name}'s down feathers? My new pillow.", "I'm basting the pan. {name}, waddle this way.", "Lucky duck? Not tonight."], "piglet": ["Sizzle, sizzle, {name}. {left} steps or breakfast is served.", "{name} goes great with pancakes. {left} steps.", "I bought maple syrup. Guess why.", "Snout to tail, {name}. I waste nothing."], "panda": ["Steamer's hot. Dipping sauce ready. {name}?", "{name} rolled over. Into the dumpling wrapper. Convenient.", "Black, white, and steamed all over.", "Bamboo shoots make a lovely side for {dish}."]};
export function nudgeText(voice, slot, v) {
  const set = [...(voice === 'pet' ? PLEAD : TAUNT)[slot], ...((voice === 'pet' ? PLEAD_SP : TAUNT_SP)[v.species] || [])];
  return fill(pick(set), v);
}
