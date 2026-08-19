// Local-only persistence. Uses the native Capacitor Preferences plugin when
// running inside the Android app shell, and falls back to localStorage when
// running in a plain browser (e.g. `npm start` during development).
//
// Everything is stored as a single JSON blob under one key — the dataset
// (a home cook's personal recipe box) is small enough that a key/value
// store beats the complexity of a relational DB and native SQLite build.

const STORE_KEY = 'yield.recipes.v1';

const nativePrefs = () => window.Capacitor?.Plugins?.Preferences ?? null;

async function rawGet(key) {
  const prefs = nativePrefs();
  if (prefs) {
    const { value } = await prefs.get({ key });
    return value;
  }
  return window.localStorage.getItem(key);
}

async function rawSet(key, value) {
  const prefs = nativePrefs();
  if (prefs) {
    await prefs.set({ key, value });
  } else {
    window.localStorage.setItem(key, value);
  }
}

function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const Storage = {
  async loadRecipes() {
    const raw = await rawGet(STORE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  async saveRecipes(recipes) {
    await rawSet(STORE_KEY, JSON.stringify(recipes));
  },

  newId: uid,
};

window.Storage = Storage;
