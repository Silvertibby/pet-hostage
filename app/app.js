import { drawScene, drawDeath, drawShelfPet, raccoon, blit, hitBoxes, VIEW_W, VIEW_H, DEATH_LEN, SPECIES } from './art.js';

// ---- tunables ----
const VERSION = 'v0.4.0';
const GOAL = 10000;
const WORKER = 'https://pet-hostage.silvertibby.workers.dev';
const APP_URL = 'https://silvertibby.github.io/pet-hostage/';
const SHORTCUT_NAME = 'Pet Hostage Sync';
const BAR_SEGMENTS = 20;
const REFRESH_MS = 60_000;

const $ = s => document.querySelector(s);
const view = $('#view');
const qs = new URLSearchParams(location.search);
const DEMO = qs.get('demo');
const isStandalone = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
$('#ver').textContent = VERSION;

let code = localStorage.getItem('ph.code') || '';
let state = null, tab = 'home', anim = null, lastFetch = 0, unclaimed = false, welcome = false, deathPlaying = false, lastUpdated = 0, refreshing = false;

// Pick up a code from the URL (?c=CODE or #c=CODE), e.g. after Add to Home Screen.
{
  const c = (qs.get('c') || new URLSearchParams(location.hash.slice(1)).get('c') || '').toUpperCase();
  if (c && /^[A-Z0-9]{6,20}$/.test(c)) { code = c; localStorage.setItem('ph.code', c); }
}
function rememberInUrl() {
  // So "Add to Home Screen" carries the code into the home-screen app (it has separate storage on iPhone).
  if (!code || DEMO) return;
  const u = new URL(location.href); u.search = '?c=' + code; u.hash = '';
  history.replaceState(null, '', u);
  const m = { name: 'Pet Hostage', short_name: 'Pet Hostage', start_url: APP_URL + '?c=' + code, scope: APP_URL, display: 'standalone', background_color: '#1b1626', theme_color: '#1b1626',
    icons: [{ src: APP_URL + 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: APP_URL + 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }] };
  $('#manifest').href = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(m));
}

// The server is the source of truth for the code (single-user app); keep a local copy but never delete it.
function adoptCode(s) {
  if (s && s.code && s.code !== code) { code = s.code; localStorage.setItem('ph.code', code); rememberInUrl(); }
  return s;
}
function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, ms); }
const fmt = n => Number(n || 0).toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function timePT(ms) { return new Date(ms).toLocaleTimeString('en-US', { timeZone: 'America/Vancouver', hour: 'numeric', minute: '2-digit' }) + ' PT'; }
function ago(ms) { const m = Math.round((Date.now() - ms) / 60000); if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; const h = Math.round(m / 60); if (h < 24) return h + 'h ago'; return Math.round(h / 24) + 'd ago'; }

async function api(path, body) {
  // Never cached: no-store + a cache-busting query on every GET.
  const opt = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, ...body }), cache: 'no-store' } : { cache: 'no-store' };
  const q = body ? '' : (code ? 'code=' + encodeURIComponent(code) + '&' : '') + '_=' + Date.now();
  const r = await fetch(WORKER + path + (q ? (path.includes('?') ? '&' : '?') + q : ''), opt);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || ('HTTP ' + r.status)); e.status = r.status; e.body = j; throw e; }
  return j;
}

