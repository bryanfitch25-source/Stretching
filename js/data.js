/* ==========================================================================
   data.js — stretch library, plans, and challenges
   Everything here is static content. No storage or DOM access happens here.
   ========================================================================== */

const AREAS = {
  legs:     { label: 'Legs',      emoji: '🦵', color: '#f97316' },
  shoulders:{ label: 'Shoulders', emoji: '💪', color: '#0ea5a5' },
  back:     { label: 'Back',      emoji: '🧍', color: '#6366f1' },
  hands:    { label: 'Hands & Wrists', emoji: '✋', color: '#ec4899' },
  forearms: { label: 'Forearms',  emoji: '🔪', color: '#eab308' },
  neck:     { label: 'Neck',      emoji: '🙆', color: '#22c55e' },
};

/* Stretch library — chosen for someone on their feet all day chopping,
   lifting pans, and repeating fine wrist motion (a chef's daily grind). */
const STRETCHES = [
  // LEGS
  { id: 'calf-wall', area: 'legs', name: 'Wall Calf Stretch', duration: 30, sides: true,
    emoji: '🦵', desc: 'Hands on a wall, step one foot back with heel flat, lean forward.',
    tip: 'Great after a double shift on tile floors — calves take a beating standing at the line.' },
  { id: 'quad-stretch', area: 'legs', name: 'Standing Quad Stretch', duration: 30, sides: true,
    emoji: '🦵', desc: 'Hold your ankle behind you, knees together, hips pushed forward.',
    tip: 'Use a counter or wall for balance — no need to be fancy on a tired kitchen floor.' },
  { id: 'hamstring-forward-fold', area: 'legs', name: 'Standing Forward Fold', duration: 30, sides: false,
    emoji: '🦵', desc: 'Feet hip-width, hinge forward and let your head and arms hang heavy.',
    tip: 'Bend your knees as much as you need — this is about release, not touching your toes.' },
  { id: 'hip-flexor-lunge', area: 'legs', name: 'Kneeling Hip Flexor Stretch', duration: 30, sides: true,
    emoji: '🦵', desc: 'Half-kneel, tuck your pelvis, and gently shift your weight forward.',
    tip: 'Hip flexors tighten up from hours of standing in one spot at the pass.' },
  { id: 'figure-four', area: 'legs', name: 'Standing Figure-Four', duration: 30, sides: true,
    emoji: '🦵', desc: 'Cross ankle over opposite knee, sit hips back like you\'re sitting in a chair.',
    tip: 'Opens the hip and glute — lean on a wall if balance is tricky.' },
  { id: 'ankle-circles', area: 'legs', name: 'Ankle Circles', duration: 20, sides: true,
    emoji: '🦵', desc: 'Lift one foot, circle the ankle slowly 10 times each direction.',
    tip: 'Quick reset between tickets — keeps ankles loose on hard kitchen mats.' },

  // SHOULDERS
  { id: 'cross-body-shoulder', area: 'shoulders', name: 'Cross-Body Shoulder Stretch', duration: 30, sides: true,
    emoji: '💪', desc: 'Pull one arm across your chest with the other arm, shoulders relaxed.',
    tip: 'Undoes the hunch from working over a low prep station all day.' },
  { id: 'overhead-triceps', area: 'shoulders', name: 'Overhead Triceps Stretch', duration: 30, sides: true,
    emoji: '💪', desc: 'Reach one arm overhead, bend the elbow, gently press with the other hand.',
    tip: 'Counters the strain from lifting stock pots and sheet trays.' },
  { id: 'doorway-chest', area: 'shoulders', name: 'Doorway Chest Opener', duration: 30, sides: false,
    emoji: '💪', desc: 'Forearms on a doorframe, step forward and let your chest open.',
    tip: 'A must after being hunched over the cutting board for hours.' },
  { id: 'shoulder-rolls', area: 'shoulders', name: 'Shoulder Rolls', duration: 20, sides: false,
    emoji: '💪', desc: 'Roll shoulders up, back, and down in a slow circle, 10 times.',
    tip: 'Do this between courses — takes 20 seconds and resets your posture.' },
  { id: 'shoulder-blade-squeeze', area: 'shoulders', name: 'Shoulder Blade Squeeze', duration: 20, sides: false,
    emoji: '💪', desc: 'Draw shoulder blades together and hold, like pinching a pencil between them.',
    tip: 'Fights the forward-rounded posture from plating and prep.' },

  // BACK
  { id: 'cat-cow', area: 'back', name: 'Cat-Cow (standing or on counter)', duration: 30, sides: false,
    emoji: '🧍', desc: 'Hands on a counter, arch and round your spine slowly with your breath.',
    tip: 'Kitchen-friendly version — no floor needed, works right at the pass.' },
  { id: 'seated-spinal-twist', area: 'back', name: 'Seated Spinal Twist', duration: 30, sides: true,
    emoji: '🧍', desc: 'Sit tall, twist your torso toward one side, hold the chair or knee.',
    tip: 'Great on a break — releases the low back after hours of bending over stations.' },
  { id: 'standing-back-extension', area: 'back', name: 'Standing Back Extension', duration: 20, sides: false,
    emoji: '🧍', desc: 'Hands on your lower back, gently lean backward and look up.',
    tip: 'Reverses the forward lean of chopping and stirring.' },
  { id: 'childs-pose', area: 'back', name: "Child's Pose", duration: 40, sides: false,
    emoji: '🧍', desc: 'Kneel, sit back on your heels, reach arms forward and relax.',
    tip: 'Best done at home post-shift — deep release for the whole back.' },
  { id: 'knee-to-chest', area: 'back', name: 'Knee-to-Chest Stretch', duration: 30, sides: true,
    emoji: '🧍', desc: 'Lying or standing, pull one knee toward your chest and hold.',
    tip: 'Eases low-back tightness from standing on hard floors all day.' },

  // HANDS & WRISTS
  { id: 'wrist-flexor', area: 'hands', name: 'Wrist Flexor Stretch', duration: 20, sides: true,
    emoji: '✋', desc: 'Arm out, palm up, gently pull fingers back toward you.',
    tip: 'Directly counters knife-grip strain — do this after every prep session.' },
  { id: 'wrist-extensor', area: 'hands', name: 'Wrist Extensor Stretch', duration: 20, sides: true,
    emoji: '✋', desc: 'Arm out, palm down, gently press the back of your hand down and in.',
    tip: 'Balances out the flexor stretch — key for knife hands and whisking arms.' },
  { id: 'finger-spreads', area: 'hands', name: 'Finger Spreads & Fists', duration: 20, sides: false,
    emoji: '✋', desc: 'Spread fingers wide, hold, then make a tight fist. Repeat 8 times.',
    tip: 'Fights the claw-grip stiffness from hours holding a chef\'s knife.' },
  { id: 'prayer-stretch', area: 'hands', name: 'Prayer Stretch', duration: 25, sides: false,
    emoji: '✋', desc: 'Palms together at chest height, lower hands while keeping palms touching.',
    tip: 'Deep wrist stretch — great before service to warm up for fine knife work.' },
  { id: 'thumb-stretch', area: 'hands', name: 'Thumb Extension Stretch', duration: 15, sides: true,
    emoji: '✋', desc: 'Wrap fingers around thumb, gently bend wrist toward pinky side.',
    tip: 'Targets the pinch grip used constantly for peeling and plating.' },

  // FOREARMS
  { id: 'forearm-flex-roll', area: 'forearms', name: 'Forearm Rolls', duration: 20, sides: false,
    emoji: '🔪', desc: 'Extend both arms, roll fists forward then backward slowly 10 times.',
    tip: 'Loosens up forearms after repetitive chopping motions.' },
  { id: 'reverse-prayer', area: 'forearms', name: 'Reverse Prayer Stretch', duration: 25, sides: false,
    emoji: '🔪', desc: 'Backs of hands together behind your back, fingers pointing up.',
    tip: 'Deep forearm and wrist release — good end-of-shift move.' },
  { id: 'forearm-massage-grip', area: 'forearms', name: 'Self Forearm Squeeze', duration: 30, sides: true,
    emoji: '🔪', desc: 'Grip and gently squeeze along your opposite forearm from wrist to elbow.',
    tip: 'Works like a mini self-massage to release tight knife-hand muscles.' },
  { id: 'wrist-circles', area: 'forearms', name: 'Wrist Circles', duration: 15, sides: false,
    emoji: '🔪', desc: 'Circle both wrists slowly, 10 times each direction.',
    tip: 'Do this between tickets to keep wrists from locking up.' },

  // NECK (bonus area — chefs crane necks reading tickets and ovens)
  { id: 'neck-side-tilt', area: 'neck', name: 'Neck Side Tilt', duration: 20, sides: true,
    emoji: '🙆', desc: 'Ear toward shoulder, gentle hold, feel the stretch along the side of the neck.',
    tip: 'Relieves tension from looking down at tickets and cutting boards.' },
  { id: 'chin-tuck', area: 'neck', name: 'Chin Tucks', duration: 20, sides: false,
    emoji: '🙆', desc: 'Gently draw your chin straight back, like making a double chin. Hold and release.',
    tip: 'Counters "ticket neck" from hours hunched over the pass.' },
  { id: 'neck-rotation', area: 'neck', name: 'Slow Neck Rotation', duration: 20, sides: false,
    emoji: '🙆', desc: 'Slowly turn your head side to side, look over each shoulder.',
    tip: 'Keeps your neck mobile for scanning a busy kitchen line.' },
];

