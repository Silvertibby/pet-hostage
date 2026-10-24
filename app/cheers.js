// v0.5.8 friend cheers (1,000 Spare Steps each): preset picks only (no free text). This exact file is copied to app/cheers.js (a test checks they match).
export const CHEER_COST = 1000;
export const CHEER_DAILY_MAX = 3; // per friend per day (PT)
export const CHEERS = [
  { id: 'go', text: '📣 You got this!' },
  { id: 'heart', text: '💖 Rooting for you!' },
  { id: 'walk', text: '🏃 Walk walk walk!' },
  { id: 'star', text: '⭐ So proud of you!' },
  { id: 'fire', text: '🔥 Crush that goal!' },
  { id: 'paws', text: '🐾 Your pet believes in you!' },
];
export const cheerById = id => CHEERS.find(c => c.id === id) || null;
export const DISPLAY_NAME_MAX = 20;
export const cleanName = s => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, DISPLAY_NAME_MAX);
// v0.6.0 automatic replies (free, sent by the game): the cheered friend's outcome that day. Picked by the server, shown by id.
export const WIN_LINES = [
  { id: 'w1', text: "🎉 Made it! Couldn't have done it without your cheer." },
  { id: 'w2', text: '🐾 Goal hit. Your encouragement carried me over the line.' },
  { id: 'w3', text: '💖 Done! That cheer was the push I needed.' },
  { id: 'w4', text: '🏁 Made it. Honestly, your cheer got me out the door.' },
  { id: 'w5', text: "🎈 Goal reached. You're the reason the pet is safe tonight." },
  { id: 'w6', text: "🧡 Crossed the line thanks to you." },
  { id: 'w7', text: '🌟 Made it! Your cheer was worth every step.' },
  { id: 'w8', text: "🐹 Goal done. Your cheer got these tiny paws moving." },
  { id: 'w9', text: '🎊 Did it! Your encouragement got me over the hump.' },
  { id: 'w10', text: "🥕 Made it. Your nudge was exactly what I needed." },
  { id: 'w11', text: '☕ Goal hit. Your cheer beat any coffee today.' },
  { id: 'w12', text: "🦝 The Raccoon is sulking, and it's your fault. Thank you!" },
  { id: 'w13', text: '🔑 Made it. Your cheer was the key to the cage.' },
  { id: 'w14', text: '👟 Goal done. I walked those last steps for you.' },
  { id: 'w15', text: '🌈 Made it! Your cheer turned the whole day around.' },
  { id: 'w16', text: "🐿️ Goal reached. Your cheer got me over the hump." },
  { id: 'w17', text: '💪 Did it. Your encouragement did the heavy lifting.' },
  { id: 'w18', text: "🎀 Made it. Your encouragement tipped the scales." },
  { id: 'w19', text: '🍀 Goal hit. Lucky me to have a friend like you.' },
  { id: 'w20', text: '🔥 Made it! Your cheer lit a fire under me.' },
  { id: 'w21', text: '🧸 Goal done. One very relieved pet thanks you.' },
  { id: 'w22', text: '📣 Heard your cheer and kept walking. Made it!' },
  { id: 'w23', text: '🌙 Made it before midnight, thanks to you.' },
  { id: 'w24', text: "🎵 Goal hit. Your cheer played in my head all walk." },
  { id: 'w25', text: "🍪 Made it. Your cheer earned you a cookie. Several." },
  { id: 'w26', text: '🐣 Goal reached. The little one is safe, thanks to you.' },
  { id: 'w27', text: '🌻 Did it! Your encouragement made the steps feel lighter.' },
  { id: 'w28', text: '🛡️ Made it. Your cheer was my shield against the couch.' },
  { id: 'w29', text: '🎯 Goal hit. Your cheer kept me on target.' },
  { id: 'w30', text: '🧭 Made it. Your cheer pointed me the right way.' },
  { id: 'w31', text: "🥳 Done! Couldn't have pulled it off without you." },
  { id: 'w32', text: "🐼 Goal reached. Couldn't have finished without your push." },
  { id: 'w33', text: "💌 Made it. This one's dedicated to you." },
  { id: 'w34', text: "🚶 Your cheer made every step easier. Made it!" },
  { id: 'w35', text: '🏆 Goal hit. Half this trophy is yours.' },
  { id: 'w36', text: "🌤️ Made it. Your cheer brightened a slow day." },
  { id: 'w37', text: "🐷 Goal done. Your cheer kept me going." },
  { id: 'w38', text: '🍯 Made it! Your encouragement was pure honey.' },
  { id: 'w39', text: "🦔 Goal reached. Your words got me past the wall." },
  { id: 'w40', text: '🎶 Made it. Your cheer was my walking soundtrack.' },
  { id: 'w41', text: '🧩 Goal hit. Your cheer was the missing piece.' },
  { id: 'w42', text: "🐱 Made it. Your cheer got me off the couch." },
  { id: 'w43', text: "⛅ Didn't feel like walking until your cheer. Made it!" },
  { id: 'w44', text: "🦆 Goal done. Your encouragement made the difference." },
  { id: 'w45', text: '🍊 Made it! Sweet as marmalade, just like your cheer.' },
  { id: 'w46', text: '🫶 Goal reached. Your encouragement meant a lot.' },
  { id: 'w47', text: '🌠 Made it. Wishing on your cheer worked.' },
  { id: 'w48', text: "🐾 Goal hit. Paw-sitively couldn't have done it alone." },
  { id: 'w49', text: '🎁 Made it. Your cheer was the best gift today.' },
  { id: 'w50', text: '🧗 Goal done. You helped me climb that last hill.' },
  { id: 'w51', text: '✨ Made it! The cage is open and you get the credit.' },
  { id: 'w52', text: "🐰 Goal reached. You cheered, I hopped. Thank you!" },
];
export const MISS_LINES = [
  { id: 'm1', text: '🕯️ Missed it. Light a candle.' },
  { id: 'm2', text: '🦝 The Raccoon collected. Oops.' },
  { id: 'm3', text: '🩹 Fell short. Fetch the stitches.' },
  { id: 'm4', text: "💀 Didn't make it. Moment of silence." },
  { id: 'm5', text: '🌧️ Missed it. The Raccoon is smug about it.' },
  { id: 'm6', text: '🪦 Fell short. Flowers appreciated.' },
  { id: 'm7', text: "🧵 Didn't make it. Back to the stitching table." },
];
export const replyLine = (kind, id) => (kind === 'win' ? WIN_LINES : MISS_LINES).find(l => l.id === id) || null;

