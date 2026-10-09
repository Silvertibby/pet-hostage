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