function getStretch(id) { return STRETCHES.find(s => s.id === id); }
function stretchesByArea(area) { return STRETCHES.filter(s => s.area === area); }

/* Weekly plan — one focus theme per day so the whole body gets covered
   over 7 days without any single session feeling huge. */
const WEEKLY_PLAN = [
  { day: 0, name: 'Sunday Reset', theme: 'Full-Body Recovery', areas: ['back', 'neck', 'legs'],
    stretchIds: ['childs-pose', 'cat-cow', 'hamstring-forward-fold', 'neck-rotation', 'ankle-circles'] },
  { day: 1, name: 'Monday Line-Up', theme: 'Legs & Feet', areas: ['legs'],
    stretchIds: ['calf-wall', 'quad-stretch', 'hamstring-forward-fold', 'ankle-circles'] },
  { day: 2, name: 'Tuesday Prep', theme: 'Hands & Wrists', areas: ['hands', 'forearms'],
    stretchIds: ['wrist-flexor', 'wrist-extensor', 'finger-spreads', 'prayer-stretch', 'wrist-circles'] },
  { day: 3, name: 'Wednesday Service', theme: 'Shoulders & Back', areas: ['shoulders', 'back'],
    stretchIds: ['cross-body-shoulder', 'doorway-chest', 'cat-cow', 'shoulder-blade-squeeze'] },
  { day: 4, name: 'Thursday Grind', theme: 'Forearms & Grip', areas: ['forearms', 'hands'],
    stretchIds: ['forearm-flex-roll', 'reverse-prayer', 'forearm-massage-grip', 'thumb-stretch'] },
  { day: 5, name: 'Friday Rush', theme: 'Neck & Back', areas: ['neck', 'back'],
    stretchIds: ['chin-tuck', 'neck-side-tilt', 'standing-back-extension', 'seated-spinal-twist'] },
  { day: 6, name: 'Saturday Double', theme: 'Full Body', areas: ['legs', 'shoulders', 'back', 'hands'],
    stretchIds: ['calf-wall', 'cross-body-shoulder', 'knee-to-chest', 'wrist-flexor', 'shoulder-rolls'] },
];

