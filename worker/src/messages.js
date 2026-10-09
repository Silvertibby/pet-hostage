// The kidnapper ("The Raccoon") and his notes. {name} {left} {steps} {goal} {peril} {death}
const pick = a => a[Math.floor(Math.random() * a.length)];
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
export const NUDGES = {
  12: ['{name} says hi. {name} is fine. For now. {left} steps to go.',
       'Lunch break? Walk it. {left} steps or I start reading {name} the stew recipe.',
       'Noon check-in: {steps} steps. I have seen hamsters do better.'],
  15: ['Tick tock. {steps}/{goal}. The rope is getting itchy.',
       '{left} steps to go. {name} keeps giving me puppy eyes. Bunny eyes. Whatever. Walk.',
       'Afternoon slump? {name} has no slump. {name} has a carrot and big hopes for you.'],
  18: ['Dinner time. Rabbit is ALSO a dinner. {left} steps.',
       'Still {left} short. I have started chopping carrots. For reasons.',
       '{steps} steps. Cute. The pot is warming up.'],
  21: ['LAST CALL. {left} steps by midnight or the bunny goes in the pot.',
       'Three hours. {left} steps. {name} is being so brave. Do not make it pointless.',
       'Walk now. Pace the hallway. Pace the kitchen. {left} steps. MOVE.'],
};
export const PAID = ['Ransom received. {name} lives. {name} is doing happy binkies all over my lair.',
  '{goal} steps. Fine. FINE. {name} gets a carrot.',
  'You paid. {name} nibbled my chair leg to celebrate. Cute. Annoying.'];
export const MISSED = ['You missed the ransom. {name} has been moved closer to the pot. Peril {peril}/{death}.',
  'No payment yesterday. {name} is now tied to a chair. He still thinks this is a game.',
  'Missed day. I have lit the stove. Peril {peril}/{death}.'];
export const MET = ['Yesterday paid in full. {name} lives another day.',
  'Payment confirmed. {name} is bouncing off the walls. Literally. Adorably.'];
export const DIED = ['{name} is no more. He was smiling at you to the very end. Adopt another?',
  'You stopped paying. {name} is a tiny ghost now. Still cute. Somehow worse.'];
export const TEST = ['This is a test. {name} is fine. {name} is always fine. Until he isn\'t.',
  'Testing, testing. The Raccoon can reach your phone now. Sleep well.'];

export function note(kind, vars, slot) {
  const set = kind === 'nudge' ? NUDGES[slot] : { paid: PAID, missed: MISSED, met: MET, died: DIED, test: TEST }[kind];
  return fill(pick(set), vars);
}