// v0.7.8 Premium Cheer: only on a friend's 15k+ day (mini boss / final). Sender's steps are sunk; the friend
// claims half after hitting that day's goal (15k or 20k, v0.8.0) (tap to claim, never auto). Expires at midnight PT.
export const PREMIUM_GOAL = 15000; // eligibility minimum; the claim uses the day's actual goal
export const PREMIUM_TIERS = { p: { icon: '⭐', label: 'Premium', cost: 5000, reward: 2500 }, mega: { icon: '🌟', label: 'Mega', cost: 10000, reward: 5000 } };
export const PREMIUM_RECENT = 6; // don't repeat the last few lines a player got, per tier
export const PREMIUM_LINES = {
  p: [
    { id: 'p1', text: '⭐ Boss day. Boss energy. Go.' },
    { id: 'p2', text: '⭐ 15k? You eat 15k for breakfast.' },
    { id: 'p3', text: '⭐ Lace up. Raccoon down.' },
    { id: 'p4', text: '⭐ Big day, bigger legs.' },
    { id: 'p5', text: "⭐ I paid for this. Don't waste it." },
    { id: 'p6', text: '⭐ Walk like the pet owes you money.' },
    { id: 'p7', text: '⭐ Every step is a punch in the raccoon.' },
    { id: 'p8', text: '⭐ 15,000. Not one fewer. Go.' },
    { id: 'p9', text: '⭐ Out the door. Now. Love you.' },
    { id: 'p10', text: '⭐ The couch is lying to you.' },
    { id: 'p11', text: '⭐ This is your montage. Move.' },
    { id: 'p12', text: '⭐ Stomp it. Stomp all of it.' },
  ],
  mega: [
    { id: 'm1', text: '🌟 MEGA CHEER. NO EXCUSES. 15,000 OR BUST.' },
    { id: 'm2', text: '🌟 I bet 10,000 steps on you. Make me rich in pride.' },
    { id: 'm3', text: '🌟 Boss fight. Final round. Legs of steel. GO.' },
    { id: 'm4', text: '🌟 The raccoon is shaking. Make him shake harder.' },
    { id: 'm5', text: '🌟 Walk so hard the sidewalk files a complaint.' },
    { id: 'm6', text: '🌟 LEGEND MODE ON. 15K. TODAY. YOU.' },
    { id: 'm7', text: '🌟 Ten thousand of my steps say you crush this.' },
    { id: 'm8', text: '🌟 Thunder legs. Lightning feet. Storm the cage.' },
    { id: 'm9', text: '🌟 Go full hero. Cape optional. Steps mandatory.' },
    { id: 'm10', text: '🌟 MAXIMUM CHEER. Leave the boss in the dust.' },
  ],
};
export const premiumLine = (tier, id) => (PREMIUM_LINES[tier] || []).find(l => l.id === id) || null;

// v0.7.8 Achievements: earned automatically, paid only when the player taps Claim. Each pays once.
export const ACHIEVEMENTS = [
  ...Array.from({ length: 10 }, (_, i) => ({ id: 'r' + (i + 1), icon: '🏆', label: `Rescue #${i + 1}`, amount: (i + 1) * 1000 })),
  { id: 's15', icon: '🔥', label: '15k × 3 days', amount: 5000 },
  { id: 's20', icon: '🔥', label: '20k × 3 days', amount: 10000 },
  { id: 's25', icon: '🔥', label: '25k × 3 days', amount: 20000 },
];
export const achById = id => ACHIEVEMENTS.find(a => a.id === id) || null;
