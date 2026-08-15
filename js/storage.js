/* ==========================================================================
   storage.js — localStorage-backed state. All persistence lives here so the
   app keeps working fully offline and never touches a server.
   ========================================================================== */

const STORAGE_KEY = 'stretchline:v1';

const DEFAULT_STATE = {
  completions: {},      // { "YYYY-MM-DD": { minutes, areas: [], stretchIds: [], sessions: n } }
  streak: { current: 0, longest: 0, lastDate: null, freezesAvailable: 0, freezesUsedDates: [] },
  unlockedBadges: [],    // streak day-thresholds already celebrated
  settings: { sound: true, haptics: true },
  claimedChallenges: [], // "YYYY-MM:challengeId"
  onboarded: false,
  createdAt: new Date().toISOString(),
};

function pad2(n) { return String(n).padStart(2, '0'); }
function dateKey(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function monthKey(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; }
function daysBetween(a, b) {
  const ms = 24 * 60 * 60 * 1000;
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((db - da) / ms);
}

const Store = (() => {
  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredCloneSafe(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      // shallow-merge with defaults so new fields introduced later don't break old saves
      return {
        ...structuredCloneSafe(DEFAULT_STATE),
        ...parsed,
        streak: { ...DEFAULT_STATE.streak, ...(parsed.streak || {}) },
        settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
        completions: parsed.completions || {},
        unlockedBadges: parsed.unlockedBadges || [],
        claimedChallenges: parsed.claimedChallenges || [],
        onboarded: !!parsed.onboarded,
      };
    } catch (e) {
      console.warn('StretchLine: could not read saved data, starting fresh.', e);
      return structuredCloneSafe(DEFAULT_STATE);
    }
  }

  function structuredCloneSafe(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('StretchLine: failed to save. Storage may be full or unavailable.', e);
    }
  }

  function getState() { return state; }

  function recordSession({ stretchIds, areas, seconds }) {
    const now = new Date();
    const key = dateKey(now);
    const minutes = seconds / 60;

    if (!state.completions[key]) {
      state.completions[key] = { minutes: 0, areas: [], stretchIds: [], sessions: 0 };
    }
    const day = state.completions[key];
    day.minutes += minutes;
    day.sessions += 1;
    day.stretchIds = Array.from(new Set([...day.stretchIds, ...stretchIds]));
    day.areas = Array.from(new Set([...day.areas, ...areas]));

    updateStreak(now);
    persist();
    return getState();
  }

  function updateStreak(now) {
    const s = state.streak;
    const todayKey = dateKey(now);

    if (s.lastDate === todayKey) {
      // already logged today, streak unchanged
      return;
    }

    if (!s.lastDate) {
      s.current = 1;
    } else {
      const last = new Date(s.lastDate);
      const gap = daysBetween(last, now);
      if (gap === 1) {
        s.current += 1;
      } else if (gap > 1) {
        const missedDays = gap - 1;
        if (s.freezesAvailable >= missedDays) {
          s.freezesAvailable -= missedDays;
          s.freezesUsedDates.push(...Array.from({ length: missedDays }, (_, i) => {
            const d = new Date(last);
            d.setDate(d.getDate() + i + 1);
            return dateKey(d);
          }));
          s.current += 1;
        } else {
          s.current = 1; // streak broken, restart
        }
      }
      // gap === 0 shouldn't happen since lastDate !== todayKey guarded above
    }

    s.lastDate = todayKey;
    s.longest = Math.max(s.longest, s.current);

    // earn a streak freeze every 10-day milestone
    if (s.current > 0 && s.current % 10 === 0) {
      s.freezesAvailable = Math.min(3, s.freezesAvailable + 1);
    }
  }

  /** Streak as of right now, accounting for a missed day that hasn't broken it yet
      but will show as "at risk" in the UI (does not mutate state). */
  function currentStreakInfo() {
    const s = state.streak;
    if (!s.lastDate) return { current: 0, atRisk: false };
    const gap = daysBetween(new Date(s.lastDate), new Date());
    if (gap <= 0) return { current: s.current, atRisk: false };
    if (gap === 1) return { current: s.current, atRisk: true }; // stretch today or lose it
    // more than 1 day passed without logging — streak will reset on next session
    // unless freezes cover it; reflect that optimistically but flag heavily at risk
    const missed = gap - 1;
    if (s.freezesAvailable >= missed) return { current: s.current, atRisk: true };
    return { current: 0, atRisk: false, broken: true };
  }

  function completionsForMonth(date) {
    const mk = monthKey(date);
    return Object.entries(state.completions).filter(([k]) => k.startsWith(mk));
  }

  function totalStats() {
    const entries = Object.entries(state.completions);
    const totalMinutes = entries.reduce((sum, [, v]) => sum + v.minutes, 0);
    const totalSessions = entries.reduce((sum, [, v]) => sum + v.sessions, 0);
    const totalDays = entries.length;
    return { totalMinutes, totalSessions, totalDays };
  }

  function claimChallenge(id) {
    const key = `${monthKey(new Date())}:${id}`;
    if (!state.claimedChallenges.includes(key)) {
      state.claimedChallenges.push(key);
      persist();
    }
  }

  function isChallengeClaimedThisMonth(id) {
    return state.claimedChallenges.includes(`${monthKey(new Date())}:${id}`);
  }

  function unlockBadge(days) {
    if (!state.unlockedBadges.includes(days)) {
      state.unlockedBadges.push(days);
      persist();
      return true;
    }
    return false;
  }

  function setSetting(key, value) {
    state.settings[key] = value;
    persist();
  }

  function resetAll() {
    state = structuredCloneSafe(DEFAULT_STATE);
    persist();
  }

  function completeOnboarding() {
    state.onboarded = true;
    persist();
  }

  return {
    getState, recordSession, currentStreakInfo, completionsForMonth,
    totalStats, claimChallenge, isChallengeClaimedThisMonth, unlockBadge,
    setSetting, resetAll, persist, completeOnboarding,
  };
})();
