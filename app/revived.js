// v0.4.9: lines for revived pets (deaths > 0). The pet remembers; The Raccoon gloats. Used by tap bubbles (app) and nudges (worker).
// This exact file is copied to app/revived.js (a test checks they match). Pure: no imports.
// Placeholders: {name} {left} {steps} {goal} {dish} {how} {patch} {deaths} {next}
export const REVIVED_WEIGHT = 0.6; // share of picks drawn from these pools when deaths > 0
export const HOW = { pop: 'the head pop', anvil: 'the anvil', catapult: 'the catapult', zap: 'the zap' };
export const PATCH = { pop: 'stitches', anvil: 'bandages', catapult: 'eye-patch straps', zap: 'band-aids' };
export const REVIVED = {
  pet: {
    1: [
      "Hi. Remember me? You let me die once. Just once. So far. {left} steps?",
      "My {patch} itch when you sit down. Weird, right? {left} steps.",
      "I'm not saying I don't trust you. I'm saying I have {patch} now.",
      "Last time ended with {how}. Let's skip the sequel. {left} to go.",
      "I forgave you. My {patch} didn't. Walk {left}!",
      "The doctor said no stress. The doctor hasn't met you. {left} steps!",
      "I came back from the dead for THIS? Walk, please.",
      "Every time you sit, I hear {how} again. {left} steps.",
      "I had a whole afterlife going. Walk {left} like you mean it.",
      "Fool me once, shame on you. Fool me twice, I'm {dish}.",
      "Trust is earned. In steps. {left} of them.",
      "My diary today: 'still alive?' Help me finish the entry.",
      "Fun fact: {patch} are not a fashion choice. Walk!",
      "I'm fine. Totally fine. *twitch* {left} steps.",
      "You said 'never again'. I wrote it down. {left} steps.",
      "Being dead was chilly. Alive is nicer. Choose nice. {left}!",
      "I have a scar with your name on it. Metaphorically. Mostly.",
      "Don't stare at my {patch}. Stare at your step count. It's low.",
    ],
    2: [
      "Died twice. Same raccoon. Same human. Hmm. {left} steps.",
      "I'm more patch than pet at this point. {left} steps!",
      "Two deaths. I started a support group. It's just me. {left}.",
      "Every night I dream about {how}. Every night. {left} steps.",
      "I see a pot and my life flashes before my eyes. Both lives.",
      "Twice! You let me die TWICE! I'm not mad. I'm a little mad.",
      "My therapist is the raccoon. It's not going well. {left} steps.",
      "I'm held together by thread and hope. Mostly thread.",
      "The second time hurt more. Like, physically. {left} to go.",
      "I flinch at the word 'couch' now. Thanks. {left} steps.",
      "Déjà vu is less fun when it's death. Walk {left}!",
      "I don't need a sorry. I need {left} steps.",
      "I've died more than I've been rescued. Fix that.",
      "My {patch} are writing you a strongly worded letter. Walk!",
      "Two funerals. Zero walks. Let's change one number.",
      "Remember {how}? I do. Constantly. {left} steps.",
      "I set alarms for your walks. You hit snooze on my life.",
      "Second life, same couch. Get up. {left} steps.",
    ],
    3: [
      "Death #{deaths} was fun. Kidding. It wasn't. {left} steps.",
      "I've died {deaths} times. I have a punch card now. Walk!",
      "I'm a patchwork quilt with a face now. {left} steps.",
      "The afterlife knows me by name. They saved my seat.",
      "{deaths} deaths. You'd think I'd stop trusting you. Almost.",
      "I'm 40% {patch}. The rest is anxiety. {left} steps.",
      "I made a will. You're not in it. Walk {left} and we'll talk.",
      "I died {deaths} times and all I got were these scars.",
      "My ghost and I share a calendar now. {left} steps.",
      "I don't panic anymore. I just sigh. Loudly. {left} to go.",
      "Even the raccoon looks tired of this. {left} steps, please.",
      "One more death and I get a free coffee. I don't want it.",
      "I've seen the light {deaths} times. Overrated. Walk!",
      "Please. I'm running out of places to put stitches.",
      "I've stopped asking for much. Just {left} steps. And love.",
      "I'm mostly thread now. The tooth fairy won't visit.",
      "Death #{deaths}? Let's not find out what #{next} is like.",
      "{deaths} lives used up. Spend some steps on me. {left}.",
    ],
  },
  raccoon: {
    1: [
      "Déjà vu, {name}? I kept the pot warm.",
      "Welcome back! Same pot. Same human. Same result?",
      "Nice stitch job. Who did it? Oh right. Me.",
      "Last time: {how}. This time: {dish}. Variety!",
      "I saved your seat in the pot, {name}.",
      "Back from the dead? Great. Fresh ingredients.",
      "They always come back. Like leftovers.",
      "Second helping, coming up. {left} steps? Sure.",
      "I remember {how}. Good times. For me.",
      "Your human failed once. Humans love a rerun.",
      "I sewed {name} up myself. Cheap thread. Very cheap.",
      "Reheated {name}. Tastier the second time.",
      "Did you miss me? I missed {name}. In my belly.",
      "Ah, a returning customer. Loyalty card stamped.",
      "Don't worry, I didn't change the recipe.",
      "{left} steps again? You couldn't do it last time.",
      "I framed a picture of {how}. It's in the hallway.",
      "Back already? I barely washed the pot.",
    ],
    2: [
      "Twice dead. Once more and it's a tradition.",
      "I get a frequent-diner discount on {name} now.",
      "Two times! You two are my favorite regulars.",
      "My stitching's getting better. I've had practice.",
      "Déjà vu again? Déjà stew.",
      "The pot remembers {name}. It's sentimental.",
      "I didn't even put the spoon away. Saved time.",
      "Two funerals. I wore the same apron to both.",
      "That neck is held on by hope and dental floss.",
      "Round three soon? I'll bring snacks.",
      "I named the pot after {name}. Only fair.",
      "Stitch, stitch, pop. My favorite song.",
      "Your track record is my meal plan.",
      "My cookbook: {name} is chapters one AND two.",
      "Once is an accident. Twice is a menu.",
      "{left} steps? Ha. History says otherwise.",
      "Recurring customer! I'll get your usual table.",
      "I barely had to re-season the pot.",
    ],
    3: [
      "Death #{deaths}! I'm having a commemorative mug made.",
      "{deaths} times. At this point it's a subscription.",
      "I'm out of thread, {name}. Next time I use tape.",
      "The undertaker sends me a fruit basket now.",
      "{name} has more stitches than a baseball.",
      "Your human is my best supplier. {deaths} deliveries.",
      "Punch card for {name}: one more and the soup's free.",
      "Honestly, I'm impressed you keep coming back.",
      "I don't even preheat anymore. It just stays hot.",
      "The pot has a {name}-shaped dent now.",
      "Death #{next} coming right up. I can feel it.",
      "I've stopped writing new recipes. Why bother?",
      "Your human's legs: retired. My pot: employee of the month.",
      "Hall of fame: {name}, {deaths} entries.",
      "I keep a seat warm. And a pot. Mostly the pot.",
      "Even my stitches have stitches. Your fault.",
      "Another one? I'll need a bigger scrapbook.",
      "Loyal customer, {name}. {deaths} visits. Platinum tier.",
    ],
  },
  // final day (day N of N) for a pet that has died before: it has been here before
  final: {
    pet: [
      "This looks familiar. I hate that. {left} steps!",
      "I've been in this spot before. The view hasn't improved.",
      "My {patch} are coming loose. NOT ideal. {left}!",
      "Last final day ended badly. Let's do the other ending.",
      "I can hear my stitches popping. {left} steps, FAST.",
      "Been here. Died here. Would rather not repeat. Walk!",
      "My neck is down to one thread. One. {left} steps.",
      "I'm calm. I'm calm. Something just went 'pop'.",
      "{goal} today. I'm worth it. Probably. {left} to go!",
      "Remember last time? I blocked it out. Walk!",
    ],
    raccoon: [
      "Familiar? I kept it just the way you left it.",
      "Stitches popping already. I barely started, {name}.",
      "Final day again. Last time was delicious.",
      "I measured the thread. It'll hold. Probably not.",
      "Same setup, same human. I love a classic.",
      "{left} steps? You choked last time. Choke again.",
      "Hear that? That's your neck giving up, {name}.",
      "I sharpened the scissors for those stitches.",
      "Last time you got close. Close doesn't count.",
      "Déjà vu, final day edition. Tickets sold out.",
    ],
  },
  species: {
    bunny: { pet: ["My ears survived {how}. My trust didn't. {left} steps!", "I can hop away from anything except your couch.", "Lucky rabbit's foot? Didn't work last time. Walk!"],
      raccoon: ["Hare today, gone tomorrow. Again.", "Bunny soup, the sequel. Now with stitches.", "I kept the carrots from last time."] },
    hamster: { pet: ["I ran my wheel all night. You couldn't walk one day. Hm.", "My cheeks still hold the trauma. And seeds.", "Tiny body, huge grudge. {left} steps."],
      raccoon: ["Re-skewered and ready, {name}.", "Pocket-sized and back for seconds.", "Your wheel spins. Your human doesn't."] },
    squirrel: { pet: ["I buried my trust like an acorn. Can't find it now.", "I hoarded nuts. You hoarded couch time. Walk!", "My tail is still puffed from last time."],
      raccoon: ["Pot pie, round two. Flakier crust.", "I saved your acorns. They're the garnish.", "Back for another nutty ending?"] },
    hedgehog: { pet: ["I curl up at loud noises now. Thanks to you.", "My spines grew back. My faith didn't. {left} steps.", "I'm prickly about last time. Understandably."],
      raccoon: ["Crisps, take two. Extra crunchy.", "Even your spines need stitches now.", "Rolling up won't save you twice."] },
    kitten: { pet: ["Nine lives. You've used {deaths}. Not great math.", "I land on my feet. You land on the couch.", "I purr out of nervousness now. Always."],
      raccoon: ["Life #{next} coming up, kitty.", "Casserole leftovers. Reheated.", "Curiosity didn't kill you. Your human did."] },
    duckling: { pet: ["I imprinted on you. Then you let me die. Awkward.", "My feathers grew back weird. Walk {left}!", "Peep. That's duck for 'not again'."],
      raccoon: ["The orange sauce is still in the fridge.", "Duck à l'orange: the encore.", "Waddle back in, {name}. You know the way."] },
    piglet: { pet: ["I'm not bacon. I was, briefly. Never again. Walk!", "My curly tail went straight from stress.", "This little piggy has been through things. {left}."],
      raccoon: ["Bacon, reheated. Still crispy.", "Snout to tail, stitch by stitch.", "The syrup's been waiting, {name}."] },
    panda: { pet: ["Endangered AND repeatedly dead. Rough year.", "I rolled down a hill to forget. Didn't work.", "My eye patches are darker now. From worry."],
      raccoon: ["Dumplings, the sequel. Same steamer.", "Endangered? You're on my menu twice.", "Back in the basket, {name}."] },
    capybara: { pet: ["Still calm. Calmly holding a grudge. {left} steps.", "Even my chill has scar tissue now.", "The hot spring and I have history. Bad history."],
      raccoon: ["Hot pot, reheated. {name} soaks it up.", "Still calm, {name}? Even after last time?", "I kept the yuzu. Saved a slot for you."] },
  },
};
export const tierOf = deaths => Math.max(1, Math.min(3, deaths | 0));
// how/patch from the most recent death (injuries are appended per death)
export function revivedVars(injuries = [], deaths = 0) {
  const last = (injuries || [])[(injuries || []).length - 1];
  return { how: HOW[last] || 'the accident', patch: PATCH[last] || 'stitches', deaths: String(deaths), next: String((deaths | 0) + 1) };
}
export function revivedPool(who, species, deaths, final = false) {
  if (!(deaths > 0)) return [];
  const pool = [...REVIVED[who][tierOf(deaths)], ...((REVIVED.species[species] || {})[who] || [])];
  if (final) pool.push(...REVIVED.final[who], ...REVIVED.final[who]); // final day: lean on the been-here-before lines
  return pool;
}
// null = use the normal pools
export function maybeRevived(who, species, deaths, final, rand = Math.random) {
  if (!(deaths > 0) || rand() >= REVIVED_WEIGHT) return null;
  const pool = revivedPool(who, species, deaths, final);
  return pool[Math.floor(rand() * pool.length)];
}