// ---- kidnapper notes on the home screen ----
function seeded(seed) { let h = 2166136261; for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }
const DEATH_TEXT = { pop: 'had its head pop clean off', anvil: 'was flattened by an anvil', catapult: 'was launched off a catapult', zap: 'got zapped by a very small lightning bolt' };
const PATCH_TEXT = { pop: 'stitches', anvil: 'bandages', catapult: 'an eye patch', zap: 'band-aids' };
function homeNote(s) {
  const h = s.hostage, left = Math.max(0, s.goal - s.todaySteps), hr = s.hour;
  const r = seeded(s.today + s.mood + h.rung + Math.floor(Date.now() / 3.6e6));
  const pick = a => a[Math.floor(r() * a.length)].replace(/\{name\}/g, h.name).replace(/\{left\}/g, fmt(left)).replace(/\{goal\}/g, fmt(s.goal)).replace(/\{steps\}/g, fmt(s.todaySteps))
    .replace(/\{day\}/g, h.day).replace(/\{need\}/g, h.need).replace(/\{species\}/g, speciesLabel(h.species));
  const ld = s.lastDeath;
  if (ld && ld.date === addDay(s.today, -1)) { // died last night
    const t = `${ld.name} ${DEATH_TEXT[ld.type] || 'met a cartoon end'}. `;
    return ld.rekidnap.same ? t + pick(['I stitched him back together. Mostly the right way round. Day 1 of {need}. Again.', 'Good news: he is fixed. Bad news: back in the cage. {need} days.'])
      : t + pick([`So I took ${ld.rekidnap.name} back off your shelf. {need} days. Same as before.`, `Anyway. ${ld.rekidnap.name} is back in my cage. {need} days, like last time.`]);
  }
  const lr = (s.shelf || []).find(p => p.rescuedOn === addDay(s.today, -1));
  if (lr && h.streak === 0) return pick([`FINE. ${lr.name} walks free. But I have acquired {name}. {need} days in a row this time.`, `${lr.name} is on your shelf. Meet my new guest, {name}. Ransom: {need} days.`]);
  if (!s.lastSync) return pick(['I have your {species}. Set up step sync so I can see your payments.', 'No payments received. Because you have not set up step sync. Do it.']);
  if (left === 0) return h.day >= h.need ? pick(['Final payment received. {name} walks free at midnight. I hate this.', 'That is {need} of {need}. {name} is packing a tiny suitcase.'])
    : pick(['Ransom paid. Day {day} of {need} banked. {name} did a happy wiggle.', '{goal} steps. Fine. FINE. {name} lives. Day {day} of {need}.']);
  if (h.deaths > 0 && hr < 15) return pick([`{name} has ${h.deaths === 1 ? 'some ' + PATCH_TEXT[h.injuries[0]] : h.deaths + ' sets of patch-ups'} now. Let's not add more. {left} steps.`, 'Remember last time? {name} does. {left} steps.']);
  if (hr < 11) return pick(['Good morning. {name} has been up since 5 AM doing zoomies. {left} steps today.', 'New day, new ransom: {goal} steps. Day {day} of {need}.']);
  if (hr < 17) return pick(['{steps} so far. {left} to go. {name} is fine. For now.', 'Tick tock. {left} steps. I just bought an anvil. Unrelated.']);
  if (hr < 21) return pick(['Evening. {left} steps or the catapult gets a test pilot.', 'Dinner time. {left} steps. Miss today and {name} goes POP.']);
  return pick(['LAST CALL. {left} steps before midnight or the {species} gets it.', 'Pace the hallway. {left} steps. MOVE.']);
}
function addDay(d, n) { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
const speciesLabel = sp => (SPECIES[sp] && SPECIES[sp].label) || sp;
const fmtDate = d => d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';
function cutout(text) {
  const r = seeded(text);
  const fonts = ["Georgia, serif", "Impact, Haettenschweiler, 'Arial Narrow', sans-serif", "'Courier New', Courier, monospace", "'Arial Black', Arial, sans-serif", "'Times New Roman', Times, serif", "'Trebuchet MS', Futura, sans-serif", "'Press Start 2P', monospace"];
  const bgs = ['#f3ead2', '#ffffff', '#ffe066', '#ffc2d6', '#cde7ff', '#e9e4d8', '#111111', '#d8f5c4'];
  return text.split(/\s+/).map(w => '<span class="w">' + [...w].map(ch => {
    const bg = bgs[Math.floor(r() * bgs.length)], dark = bg === '#111111';
    const st = `font-family:${fonts[Math.floor(r() * fonts.length)]};background:${bg};color:${dark ? '#fff' : (r() < 0.2 ? '#c0203a' : '#111')};transform:rotate(${((r() - 0.5) * 12).toFixed(1)}deg);font-size:${16 + Math.floor(r() * 7)}px`;
    return `<span class="l" style="${st}">${esc(r() < 0.5 ? ch.toUpperCase() : ch)}</span>`;
  }).join('') + '</span>').join(' ');
}

// ---- screens ----
function stopAnim() { if (anim) cancelAnimationFrame(anim); anim = null; }
let sceneT = 0, sceneReact = null;
const sceneSt = () => { const h = state.hostage || {}; return { mood: state.mood, species: h.species, injuries: h.injuries, freed: !!h.todayMet, react: sceneReact }; };
function startScene(canvas) {
  const ctx = canvas.getContext('2d');
  const t0 = performance.now(); sceneReact = null;
  const loop = now => {
    if (!state || !canvas.isConnected) return;
    sceneT = qs.has('t') ? +qs.get('t') + (sceneReact ? (now - t0) / 1000 : 0) : (now - t0) / 1000;
    drawScene(ctx, sceneSt(), sceneT);
    anim = requestAnimationFrame(loop);
  };
  anim = requestAnimationFrame(loop);
  attachTaps(canvas, () => ({ st: sceneSt(), t: sceneT, mode: state.hostage.todayMet ? 'banked' : 'behind' }), who => { sceneReact = { who, at: sceneT }; });
}

// ---- tap the pet / the raccoon: speech bubbles ----
const DISH = { bunny: 'bunny soup', hamster: 'hamster kebab', squirrel: 'squirrel pot pie', hedgehog: 'hedgehog crisps', kitten: 'kitten casserole', duckling: "duck à l'orange", piglet: 'bacon', panda: 'panda dumplings' };
const ITEM = { bunny: 'a hat', hamster: 'a keychain', squirrel: 'a scarf', hedgehog: 'a hairbrush', kitten: 'a pair of mittens', duckling: 'a pillow', piglet: 'a football', panda: 'a rug' };
const LINES = {
  pet: {
    behind: ["{name} needs {left} more steps or I'm {item}.", "Please walk. I'm too cute to be {dish}.", '{left} steps! You can do it! (Please do it.)',
      'I can hear him sharpening something. {left} more, please?', "Day {day} of {need}. Don't make me a {animal} ghost.", "Fun fact: {animal}s can't do your steps. I tried.",
      "If you love me, you'll take the stairs.", "I made you a playlist. It's called 'Walk Or I Die'.", 'Only {left} steps between me and {dish}. No pressure!',
      'The raccoon measured me for a pot today.', 'Walk to the fridge. Walk back. Do that like 400 times.', 'I believe in you! Mostly! {left} steps!',
      'Every step is a tiny hug for {name}.', "He keeps saying 'yum'. Why does he keep saying 'yum'?"],
    banked: ['FREEDOM! Well. Chain-dom. Thank you!!', 'Look at me go! Day {day} of {need} banked!', "You did it! I'm doing laps to celebrate.",
      "10,000 steps! I love you! Don't stop tomorrow.", "I'm exercising too! Solidarity!", 'The raccoon is SO mad. Hee hee.',
      "{togo} more days and I'm on the shelf for good!", "I'm not {dish} today!", 'ZOOMIES! Chained zoomies!',
      "Chain's a bit heavy but I'm FREE-ish!", 'Tomorrow too, okay? Pinky promise?', 'Best. Human. Ever.'],
    ghost: ['Wooooo. You missed ONE day.', "I'm fine. I'm see-through, but fine.", 'Tell {re} to keep an eye on you.', 'Being a ghost is chilly. Walk more next time.',
      'I forgive you. Mostly.', "Boo. That's ghost for 'step count'.", 'I can walk through walls now. You should try walking at all.'],
  },
  raccoon: {
    behind: ["You won't make it.", "I wonder how {name}'ll taste.", '{Dish} tonight!', 'Tick tock, couch potato.', '{left} steps? HA.',
      "I've already preheated the oven.", 'Sit down. Relax. Have a snack. I insist.', "Nobody needs {left} steps. That's absurd.",
      'Your couch misses you. Go back to it.', "I've got the salt. I've got the pepper. I've got {name}.", '{name} and I are going to have SUCH a nice dinner.',
      "Walking is overrated. Ask me, I'm a raccoon.", 'Mmm. {Dish}. My grandma\'s recipe.', 'Is that a step counter or a rounding error?'],
    banked: ['Hmph. Lucky day.', 'Ten thousand. Fine. FINE.', "Don't get used to it.", 'I was so hungry, too.', 'Enjoy the chain, {name}.',
      "Tomorrow, the pot's back on.", 'Who even walks that much?', "I'm putting the {dish} recipe away. For now.", 'Ugh. Your legs are annoying.',
      'Streak, schmeak.', '{togo} more days in a row? I dare you.', 'Go sit down. I can wait.'],
    ghost: ['Told you.', 'Mmm. {Dish}.', "One day. That's all it took.", 'Next!', 'I kept the ears. Kidding. Mostly.', "Should've walked.", "Don't worry, {re} is next."],
  },
};
// v0.4.0: lots more lines, plus each animal's own (pet begs in character, The Raccoon has a recipe for everyone).
const MORE_LINES = {"pet": {"behind": ["I'm too small to be a whole meal. Walk anyway!", "He asked if I'm 'free range'. What does that MEAN.", "{left} steps. That's a lot of tiny hops. You have big legs!", "Please don't let me become a garnish.", "Walk like a raccoon is chasing you. One is chasing ME.", "He labeled a jar with my name. {left} steps, please!", "I'm cheering for you! *tiny wheeze* Go go go!", "If you walk, I'll do the cute thing with my eyes. Look. LOOK.", "Your phone says {steps}. My heart says HURRY.", "Pace while you brush your teeth! Pace while you think! Pace!", "Day {day} of {need}. I've been so good. Have I been good?", "He just licked a spoon and looked at me.", "Every step you take, the oven gets a little sadder.", "Kitchen dance party? Counts as steps! Probably!", "I'm not crying. He's chopping onions. FOR ME.", "Take the long way to anywhere. Literally anywhere.", "He bought a cookbook called 'Small and Fluffy'. Walk!", "I traced your name on the cage floor. With a paw. Walk?", "Walk the dog! Walk a friend! Walk a plant! Just walk!", "{left} more and I'll name my first snack after you.", "I've got {left} problems and they're all steps.", "Is that the couch creaking? Tell me that's not the couch.", "He practiced saying grace at dinner. Walk!", "Walking is good for your heart. And MY heart. Still beating!", "I'll be so quiet. I'll be so good. Just {left} steps.", "He put a little apron on. A LITTLE APRON.", "Run an errand. Run two. Run away from that chair.", "You + legs + {left} steps = me, not soup."], "banked": ["Day {day} banked! I'm vibrating with joy!", "I did a lap! You did 10,000! We're basically a team!", "Wheee! The chain jingles when I'm happy!", "You saved me again! I'd hug you if I wasn't chained.", "He had to put the pot away. I watched. It was beautiful.", "My legs are tiny but my gratitude is HUGE.", "I'm stretching! Look at my stretch! Very athletic!", "You walked so I could stroll. Thank you!!", "Same time tomorrow? Same steps tomorrow?", "I told the raccoon you'd do it. He sulked.", "Not soup! Not today! Not soup!", "{togo} more days. I'm counting on my toes.", "Victory hops! Hop. Hop. Hoppity.", "You're my favorite human. My ONLY human, but still.", "Steps paid! I'm going to nap so hard tonight.", "The oven's cold! The oven's COLD!", "Did you see his face? Priceless. Again tomorrow!", "Look, I'm power walking! Like you!", "This chain is basically jewelry now.", "Thank you thank you thank you thank you.", "Another day alive! My favorite kind of day!", "You're unstoppable! Please stay unstoppable.", "He's eating cereal for dinner. Because of YOU.", "Tomorrow: 10,000 more. I'll be right here. Cheering."], "ghost": ["I'm a little cloud now. A sad little cloud.", "Heaven has no step counter. Lucky them.", "I left you my favorite pebble. It's under the cage.", "Don't cry. Okay, cry a little. Then walk.", "Boo-hoo. That's ghost for 'I miss my body'.", "Floating is not walking. Learn from me.", "Watch over {re}, okay? Walk for {re}.", "No halo for me. Just stitches, coming soon.", "I'll haunt your couch until you get off it.", "I'm see-through and disappointed.", "Can ghosts earn steps? Asking for me.", "Wooo... walk... wooo... more...", "At least I'm not soup. Oh wait. I was briefly soup.", "I'll be back. Patched up. Walk next time."]}, "raccoon": {"behind": ["I bought a bigger pot. Just in case.", "My grandma walked more than that. Into a trap. On purpose.", "Fork. Knife. Napkin. {name}.", "Keep sitting. You're doing great. For me.", "Writing tonight's menu. Spoiler: it's {name}.", "{left} to go? I'll set out the good plates.", "Is the couch comfy? Stay there. Forever.", "Hear that? My stomach is rooting against you.", "Every step you skip is a little more seasoning.", "I drew dotted lines on {name}. Like a butcher chart.", "Your legs are on strike. I support the union.", "The pot's on low. Low and slow. Like you.", "I'm not saying you'll fail. I'm saying I bought lemons.", "Walking is hard. Eating is easy. I choose easy.", "You call that a stride? I call it a garnish.", "Tonight's wine pairing: whatever goes with {dish}.", "Big plans tonight? Me too. They involve a ladle.", "Stay in bed. Beds are nice. Pots are nicer.", "Found a coupon for butter. Coincidence? No.", "{left} steps. I'll start the timer. And the stove.", "I named my oven mitts 'Thanks' and 'Lazy'.", "Steps are temporary. Leftovers are forever.", "Don't get up. I'll bring {name} to the table.", "Practicing my chef's kiss. Mwah. {Dish}.", "Oh no, {steps} steps. Anyway, onions.", "Your pedometer called. It's bored.", "Good news: {name} fits in the oven. I checked.", "I'm rooting for you! Kidding. I'm rooting for dinner."], "banked": ["You walked 10,000 steps just to spite me. Respect. Hate it.", "Fine. Cereal for dinner. AGAIN.", "I'll just eat this sad cracker then.", "The stove and I aren't speaking to you.", "Enjoy it. Tomorrow I buy a bigger pot.", "Your legs got lucky. Legs get tired.", "Oh look, someone can walk. Big whoop.", "I had a whole sauce planned.", "Ten thousand? Was the scale broken?", "Back in the fridge, butter. Not tonight.", "{name} strutting around like a free {animal}. Disgusting.", "Gloat. Go on. I'll remember.", "I'll be in my kitchen. Sulking. Sharpening.", "The chain's long because I'm generous. Don't push it.", "Today, you. Tomorrow, soup.", "Who taught you to walk? I want a word.", "Great. Now I eat the garnish alone.", "Congratulations on your legs. They must be proud.", "One day you'll sit down. I'll be here.", "Day {day} of {need}. The math is still on my side.", "Pfft. Anybody can walk. I prefer scheming.", "Put the {dish} back on the shelf. Sigh.", "A temporary setback in my menu.", "Stop smiling, {name}. It's unbecoming."], "ghost": ["Pass the salt. Oh right. Nothing to salt.", "Should've taken the stairs.", "Rest in pieces. Mostly peace.", "I'd say sorry but my mouth is full.", "Your couch sends its condolences.", "That's what skipping leg day gets you.", "Delicious lesson, wasn't it?", "Bring {re} a snack. I'm bringing a pot.", "Ghosts can't be cooked. Annoying, honestly.", "One less mouth to feed. Mine's still hungry.", "Boo to you too.", "I put a little flower on the plate. Respect.", "Next time, walk. Or don't. I win either way.", "Cartoon physics, baby."]}};
for (const who in MORE_LINES) for (const mode in MORE_LINES[who]) LINES[who][mode].push(...MORE_LINES[who][mode]);
const SPECIES_LINES = {"bunny": {"pet": {"behind": ["My ears are shaking. Both of them. {left} steps!", "I'll thump the floor for every step you take. Thump!", "I'm a bunny! I belong in a meadow, not a pot!", "He keeps waving a carrot at me. It's a TRAP carrot.", "I can hop three feet. You can walk {left} steps. Teamwork!", "My nose is wiggling at max speed. Please hurry."], "banked": ["Binky! That's a happy bunny jump! BINKY!", "My ears are up! Ears up means joy!", "Carrots for everyone! Well, for me."]}, "raccoon": {"behind": ["Bunny stew needs carrots. Look, {name} brought their own.", "Lucky rabbit's foot? Not so lucky, huh, {name}?", "Hop into the pot, {name}. It's warm.", "Got the rosemary. Rabbit loves rosemary.", "Those ears would make great pot handles.", "I'll pull you out of a hat. Then into a stew."], "banked": ["Fine. No stew. Just carrot sticks. Sad.", "Hop away, {name}. Not far. Chain.", "Ears up today. Ears in soup tomorrow."]}}, "hamster": {"pet": {"behind": ["I ran four miles on my wheel. Your turn! {left} steps!", "I stuffed my cheeks with courage. It's running out.", "He wants me on a skewer. I'm a FLUFFBALL.", "My tiny heart beats 400 times a minute. Mostly fear.", "I'd lend you my wheel, but, you know. Cage.", "Hamsters don't faint. I might be the first."], "banked": ["Cheeks full of joy! Mmmph!", "Wheel time! Free wheel time!", "Running in circles! Happy circles!"]}, "raccoon": {"behind": ["Skewers: sharpened. Hamster: plump.", "Cute cheeks, {name}. Bet they're crispy.", "I'll put you in a ball. A meatball.", "Your wheel can't save you now.", "Hamster on a stick. Fair food classic.", "Pocket-sized dinner. My favorite size."], "banked": ["Put the skewers away. Ugh.", "Keep your cheeks, {name}. For now.", "Spin your little wheel. I'll wait."]}}, "squirrel": {"pet": {"behind": ["I hid acorns for both of us. Walk and I'll show you where!", "My tail's all puffed. That's squirrel for HELP.", "I'm nuts about you! {left} steps, please!", "He said pot pie. I don't want to be the pot OR the pie.", "If I had a tree I'd climb out. I have you. Walk!", "Chitter chitter! That means {left} steps, please!"], "banked": ["Tail flick of joy! Flick flick!", "Zoom zoom up the cage bars!", "Burying a thank-you acorn for you!"]}, "raccoon": {"behind": ["Squirrel pot pie. Flaky crust. Flaky human.", "That fluffy tail? Feather duster after dinner.", "Nutty flavor, {name}. Very on brand.", "I'll stuff you like you stuff acorns.", "Gather your nuts, {name}. Last chance.", "Tree to table. That's my whole philosophy."], "banked": ["Fine. No pie. Just sad crust.", "Scurry off, {name}. Not too far.", "Hide your acorns. I'll be back."]}}, "hedgehog": {"pet": {"behind": ["I'm curled in a ball. It's not helping. {left} steps!", "I'm spiky, not crunchy! Don't make me crisps!", "My spines are up. That's how scared I am.", "I sniffed out {left} steps for you. Follow your nose!", "Prickly outside, terrified inside.", "I'm too pokey to eat! Probably! Walk anyway!"], "banked": ["Unrolling! I'm unrolling! Ta-da!", "Happy snuffle! Snuffle snuffle!", "Spines down. I'm SO relaxed."]}, "raccoon": {"behind": ["Hedgehog crisps. Salt and vinegar.", "I'll peel the spines first. Like an artichoke.", "Roll into a ball, {name}. Easier to bread.", "Spines make great toothpicks after dinner.", "Crunchy outside, juicy inside. Chef's dream.", "Don't worry. Oven gloves for the pokey bits."], "banked": ["Put the crisps away. Ow. Spines.", "Stay pointy, {name}. For now.", "Rolled up and safe. Annoying."]}}, "kitten": {"pet": {"behind": ["Mew. That's kitten for {left} steps, please.", "I have nine lives but I'd like to keep THIS one.", "I'm purring to calm down. It's not working.", "He wants a casserole. I want to knead your lap.", "I knocked his spoon off the table. Bought you a minute. Walk!", "Big eyes. Tiny meow. {left} steps."], "banked": ["Purrrrrr! Max purr!", "Kitten zoomies! Chained zoomies!", "Slow blink. That's kitty for I love you."]}, "raccoon": {"behind": ["Kitten casserole. Nine servings.", "Curiosity killed the cat. So will a lazy human.", "Sharpening my claws. And my knives.", "Here, kitty kitty. Into the dish.", "Purr all you want. The oven purrs louder.", "Save those whiskers. I'll floss with them."], "banked": ["Fine. Land on your feet, {name}.", "One of nine lives saved. Don't get cocky.", "Go chase your tail. I'll chase dinner."]}}, "duckling": {"pet": {"behind": ["Peep! Peep peep! (That's {left} steps.)", "I just learned to waddle. You can do better!", "He said 'à l'orange'. I don't even LIKE oranges.", "My fluff is fluffing up from fear.", "Ducks walk in a row. Walk with me! In spirit!", "Quack? Quack. QUACK. Please walk."], "banked": ["Waddle waddle! Happy waddle!", "Peep peep hooray!", "Puddle stomp of joy!"]}, "raccoon": {"behind": ["Duck à l'orange. Three oranges zested already.", "Your feathers? My new pillow, {name}.", "Waddle into the roasting pan, {name}.", "Just ducky. For me.", "Quack quack. That's duck for 'garnish'.", "Get your ducks in a row. Then in the oven."], "banked": ["Put the oranges back. Ugh.", "Waddle off, {name}. Chain's that way.", "Lucky duck. Literally."]}}, "piglet": {"pet": {"behind": ["Oink! That's piglet for HELP!", "I don't want to be bacon! I want to be your friend!", "My curly tail is uncurling from stress.", "I'll roll in mud for joy if you walk {left} steps!", "He's whispering 'crispy' at me. CRISPY.", "This little piggy wants to go home!"], "banked": ["Happy oink! Snort snort!", "Mud party tonight! Kidding. Chained.", "My tail's curly again! That means joy!"]}, "raccoon": {"behind": ["Bacon. Sizzle. Sizzle. Sizzle.", "This little piggy went to the frying pan.", "Hear that sizzle, {name}? That's your future.", "Snout to tail. I use everything.", "Got the maple syrup. Breakfast is ON.", "Pork chop, pork chop, pork chop."], "banked": ["No bacon. Toast. Plain toast.", "Snort all you want, {name}.", "Pig out on freedom. While it lasts."]}}, "panda": {"pet": {"behind": ["I'm a cub. A CUB. Walk {left} steps!", "I'd climb bamboo for you. You walk for me!", "He wants dumplings. I'm not a dumpling. I'm chubby.", "I did a roly-poly. Motivated? Walk!", "Endangered! I'm endangered! Right now!", "Black and white and scared all over."], "banked": ["Roly-poly of joy!", "Bamboo for everybody!", "Happy panda tumble! Oof!"]}, "raccoon": {"behind": ["Panda dumplings. Steamed. With dipping sauce.", "Black and white and ready to eat.", "Steamer basket's warmed up.", "Endangered species? More like entrée species.", "Roll over, {name}. Into the dumpling.", "Bamboo shoots. Perfect side dish."], "banked": ["Put the steamer away. Sigh.", "Tumble along, {name}.", "No dumplings tonight. Again."]}}};
const lastLine = {};
function pickLine(who, mode, v) {
  const pool = [...LINES[who][mode], ...((SPECIES_LINES[v.species] || {})[who]?.[mode] || [])], key = who + mode + (v.species || '');
  let i; do { i = Math.floor(Math.random() * pool.length); } while (pool.length > 1 && i === lastLine[key]);
  lastLine[key] = i;
  return pool[i].replace(/\{(\w+)\}/g, (_, k) => k === 'Dish' ? (v.dish[0].toUpperCase() + v.dish.slice(1)) : (v[k] ?? ''));
}
function lineVars(extra = {}) {
  const h = state.hostage || {}, sp = extra.species || h.species || 'bunny';
  return { name: extra.name || h.name, species: sp, steps: fmt(state.todaySteps || 0), animal: speciesLabel(sp), dish: DISH[sp] || 'stew', item: ITEM[sp] || 'a hat', left: fmt(Math.max(0, GOAL - (state.todaySteps || 0))),
    day: h.day, need: h.need, togo: Math.max(0, (h.need || 0) - (h.streak || 0) - (h.todayMet ? 1 : 0)), re: extra.re || '' };
}
function attachTaps(canvas, getCtx, onReact, extra) {
  const wrap = canvas.parentElement; let bubble = wrap.querySelector('.bubble'), hideT;
  if (!bubble) { bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.hidden = true; wrap.appendChild(bubble); }
  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * VIEW_W, y = (e.clientY - r.top) / r.height * VIEW_H;
    const c = getCtx(), hb = hitBoxes(c.st, c.t), inb = b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    const who = inb(hb.raccoon) ? 'raccoon' : inb(hb.pet) ? 'pet' : null;
    if (!who) return;
    showBubble(canvas, bubble, hb[who], who, pickLine(who, c.mode, lineVars(extra && extra())));
    clearTimeout(hideT); hideT = setTimeout(() => { bubble.hidden = true; }, 3800);
    onReact && onReact(who);
  });
}
function showBubble(canvas, bubble, box, who, text) {
  const sx = canvas.clientWidth / VIEW_W, sy = canvas.clientHeight / VIEW_H;
  bubble.textContent = text; bubble.className = 'bubble ' + who; bubble.hidden = false;
  const bw = Math.min(canvas.clientWidth * 0.72, 250); bubble.style.width = bw + 'px';
  const cx = (box.x + box.w / 2) * sx, left = Math.max(6, Math.min(canvas.clientWidth - bw - 6, cx - bw / 2));
  bubble.style.left = (canvas.offsetLeft + left) + 'px';
  bubble.style.setProperty('--tail', Math.max(14, Math.min(bw - 14, cx - left)) + 'px');
  const top = Math.max(4, box.y * sy - bubble.offsetHeight - 4);
  bubble.style.top = (canvas.offsetTop + top) + 'px';
}
window.__tap = (who) => { // demo/screenshot helper: tap the centre of the pet or raccoon
  const c = (!$('#overlay').hidden && $('#dscene')) || $('#scene'); if (!c) return; const s = c.id === 'scene' ? sceneSt() : { mode: 'death' };
  const hb = hitBoxes(s, sceneT)[who], r = c.getBoundingClientRect();
  c.dispatchEvent(new MouseEvent('click', { clientX: r.left + (hb.x + hb.w / 2) / VIEW_W * r.width, clientY: r.top + (hb.y + hb.h / 2) / VIEW_H * r.height, bubbles: true }));
};
function noteAvatar(canvas) { blit(canvas.getContext('2d'), raccoon(0, -1), 0, 0); }

