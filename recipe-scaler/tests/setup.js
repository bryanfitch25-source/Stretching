// Loads the browser-global www/js/*.js modules into a plain Node context
// (they attach to `window`, which we stub as `global`) so the pure-logic
// modules (units/panscale/shopping — no DOM) can be unit tested without a
// browser or bundler.
const path = require('node:path');
const fs = require('node:fs');

global.window = global;

for (const file of ['units.js', 'panscale.js', 'shopping.js']) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'www', 'js', file), 'utf8');
  // eslint-disable-next-line no-eval
  (0, eval)(code);
}

module.exports = { Units: global.Units, PanScale: global.PanScale, Shopping: global.Shopping };