function todaysPlan(date = new Date()) { return WEEKLY_PLAN[date.getDay()]; }

/* Monthly challenges — rotate through goals that build a real habit
   without being punishing. Picked by month index, repeats yearly. */
const MONTHLY_CHALLENGES = [
  { id: 'consistency-15', title: '15-Day Momentum', goalType: 'daysStretched', target: 15,
    desc: 'Stretch on 15 days this month — misses are fine, just keep showing up.', reward: '🥉 Bronze Momentum Badge' },
  { id: 'consistency-20', title: '20-Day Habit Builder', goalType: 'daysStretched', target: 20,
    desc: 'Stretch on 20 days this month to really lock in the habit.', reward: '🥈 Silver Habit Badge' },
  { id: 'all-areas', title: 'Full Coverage', goalType: 'areasCovered', target: 6,
    desc: 'Hit every focus area (legs, shoulders, back, hands, forearms, neck) at least once this month.', reward: '🎯 Full Coverage Badge' },
  { id: 'minutes-60', title: '60-Minute Club', goalType: 'totalMinutes', target: 60,
    desc: 'Bank 60 total minutes of stretching this month.', reward: '⏱️ 60-Minute Club Badge' },
  { id: 'consistency-25', title: '25-Day Dedication', goalType: 'daysStretched', target: 25,
    desc: 'Stretch on 25 days this month — near-daily dedication.', reward: '🥇 Gold Dedication Badge' },
  { id: 'minutes-100', title: '100-Minute Club', goalType: 'totalMinutes', target: 100,
    desc: 'Bank 100 total minutes of stretching this month.', reward: '🏆 100-Minute Club Badge' },
];

function monthlyChallengeFor(date = new Date()) {
  return MONTHLY_CHALLENGES[date.getMonth() % MONTHLY_CHALLENGES.length];
}

/* Badges unlocked by streak length */
const STREAK_BADGES = [
  { days: 3, emoji: '🔥', label: 'Spark' },
  { days: 7, emoji: '🔥', label: 'One Week Fire' },
  { days: 14, emoji: '🔥', label: 'Two-Week Blaze' },
  { days: 30, emoji: '🔥', label: 'Monthly Inferno' },
  { days: 60, emoji: '🔥', label: 'Unstoppable' },
  { days: 100, emoji: '🔥', label: 'Century Streak' },
  { days: 365, emoji: '🔥', label: 'Full Year Legend' },
];

/* Encouraging, kitchen-flavored messages shown after completing a session */
const ENCOURAGEMENTS = [
  "That's mise en place for your body. Nice work.",
  "Order up — one stretch session, done right.",
  "Your hands say thank you. So does your back.",
  "Small moves, big difference. See you tomorrow.",
  "You just bought your knees a little more mileage.",
  "That's how you stay sharp for the whole shift, not just the first hour.",
  "Loosened up and ready for the rush.",
  "Solid. Your body's the most important tool in the kitchen — treat it that way.",
  "Nice reset. Fewer aches tonight.",
  "That's a habit worth keeping on the line.",
];

function randomEncouragement() {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
}