function renderHome() {
  const s = state, h = s.hostage;
  const prog = Math.min(1, s.todaySteps / s.goal);
  const filled = Math.floor(prog * BAR_SEGMENTS);
  const pips = Array.from({ length: h.need }, (_, i) => `<span class="dpip ${i < h.streak ? 'on' : i === h.streak ? (h.todayMet ? 'on today' : 'today') : ''}"></span>`).join('');
  const maxSteps = Math.max(s.goal * 1.3, ...s.days.map(d => d.steps || 0));
  const chart = s.days.map(d => {
    const cls = d.steps == null ? (d.date < s.started || d.date === s.today ? '' : 'none') : (d.steps >= s.goal ? 'met' : d.date === s.today ? '' : 'miss');
    return `<div class="${cls} ${d.date === s.today ? 'today' : ''}" style="height:${Math.round(100 * (d.steps || 0) / maxSteps)}%" title="${d.date}: ${d.steps ?? 'no data'}"></div>`;
  }).join('');
  const tag = h.todayMet ? (h.day >= h.need ? '🎉 rescue at midnight' : '✓ banked') : '';
  view.innerHTML = `
    <div class="scenewrap big"><canvas id="scene" class="px" width="${VIEW_W}" height="${VIEW_H}"></canvas>
      <div class="hudname">${esc(h.name)}</div></div>
    <div class="quest"><div class="qhead"><b>Day ${h.day}/${h.need}</b><div class="dpips">${pips}</div>${tag ? `<span class="tag">${tag}</span>` : ''}</div></div>
    <div class="steps"><b>${fmt(s.todaySteps)}</b><span>/ ${fmt(s.goal)}</span></div>
    <div class="bar ${prog >= 1 ? 'done' : ''}">${Array.from({ length: BAR_SEGMENTS }, (_, i) => `<i class="${i < filled ? 'f' : ''}"></i>`).join('')}</div>
    <div class="sync"><span>${s.lastSync ? `Synced ${ago(s.lastSync)}` : `<span class="hint">No steps synced yet</span>`} <span id="upd" class="upd">${updLabel()}</span></span>
      <span class="row nowrap">${s.lastSync ? `<button class="btn small ghost" id="syncnow">Sync</button>` : `<button class="btn small acc" id="gosetup">Set up sync</button>`}<button class="btn small ghost" id="refreshbtn" aria-label="Refresh">↻</button></span></div>
    ${s.push ? '' : pushBanner(h)}
    <details class="more"><summary><canvas class="px" id="rac" width="30" height="28"></canvas>Ransom note</summary>
      <div class="note"><div class="cut">${cutout(homeNote(s))}</div></div></details>
    <details class="more"><summary>📈 History</summary>
      <div class="legend"><span>🏆 ${s.shelf.length} on the shelf</span><span>${s.stats.metDays} paid · ${s.stats.missedDays} missed</span></div>
      <div class="chart">${chart}</div>
      <div class="legend"><span>${s.days[0].date.slice(5)}</span><span>today</span></div></details>
    <details class="more"><summary>❓ The deal</summary>
      <p class="small">${esc(h.name)} the ${esc(speciesLabel(h.species))} (rung ${h.rung + 1}): 10,000 steps a day, ${h.need} days in a row, and ${esc(h.name)} goes on your shelf. Miss one and, well.${h.deaths ? ` Patched up after ${h.deaths} death${h.deaths > 1 ? 's' : ''} so far.` : ''}</p>
      <p class="small dim">Tap ${esc(h.name)} or The Raccoon to hear from them. Pull down to refresh.</p></details>
  `;
  startScene($('#scene')); noteAvatar($('#rac'));
  $('#gosetup')?.addEventListener('click', () => go('sync'));
  $('#refreshbtn')?.addEventListener('click', () => doRefresh('button'));
  $('#pushbanner-on')?.addEventListener('click', e => enablePush(e, $('#pushbanner-msg'))); // permission prompt must come straight from this tap
  $('#syncnow')?.addEventListener('click', () => { location.href = 'shortcuts://run-shortcut?name=' + encodeURIComponent(SHORTCUT_NAME); });
}

// Notifications are off: a big banner so the hostage can beg (and the raccoon can taunt) twice a day.
function pushBanner(h) {
  const notHome = isIOS && !isStandalone();
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  return `<div class="pushbanner"><div class="pbt">🔔 Turn on notifications</div>
    <div class="small">${esc(h.name)} begs at 1 PM and 7:30 PM, only on days you're short.</div>
    ${notHome ? `<div class="hint small">Open Pet Hostage from your Home Screen icon first, then tap the button.</div>` : !supported && !DEMO ? `<div class="hint small">This browser can't do notifications.</div>` : ''}
    <p style="margin:8px 0 0"><button class="btn acc" id="pushbanner-on" ${notHome || (!supported && !DEMO) ? 'disabled' : ''}>Enable notifications</button></p>
    <div id="pushbanner-msg" class="small dim"></div></div>`;
}

// ---- the rescued shelf + the ladder ----
function petCard(p, extra) {
  return `<div class="pcard ${p.locked ? 'locked' : ''} ${p.status || ''}"><canvas class="px shelfpet" width="40" height="42" data-i="${shelfPets.length}"></canvas>
    <div class="pname">${p.locked ? '???' : esc(p.name)}</div><div class="dim small">${extra}</div></div>`;
}
let shelfPets = [];
function animateShelf() {
  const cs = [...view.querySelectorAll('canvas.shelfpet')];
  const t0 = performance.now();
  const loop = now => {
    if (!cs.length || !cs[0].isConnected) return;
    const t = (now - t0) / 1000;
    cs.forEach(c => drawShelfPet(c.getContext('2d'), shelfPets[+c.dataset.i], t));
    anim = requestAnimationFrame(loop);
  };
  anim = requestAnimationFrame(loop);
}
const scars = p => p.deaths ? `<br>patched up ×${p.deaths}` : '';
function renderShelf() {
  const s = state; shelfPets = [];
  const reveal = DEMO === 'lineup';
  const cards = arr => arr.map(x => { const html = petCard(x.p, x.extra); shelfPets.push(x.p); return html; }).join('');
  const shelf = s.shelf.map(p => ({ p, extra: `rescued ${fmtDate(p.rescuedOn)}${scars(p)}` }));
  const ladder = s.ladder.map(l => {
    const p = { ...l, locked: !reveal && l.status === 'locked' && !l.known, injuries: l.injuries || [] };
    const tag = l.status === 'rescued' ? '✅ rescued' : l.status === 'hostage' ? '🔒 hostage' : p.locked ? '' : speciesLabel(l.species);
    return { p, extra: `${l.need} days${tag ? ' · ' + tag : ''}` };
  });
  view.innerHTML = `
    <h2>RESCUED SHELF</h2>
    <div class="shelf">${shelf.length ? `<div class="pgrid">${cards(shelf)}</div><div class="plank"></div>` : `<div class="card dim">Empty. Rescue ${esc(s.hostage.name)} (${s.hostage.need} days of 10,000 in a row) to put someone here.</div>`}</div>
    <p class="dim small">Miss a day and the current hostage dies. Then The Raccoon takes the last pet on this shelf back, and you rescue it again with its original day count.</p>
    <h2>THE LADDER</h2>
    <div class="pgrid ladder">${cards(ladder)}</div>
    <p><button class="btn small" id="share2">Share with a friend</button> <span class="dim small">They get their own ladder.</span></p>
    <h2>OBITUARIES</h2>
    <div class="card">${(s.deathLog || []).length ? s.deathLog.map(d => `<div class="grave"><span>🪦</span><span><b>${esc(d.name)}</b> <span class="dim">${fmtDate(d.date)} · ${esc(DEATH_TEXT[d.type] || '')}. ${d.rekidnap.same ? 'Stitched back up.' : esc(d.rekidnap.name) + ' re-kidnapped.'}</span></span></div>`).join('') : '<span class="dim">Nobody has died. Yet.</span>'}</div>
  `;
  $('#share2').addEventListener('click', shareApp);
  animateShelf();
}

// ---- death replay: plays once, the next time the app opens after a death ----
function seenDeathId() { return Math.max(state?.deathSeen || 0, +(localStorage.getItem('ph.deathSeen') || 0)); }
function maybePlayDeath() {
  const d = state && state.lastDeath;
  if (!d || deathPlaying || DEMO) return;
  if (d.id > seenDeathId()) playDeath(d);
}
function playDeath(d, freezeAt) {
  deathPlaying = true;
  const ov = $('#overlay'); ov.hidden = false;
  const p = (state.ladder || []).find(x => x.rung === d.rung) || {};
  const injBefore = (p.injuries || []).slice(0, Math.max(0, (d.deaths || 1) - 1)); // as it looked before this death
  const re = d.rekidnap;
  const msg = `${d.name} ${DEATH_TEXT[d.type] || 'met a cartoon end'}. ` + (re.same ? `I stitched him back together. ${re.need} days in a row. Again.` : `So I took ${re.name} back off your shelf. ${re.need} days. Same as before.`);
  ov.innerHTML = `<div class="ovbox"><h2>☠ ${fmtDate(d.date)}: YOU MISSED A DAY</h2><div class="scenewrap"><canvas id="dscene" class="px" width="${VIEW_W}" height="${VIEW_H}"></canvas></div>
    <div class="note" id="dnote" style="visibility:hidden"><canvas class="px" id="drac" width="30" height="28"></canvas><div class="from">From: The Raccoon</div><div class="cut">${cutout(msg)}</div></div>
    <div class="row" style="justify-content:space-between"><button class="btn ghost small" id="dreplay">Replay</button><button class="btn acc" id="dok" style="visibility:hidden">${re.same ? 'Try again' : 'Rescue ' + esc(re.name)}</button></div></div>`;
  noteAvatar($('#drac'));
  const ctx = $('#dscene').getContext('2d');
  attachTaps($('#dscene'), () => ({ st: { mode: 'death' }, t: 0, mode: 'ghost' }), null, () => ({ name: d.name, species: d.species, re: d.rekidnap.name }));
  let t0 = performance.now(), raf;
  const show = () => { $('#dnote').style.visibility = 'visible'; $('#dok').style.visibility = 'visible'; };
  const loop = now => {
    const t = freezeAt != null ? freezeAt : (now - t0) / 1000;
    drawDeath(ctx, { species: d.species, injuries: injBefore, type: d.type }, Math.min(t, DEATH_LEN + 30));
    if (t > DEATH_LEN - 1.2 || freezeAt >= DEATH_LEN - 1.2) show();
    if (freezeAt == null && $('#dscene')) raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  $('#dreplay').addEventListener('click', () => { t0 = performance.now(); });
  $('#dok').addEventListener('click', () => {
    cancelAnimationFrame(raf); ov.hidden = true; ov.innerHTML = ''; deathPlaying = false;
    localStorage.setItem('ph.deathSeen', String(d.id)); if (state) state.deathSeen = d.id;
    if (!DEMO) api('/seen-death', { id: d.id }).catch(() => {});
    render();
  });
}

function syncLogHtml(s) {
  const log = (s.syncLog || []);
  if (!log.length) return `<span class="dim">Nothing has reached The Raccoon yet. Run the "${SHORTCUT_NAME}" shortcut once by hand, then tap "I ran it, check steps" below.</span>`;
  const line = e => `${e.ok ? '✅' : '❌'} ${timePT(e.at)} · ${ago(e.at)} · ${e.ok ? (e.dry ? 'dry run, ' : '') + fmt(e.steps) + ' steps' : esc(e.reason || 'failed')}${e.raw != null && !e.ok ? ` <span class="dim">(got "${esc(e.raw)}")</span>` : ''}${e.codeNote ? ` <span class="dim">· ${esc(e.codeNote)}</span>` : ''}${e.src === 'garmin' ? ' <span class="dim">· Garmin</span>' : ''}${e.ok && e.reason ? ` <span class="dim">· ${esc(e.reason)}</span>` : ''}`;
  return `<div>${line(log[0])}</div>` + (log.length > 1 ? `<div class="dim" style="margin-top:6px">Earlier:<br>${log.slice(1).map(line).join('<br>')}</div>` : '');
}
function garminHtml(s) {
  const g = s.garmin;
  if (!g || !g.lastSync) return '';
  const err = g.lastError && g.lastErrorAt && g.lastErrorAt > g.lastSync;
  return `<h2>GARMIN</h2>
    <div class="card" id="garmin">
      <div>⌚ <b>Synced automatically from Garmin</b></div>
      <div class="dim" style="margin-top:6px">Last Garmin sync ${timePT(g.lastSync)} · ${ago(g.lastSync)} · ${fmt(g.lastSteps)} steps</div>
      <div class="dim">Checks your Garmin account every 15 minutes, 5 AM to midnight, plus 11:55 PM. Nothing to run on your phone.</div>
      ${err ? `<div style="margin-top:6px">❌ Last attempt failed ${timePT(g.lastErrorAt)}: ${esc(g.lastError)}</div>` : ''}
    </div>`;
}
function syncUrl() { return `${WORKER}/sync?code=${code}&steps=`; }
function renderSync() {
  view.innerHTML = `
    <h2>LAST SYNC ATTEMPT</h2>
    <div class="card" id="synclog">${syncLogHtml(state)}</div>
    ${garminHtml(state)}
    <h2>${state.garmin && state.garmin.lastSync ? 'BACKUP: SHORTCUT SYNC' : 'SET UP STEP SYNC'}</h2>
    ${state.garmin && state.garmin.lastSync ? `<p class="dim">Only needed if Garmin sync stops working. A Shortcut sync can raise today's count but never lower what Garmin reported.</p>` : ''}
    <p class="dim">Your iPhone counts steps into Apple Health (Garmin steps land there too). A Shortcut sends today's total to The Raccoon. Build it once, then automate it.</p>
    <div class="card">
      <div class="dim">Your sync code</div>
      <div class="row" style="justify-content:space-between"><span class="big-code">${esc(code)}</span><button class="btn small" data-copy="${esc(code)}">Copy</button></div>
      <div class="dim" style="margin-top:10px">Sync URL (paste into the Shortcut)</div>
      <div class="code" id="surl">${esc(syncUrl())}</div>
      <p><button class="btn acc" data-copy="${esc(syncUrl())}">Copy sync URL</button></p>
    </div>
    <h2>1. BUILD THE SHORTCUT</h2>
    <ol class="guide">
      <li>Open the <b>Shortcuts</b> app, tap <b>+</b>, and name it <b>${SHORTCUT_NAME}</b> (exact name, so the Sync now button can find it).</li>
      <li>Add <b>Find Health Samples</b>. Set Type to <b>Steps</b>, add the filter <b>Start Date is Today</b>, and set <b>Group By</b> to <b>Day</b> (this gives Health's real daily total with no double counting from phone + watch).</li>
      <li>Add <b>Calculate Statistics</b>, set it to <b>Sum</b> of the Health Samples.</li>
      <li>Add <b>Get Contents of URL</b>. Paste the sync URL above, then tap right after <b>steps=</b> and insert the <b>Statistics Result</b> variable.</li>
      <li>Optional: add <b>Show Result</b> on <b>Contents of URL</b> to see The Raccoon's reply.</li>
      <li>Tap ▶︎ once. Allow Health access and allow it to connect to <b>workers.dev</b>.</li>
    </ol>
    <h2>2. AUTOMATE IT</h2>
    <ol class="guide">
      <li>In Shortcuts, open the <b>Automation</b> tab, tap <b>+</b> (or New Automation).</li>
      <li>Pick <b>Time of Day</b>, set <b>11:30 PM</b>, <b>Daily</b>, and choose <b>Run Immediately</b> (turn off Notify When Run).</li>
      <li>Tap Next and pick <b>${SHORTCUT_NAME}</b>.</li>
      <li>Repeat for a few daytime times (e.g. <b>12 PM, 3 PM, 6 PM, 9 PM</b>) so The Raccoon's nudges know how you're doing. One automation per time.</li>
    </ol>
    <p class="dim">The 11:30 PM sync is the one that matters: a day is judged at midnight Pacific with whatever steps were synced last.</p>
    <h2>TEST IT</h2>
    <p><button class="btn" id="refresh">I ran it, check steps</button></p>
    <div id="synctest" class="dim"></div>
  `;
  view.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast('Copied'); } catch { toast('Copy failed, long-press to select'); }
  }));
  $('#refresh').addEventListener('click', async () => {
    await refresh(true);
    $('#synclog').innerHTML = syncLogHtml(state);
    if ($('#garmin')) $('#garmin').outerHTML = garminHtml(state).replace(/^<h2>GARMIN<\/h2>\s*/, '');
    $('#synctest').textContent = state.lastSync ? `Last sync ${timePT(state.lastSync)} (${ago(state.lastSync)}): ${fmt(state.lastSteps)} steps.` : 'Nothing received yet.';
  });
}

function renderSettings() {
  const s = state;
  const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  let pushHint = '';
  if (isIOS && !isStandalone()) pushHint = 'On iPhone, notifications only work from the home-screen app: Share → Add to Home Screen, then open Pet Hostage from there.';
  else if (!pushSupported) pushHint = 'This browser can\'t do web push.';
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  view.innerHTML = `
    <h2>NOTIFICATIONS</h2>
    <div class="card">
      <p>Around 1 PM and 7:30 PM, if you're under 10,000, you get one note from your hostage (begging) and one from The Raccoon (taunting). Plus a note when you pay, and a morning report on yesterday (rescues, deaths, re-kidnappings).</p>
      <p class="dim">Status: ${s.push ? 'subscribed ✅' : 'off'} · permission: ${perm}</p>
      ${pushHint ? `<p class="hint">${pushHint}</p>` : ''}
      <div class="row">
        <button class="btn acc" id="pushon" ${pushHint ? 'disabled' : ''}>${s.push ? 'Re-enable' : 'Enable notifications'}</button>
        <button class="btn" id="pushtest" ${s.push ? '' : 'disabled'}>Send test nudge</button>
      </div>
      <div id="pushmsg" class="dim" style="margin-top:8px"></div>
    </div>
    <h2>RANSOM</h2>
    <div class="card">
      <label for="pname">Current hostage's name</label><input type="text" id="pname" maxlength="24" value="${esc(s.hostage.name)}">
      <p><button class="btn" id="save">Save</button></p>
      <p class="dim">Rules: the ransom is always <b>10,000 steps a day</b>, judged at midnight Pacific. Each pet on the ladder needs a streak to rescue: 3 days for the bunny, then 5, 7, 9... Rescued pets go on the shelf and The Raccoon grabs the next animal. Miss a single day and the current hostage meets a cartoon end, then The Raccoon takes your last rescued pet back, and you rescue it again with its original day count. Pets that died come back patched up.</p>
    </div>
    <h2>PLAY WITH A FRIEND</h2>
    <div class="card">
      <p class="dim">Send a friend the app link. They get their own raccoon, their own ladder and their own code. Your pets stay yours.</p>
      <p><button class="btn acc" id="share">Share with a friend</button></p>
    </div>
    <h2>YOUR CODE</h2>
    <div class="card">
      <div class="row" style="justify-content:space-between"><span class="big-code">${esc(code)}</span><button class="btn small" id="copycode">Copy</button></div>
      <p class="dim">Keep this somewhere safe. If the home-screen app is ever deleted or forgets you, open the app, tap <b>Restore with code</b>, and type it in. Your Shortcut uses it too.</p>
      <label for="rcode">Restore a different code on this device</label>
      <div class="row"><input type="text" id="rcode" maxlength="20" placeholder="e.g. 3YS267ZCSA" autocapitalize="characters" autocomplete="off" style="flex:1;width:auto"><button class="btn" id="rgo">Restore</button></div>
      <div id="rmsg" class="dim" style="margin-top:6px"></div>
    </div>
    <p class="dim">${VERSION}</p>
  `;
  $('#save').addEventListener('click', async () => {
    try { state = await api('/settings', { name: $('#pname').value }); toast('Saved. The Raccoon has updated his notes.'); } catch (e) { toast('Save failed: ' + e.message); }
  });
  $('#pushon').addEventListener('click', enablePush);
  $('#share').addEventListener('click', shareApp);
  $('#copycode').addEventListener('click', async () => { try { await navigator.clipboard.writeText(code); toast('Code copied'); } catch { toast('Copy failed, long-press to select'); } });
  $('#rgo').addEventListener('click', () => restoreCode($('#rcode').value, $('#rmsg')));
  $('#pushtest').addEventListener('click', async () => {
    $('#pushmsg').textContent = 'Sending…';
    try { await api('/test-nudge', {}); $('#pushmsg').textContent = 'Sent. It should pop up in a few seconds.'; }
    catch (e) { $('#pushmsg').textContent = 'Push failed: ' + (e.body?.status ? 'push service said ' + e.body.status + ' ' : '') + (e.body?.detail || e.message); }
  });
}

function b64uToBytes(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
async function enablePush(e, msgEl) {
  const msg = msgEl || $('#pushmsg');
  try {
    const perm = await Notification.requestPermission(); // must be first thing in the tap handler on iOS
    if (perm !== 'granted') { msg.textContent = 'Permission ' + perm + '. You can change it in iPhone Settings → Notifications → Pet Hostage.'; return; }
    msg.textContent = 'Subscribing…';
    const reg = await navigator.serviceWorker.ready;
    const { publicKey } = await (await fetch(WORKER + '/vapid')).json();
    let sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe().catch(() => {});
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(publicKey) });
    await api('/subscribe', { subscription: sub.toJSON() });
    await refresh(true);
    toast('Notifications on. The Raccoon can reach you now.');
    render();
  } catch (e) { msg.textContent = 'Could not enable: ' + e.message; }
}

// ---- multi-player helpers ----
async function shareApp() {
  const data = { title: 'Pet Hostage', text: 'A raccoon in a fedora took a bunny hostage. The ransom is 10,000 steps a day. Get your own hostage:', url: APP_URL };
  try { if (navigator.share) { await navigator.share(data); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(APP_URL); toast('Link copied. Send it to a friend!'); } catch { toast(APP_URL, 6000); }
}
function setCode(c) {
  if (code && code !== c) { const old = JSON.parse(localStorage.getItem('ph.oldCodes') || '[]'); if (!old.includes(code)) localStorage.setItem('ph.oldCodes', JSON.stringify([code, ...old].slice(0, 5))); }
  code = c; localStorage.setItem('ph.code', c); rememberInUrl();
}
async function restoreCode(raw, msgEl) {
  const c = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.length < 6) { msgEl.textContent = 'That code looks too short.'; return; }
  msgEl.textContent = 'Checking…';
  try {
    const r = await fetch(WORKER + '/state?code=' + encodeURIComponent(c) + '&_=' + Date.now(), { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (r.status === 404) { msgEl.textContent = `No game found for ${c}. Check the letters (it's on the Step sync tab and in your Shortcut's URL).`; return; }
    if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status);
    setCode(c); state = j; lastUpdated = Date.now(); welcome = false; unclaimed = false;
    toast(`Welcome back. ${j.hostage.name} missed you.`); go('home');
  } catch (e) { msgEl.textContent = 'Could not reach The Raccoon: ' + e.message; }
}

function renderWelcome(lostCode) {
  const notHome = isIOS && !isStandalone();
  welcome = true; $('#tabs').hidden = true;
  view.innerHTML = `<div class="welcome">
    <canvas id="scene" class="px" width="${VIEW_W}" height="${VIEW_H}"></canvas>
    ${lostCode ? `<p class="hint">This device remembers code <b>${esc(lostCode)}</b>, but The Raccoon has no game under it. Try restoring with your code below.</p>` : ''}
    <p>A raccoon in a fedora has taken a bunny hostage.</p>
    <p class="dim">The ransom: <b>10,000 steps a day</b>, 3 days in a row. Then he grabs someone else. Miss a single day and, well.</p>
    ${notHome ? `<p class="hint">Tip: tap Share → <b>Add to Home Screen</b> first. The home-screen app is the one that can get notifications.</p>` : ''}
    <p><button class="btn acc" id="claim">Accept the terms</button></p>
    <p><button class="btn ghost small" id="showrestore">Already playing? Restore with code</button></p>
    <div class="card" id="restorebox" ${lostCode ? '' : 'hidden'} style="text-align:left">
      <label for="rcode">Your code (Step sync tab, or the code= part of your Shortcut's URL)</label>
      <div class="row"><input type="text" id="rcode" maxlength="20" placeholder="e.g. 3YS267ZCSA" autocapitalize="characters" autocomplete="off" value="${esc(lostCode || '')}" style="flex:1;width:auto"><button class="btn acc" id="rgo">Restore</button></div>
      <div id="rmsg" class="dim" style="margin-top:6px"></div>
    </div>
  </div>`;
  welcomeScene();
  $('#showrestore').addEventListener('click', () => { $('#restorebox').hidden = false; $('#rcode').focus(); });
  $('#rgo').addEventListener('click', () => restoreCode($('#rcode').value, $('#rmsg')));
  $('#claim').addEventListener('click', async () => {
    try { const r = await api('/claim', {}); setCode(r.code); state = r.state; lastUpdated = Date.now(); welcome = false; unclaimed = false; go('sync'); toast('Deal. Now set up step sync.'); }
    catch (e) { toast('Could not reach The Raccoon: ' + e.message); }
  });
}
function welcomeScene() {
  stopAnim();
  const c = $('#scene'), ctx = c.getContext('2d'), t0 = performance.now();
  const loop = now => { if (!c.isConnected || !welcome) return; drawScene(ctx, { mood: 'scared', species: 'bunny', injuries: [] }, (now - t0) / 1000); anim = requestAnimationFrame(loop); };
  anim = requestAnimationFrame(loop);
}

function render() {
  stopAnim();
  $('#tabs').hidden = !state;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  if (tab === 'sync') renderSync(); else if (tab === 'settings') renderSettings(); else if (tab === 'shelf') renderShelf(); else renderHome();
  maybePlayDeath();
}
function go(t) { tab = t; render(); window.scrollTo(0, 0); }
document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));

async function refresh(force) {
  if (DEMO) return;
  if (!code) { state = null; unclaimed = true; return false; } // fresh device: welcome screen
  if (!force && Date.now() - lastFetch < 5000) return;
  lastFetch = Date.now();
  try { state = adoptCode(await api('/state')); lastUpdated = Date.now(); return true; }
  catch (e) {
    // Never forget the code, even if the server doesn't know it: the welcome screen offers to restore it.
    if (e.status === 404 && e.body?.error === 'unknown code') { state = null; unclaimed = true; return false; }
    if (e.status === 400 && e.body?.error === 'code required') { state = null; unclaimed = true; return false; }
    toast('Offline? ' + e.message); return false;
  }
}
// ---- refreshing: button, pull-to-refresh, and on return from Shortcuts ----
function updLabel() {
  if (DEMO) return '';
  if (!lastUpdated) return '';
  const sec = Math.round((Date.now() - lastUpdated) / 1000);
  return sec < 10 ? '· updated just now' : '';
}
setInterval(() => { const u = $('#upd'); if (u && !refreshing) u.textContent = updLabel(); }, 5000);
function spinner(on, text) {
  const p = $('#ptr'); if (!p) return;
  p.classList.toggle('spin', !!on); if (text != null) $('#ptrtext').textContent = text;
  if (on) { p.style.transform = 'translateY(0)'; p.classList.add('show'); }
}
function hideSpinner() { const p = $('#ptr'); p.classList.remove('show', 'spin'); p.style.transform = ''; }
async function doRefresh(why) {
  if (DEMO || refreshing || welcome || !code) return;
  refreshing = true;
  const before = state ? state.todaySteps : null, beforeSync = state ? state.lastSync : null;
  spinner(true, 'Checking with The Raccoon…');
  const u = $('#upd'); if (u) u.textContent = '· updating…';
  const t0 = Date.now();
  const ok = await refresh(true);
  await new Promise(r => setTimeout(r, Math.max(0, 500 - (Date.now() - t0)))); // let the spinner be seen
  refreshing = false; hideSpinner();
  if (pullQueued) { pullQueued = false; return doRefresh('pull'); }
  if (!state) { if (unclaimed) renderWelcome(code || null); return; }
  if (!deathPlaying) {
    if (tab === 'home' || tab === 'shelf') { const y = window.scrollY; render(); window.scrollTo(0, y); }
    else { if ($('#synclog')) $('#synclog').innerHTML = syncLogHtml(state); maybePlayDeath(); }
  }
  const u2 = $('#upd'); if (u2) { u2.textContent = ok ? '· updated just now' : '· could not reach The Raccoon'; u2.classList.add('flash'); setTimeout(() => u2.classList.remove('flash'), 1200); }
  if (ok && state.lastSync !== beforeSync && before != null) toast(state.todaySteps > before ? `+${fmt(state.todaySteps - before)} steps synced` : 'Sync received');
  else if (ok && why !== 'auto') toast('Updated just now', 1400);
}
let returnTimers = [], swReg = null, pullQueued = false;
function onReturn() { // back from Shortcuts after "Sync now": refresh now, then again to catch the sync landing
  if (!state || DEMO || document.visibilityState !== 'visible') return;
  returnTimers.forEach(clearTimeout);
  swReg?.update().catch(() => {}); // pick up a new app shell too
  doRefresh('auto');
  returnTimers = [3000, 8000].map(ms => setTimeout(() => doRefresh('auto'), ms));
}
let lastReturn = 0;
const onReturnOnce = () => { if (Date.now() - lastReturn < 1500) return; lastReturn = Date.now(); onReturn(); };
function setupPull() {
  const p = $('#ptr'), TRIG = 70;
  let y0 = null, dy = 0, pulling = false;
  const atTop = () => (window.scrollY || document.documentElement.scrollTop) <= 0;
  document.addEventListener('touchstart', e => {
    if (!state || $('#overlay') && !$('#overlay').hidden || e.touches.length !== 1 || !atTop()) { y0 = null; return; }
    y0 = e.touches[0].clientY; dy = 0; pulling = false;
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (y0 == null) return;
    dy = e.touches[0].clientY - y0;
    if (dy <= 0 || !atTop()) { if (pulling) { pulling = false; hideSpinner(); } return; }
    pulling = true; e.preventDefault();
    const d = Math.min(110, dy * 0.55);
    p.classList.add('show'); p.style.transform = `translateY(${d - 70}px)`;
    $('#ptrrac').style.transform = `rotate(${Math.round(dy * 2 / 45) * 45}deg)`; // chunky pixel rotation
    $('#ptrtext').textContent = dy * 0.55 > TRIG ? 'Let go to bother The Raccoon' : 'Pull to refresh';
  }, { passive: false });
  document.addEventListener('touchend', () => {
    if (y0 == null) return; y0 = null;
    if (pulling && dy * 0.55 > TRIG) { $('#ptrrac').style.transform = ''; if (refreshing) { pullQueued = true; spinner(true, 'Checking with The Raccoon…'); } else doRefresh('pull'); } else if (!refreshing) hideSpinner();
    pulling = false;
  });
}

function renderOffline() {
  $('#tabs').hidden = true;
  view.innerHTML = `<div class="welcome"><p>Can't reach The Raccoon right now. Your pets are safe on the server.</p><p><button class="btn acc" id="retry">Try again</button></p></div>`;
  $('#retry').addEventListener('click', boot2);
}

function demoState(m) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Vancouver' });
  const day = n => addDay(today, n);
  const hist = [11200, 10400, 8300, 12900, 10100, 10400, 10800, 13100, 9100, 10050, 11800, 11900, 10900];
  const sp = ['bunny', 'hamster', 'squirrel', 'hedgehog', 'kitten', 'duckling', 'piglet', 'panda'], nm = ['Chompsky', 'Nugget', 'Acorn', 'Prickles', 'Mittens', 'Puddles', 'Truffle', 'Bao'];
  const need = r => 3 + 2 * r;
  let rung = 2, streak = 2, inj = { 0: ['pop'], 1: [], 2: ['catapult'] }, todaySteps = 6120, hour = 18, mood = 'worried', lastDeath = null;
  if (m === 'happy') { todaySteps = 10342; mood = 'happy'; hour = 20; }
  if (m === 'stitched') { rung = 0; streak = 1; inj = { 0: ['pop', 'anvil', 'catapult', 'zap'] }; todaySteps = 10120; mood = 'happy'; hour = 20; }
  if (m === 'nosync') { rung = 0; streak = 0; inj = {}; todaySteps = 0; hour = 10; mood = 'happy'; }
  if (m === 'death' || m === 'rekidnap') { rung = 1; streak = 0; inj = { 0: ['pop'], 1: [], 2: ['catapult', qs.get('type') || 'pop'] }; todaySteps = 840; hour = 9; mood = 'happy';
    lastDeath = { id: 3, date: day(-1), rung: 2, name: 'Acorn', species: 'squirrel', type: qs.get('type') || 'pop', deaths: 2, rekidnap: { rung: 1, name: 'Nugget', species: 'hamster', need: 5, same: false } }; }
  if (qs.has('rung')) rung = Math.max(0, Math.min(7, +qs.get('rung') || 0));
  const pet = r => ({ rung: r, name: nm[r], species: sp[r], need: need(r), deaths: (inj[r] || []).length, injuries: inj[r] || [], rescuedOn: r < rung ? day(-30 + r * 9) : null, rescues: 1 });
  const shelf = Array.from({ length: rung }, (_, r) => pet(r));
  const hostage = { ...pet(rung), streak, since: day(-streak), todayMet: todaySteps >= GOAL, day: streak + 1 };
  const top = Math.max(rung, m === 'death' ? 2 : rung) + 1;
  const ladder = Array.from({ length: 8 }, (_, r) => ({ rung: r, need: need(r), species: sp[r], name: nm[r], known: r <= top - 1 || m === 'lineup', status: r < rung ? 'rescued' : r === rung ? 'hostage' : 'locked', deaths: (inj[r] || []).length, injuries: inj[r] || [] }));
  return {
    v: 2, today, hour, goal: GOAL, todaySteps, lastSync: m === 'nosync' ? null : Date.now() - 23 * 60000, lastSteps: todaySteps, started: day(-40),
    hostage, shelf, ladder, mood, lastDeath, deathSeen: 0,
    deathLog: [lastDeath, { id: 2, date: day(-21), rung: 2, name: 'Acorn', species: 'squirrel', type: 'catapult', rekidnap: { name: 'Nugget', same: false } }, { id: 1, date: day(-33), rung: 0, name: 'Chompsky', species: 'bunny', type: 'pop', rekidnap: { name: 'Chompsky', same: true } }].filter(Boolean),
    stats: { metDays: 27, missedDays: 3, rescues: 4 }, push: !qs.has('nopush'),
    days: Array.from({ length: 14 }, (_, i) => ({ date: day(i - 13), steps: i === 13 ? (todaySteps || null) : (m === 'nosync' ? null : hist[i]) })),
  };
}

async function boot2() {
  unclaimed = false;
  await refresh(true);
  if (state) { welcome = false; $('#tabs').hidden = false; render(); }
  else if (unclaimed) renderWelcome(code || null);
  else renderOffline();
}
async function boot() {
  blit($('#ptrrac').getContext('2d'), raccoon(0, -1), 0, 0);
  if ('serviceWorker' in navigator && !DEMO) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => { swReg = r; r.update().catch(() => {}); }).catch(() => {});
  if (DEMO && qs.has('spin')) setTimeout(() => spinner(true, 'Checking with The Raccoon…'), 50);
  if (DEMO) {
    if (DEMO === 'welcome' || DEMO === 'lost') { renderWelcome(DEMO === 'lost' ? 'K7PQ2MXW9A' : null); return; }
    code = 'DEMO123456'; state = demoState(DEMO); tab = qs.get('tab') || (DEMO === 'lineup' ? 'shelf' : 'home'); render();
    if (DEMO === 'death') playDeath(state.lastDeath, qs.has('f') ? +qs.get('f') : undefined);
    if (qs.has('tap')) setTimeout(() => window.__tap(qs.get('tap')), 1200);
    return;
  }
  rememberInUrl();
  await boot2();
  setupPull();
  setInterval(() => { if (state && document.visibilityState === 'visible' && tab === 'home' && !refreshing) doRefresh('auto'); }, REFRESH_MS);
  document.addEventListener('visibilitychange', onReturnOnce);
  window.addEventListener('pageshow', e => { if (e.persisted) onReturnOnce(); });
}
boot();
