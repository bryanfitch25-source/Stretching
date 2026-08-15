/* ==========================================================================
   app.js — rendering, navigation, and the stretch session player.
   Pure client-side. Reads/writes state exclusively through Store (storage.js).
   ========================================================================== */

(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  let selectedLibraryStretches = new Set();
  let activeAreaFilter = 'all';
  let librarySearchQuery = '';

  const VIEW_ORDER = ['today', 'weekly', 'monthly', 'library', 'progress'];

  /* ---------------------------------------------------------------------
     Navigation
     --------------------------------------------------------------------- */
  function switchView(name) {
    $$('.view').forEach(v => v.classList.toggle('hidden', v.dataset.view !== name));
    $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.target === name));
    $('#main').scrollTop = 0;
    if (name === 'weekly') renderWeekly();
    if (name === 'monthly') renderMonthly();
    if (name === 'library') renderLibrary();
    if (name === 'progress') renderProgress();
    if (name === 'today') renderToday();
    location.hash = name;
  }

  function initNav() {
    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.target));
    });
    const initial = (location.hash || '#today').replace('#', '');
    switchView(VIEW_ORDER.includes(initial) ? initial : 'today');
  }

  /* Swipe left/right on the main content to move between tabs — a natural
     iOS gesture that saves a reach down to the tab bar. */
  function initSwipeNav() {
    const main = $('#main');
    let startX = null, startY = null, tracking = false;

    main.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });

    main.addEventListener('touchend', (e) => {
      if (!tracking || startX === null) return;
      tracking = false;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - startX;
      const dy = endY - startY;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

      const current = $$('.view').find(v => !v.classList.contains('hidden'))?.dataset.view || 'today';
      const idx = VIEW_ORDER.indexOf(current);
      if (dx < 0 && idx < VIEW_ORDER.length - 1) switchView(VIEW_ORDER[idx + 1]);
      if (dx > 0 && idx > 0) switchView(VIEW_ORDER[idx - 1]);
    }, { passive: true });
  }

  /* ---------------------------------------------------------------------
     Header / streak pill
     --------------------------------------------------------------------- */
  function renderHeader() {
    const info = Store.currentStreakInfo();
    $('#streakCount').textContent = info.current;
    $('#streakPill').classList.toggle('at-risk', !!info.atRisk);
  }

  /* ---------------------------------------------------------------------
     TODAY view
     --------------------------------------------------------------------- */
  function renderToday() {
    renderHeader();
    const plan = todaysPlan();
    const state = Store.getState();
    const todayKey = dateKey(new Date());
    const doneToday = state.completions[todayKey];

    $('#todayThemeLabel').textContent = plan.name;
    $('#todayThemeName').textContent = plan.theme;
    const areaLabels = plan.areas.map(a => AREAS[a].label).join(' · ');
    $('#todaySummary').textContent = `${plan.stretchIds.length} stretches · ${areaLabels}`;

    const startBtn = $('#startTodayBtn');
    const nudgeEl = ensureNudgeEl();
    if (doneToday) {
      startBtn.textContent = `Done today ✓  (Stretch again)`;
      $('#todayHero').classList.add('done');
      nudgeEl.classList.add('hidden');
    } else {
      startBtn.textContent = "Start Today's Stretch";
      $('#todayHero').classList.remove('done');
      const hour = new Date().getHours();
      if (hour >= 17) {
        nudgeEl.textContent = "End of shift — perfect time to unwind before you head home.";
        nudgeEl.classList.remove('hidden');
      } else {
        nudgeEl.classList.add('hidden');
      }
    }
    startBtn.onclick = () => startSession(plan.stretchIds, `${plan.name}: ${plan.theme}`);

    // Weekly goal card = simple "days this week" tracker
    renderWeeklyGoalCard();

    // Monthly card summary
    const challenge = monthlyChallengeFor();
    const progress = challengeProgress(challenge);
    $('#monthlyCard').innerHTML = `
      <div class="challenge-row">
        <div>
          <p class="card-title">${challenge.title}</p>
          <p class="card-sub">${challenge.desc}</p>
        </div>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100, progress.pct)}%"></div></div>
      <p class="progress-label">${progress.current} / ${challenge.target} — tap Month tab for details</p>
    `;
    $('#monthlyCard').onclick = () => switchView('monthly');

    // Quick relief grid: one representative stretch per area
    const grid = $('#quickReliefGrid');
    grid.innerHTML = '';
    Object.keys(AREAS).forEach(areaKey => {
      const area = AREAS[areaKey];
      const btn = document.createElement('button');
      btn.className = 'quick-relief-btn';
      btn.style.setProperty('--area-color', area.color);
      btn.setAttribute('aria-label', `Quick relief stretch for ${area.label}`);
      btn.innerHTML = `<span class="qr-emoji" aria-hidden="true">${area.emoji}</span><span>${area.label}</span>`;
      btn.onclick = () => {
        const pool = stretchesByArea(areaKey);
        const pick = shuffle(pool).slice(0, 3).map(s => s.id);
        startSession(pick, `Quick Relief: ${area.label}`);
      };
      grid.appendChild(btn);
    });
  }

  function ensureNudgeEl() {
    let el = $('#todayNudge');
    if (!el) {
      el = document.createElement('p');
      el.id = 'todayNudge';
      el.className = 'hero-nudge hidden';
      $('#startTodayBtn').insertAdjacentElement('beforebegin', el);
    }
    return el;
  }

  function renderWeeklyGoalCard() {
    const week = last7DaysKeys();
    const state = Store.getState();
    const doneCount = week.filter(k => state.completions[k]).length;
    const target = 5;
    $('#weeklyGoalCard').innerHTML = `
      <p class="card-title">Stretch ${target} days this week</p>
      <div class="week-dots small">
        ${week.map(k => `<span class="dot ${state.completions[k] ? 'filled' : ''}"></span>`).join('')}
      </div>
      <p class="progress-label">${doneCount} / ${target} days logged</p>
    `;
    $('#weeklyGoalCard').onclick = () => switchView('weekly');
  }

  /* ---------------------------------------------------------------------
     WEEKLY view
     --------------------------------------------------------------------- */
  function renderWeekly() {
    renderHeader();
    const list = $('#weeklyList');
    list.innerHTML = '';
    const state = Store.getState();
    const todayIdx = new Date().getDay();

    WEEKLY_PLAN.forEach(day => {
      const el = document.createElement('div');
      el.className = 'card weekly-day-card' + (day.day === todayIdx ? ' today' : '');
      const dateForDay = dateForWeekday(day.day);
      const key = dateKey(dateForDay);
      const done = !!state.completions[key];
      el.innerHTML = `
        <div class="weekly-day-head">
          <div>
            <p class="card-title">${day.name} ${day.day === todayIdx ? '<span class="badge-today">Today</span>' : ''}</p>
            <p class="card-sub">${day.theme}</p>
          </div>
          <div class="done-check ${done ? 'done' : ''}">${done ? '✓' : ''}</div>
        </div>
        <div class="chip-row">
          ${day.areas.map(a => `<span class="chip" style="--chip-color:${AREAS[a].color}">${AREAS[a].emoji} ${AREAS[a].label}</span>`).join('')}
        </div>
        <button class="btn-secondary btn-block" data-day="${day.day}">${done ? 'Do it again' : 'Start'}</button>
      `;
      el.querySelector('button').onclick = () => startSession(day.stretchIds, `${day.name}: ${day.theme}`);
      list.appendChild(el);
    });
  }

  /* ---------------------------------------------------------------------
     MONTHLY view
     --------------------------------------------------------------------- */
  function renderMonthly() {
    renderHeader();
    const now = new Date();
    const challenge = monthlyChallengeFor(now);
    const progress = challengeProgress(challenge);
    const claimed = Store.isChallengeClaimedThisMonth(challenge.id);

    $('#monthSubtitle').textContent = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    $('#challengeDetailCard').innerHTML = `
      <p class="card-title">${challenge.title}</p>
      <p class="card-sub">${challenge.desc}</p>
      <div class="progress-bar big"><div class="progress-fill" style="width:${Math.min(100, progress.pct)}%"></div></div>
      <p class="progress-label">${progress.current} / ${challenge.target}</p>
      ${progress.pct >= 100
        ? `<p class="challenge-reward">${claimed ? '✓ Claimed: ' : '🎁 Unlocked: '}${challenge.reward}</p>`
        : `<p class="challenge-reward muted">Reward: ${challenge.reward}</p>`}
    `;
    if (progress.pct >= 100 && !claimed) {
      Store.claimChallenge(challenge.id);
      showToast(`Challenge complete! ${challenge.reward}`);
    }

    renderMonthCalendar(now);
    renderBadgeGrid('#badgeGrid');
  }

  function renderMonthCalendar(now) {
    const cal = $('#monthCalendar');
    cal.innerHTML = '';
    const year = now.getFullYear(), month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay.getDay();
    const state = Store.getState();

    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => {
      const h = document.createElement('div');
      h.className = 'cal-weekday';
      h.textContent = d;
      cal.appendChild(h);
    });
    for (let i = 0; i < startOffset; i++) {
      cal.appendChild(document.createElement('div'));
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const key = dateKey(date);
      const done = !!state.completions[key];
      const isToday = dateKey(new Date()) === key;
      const isFuture = date > new Date();
      const cell = document.createElement('div');
      cell.className = `cal-day ${done ? 'done' : ''} ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''}`;
      cell.textContent = d;
      cal.appendChild(cell);
    }
  }

  function renderBadgeGrid(selector) {
    const grid = $(selector);
    grid.innerHTML = '';
    const state = Store.getState();
    STREAK_BADGES.forEach(b => {
      const unlocked = state.unlockedBadges.includes(b.days) || state.streak.longest >= b.days;
      const el = document.createElement('div');
      el.className = `badge ${unlocked ? 'unlocked' : 'locked'}`;
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', `${b.label} badge, ${b.days} day streak, ${unlocked ? 'unlocked' : 'locked'}`);
      el.innerHTML = `<span class="badge-emoji" aria-hidden="true">${unlocked ? b.emoji : '🔒'}</span><span class="badge-label">${b.label}</span><span class="badge-days">${b.days} days</span>`;
      grid.appendChild(el);
    });
  }

  function challengeProgress(challenge) {
    const state = Store.getState();
    const monthEntries = Store.completionsForMonth(new Date());
    let current = 0;
    if (challenge.goalType === 'daysStretched') {
      current = monthEntries.length;
    } else if (challenge.goalType === 'totalMinutes') {
      current = Math.round(monthEntries.reduce((s, [, v]) => s + v.minutes, 0));
    } else if (challenge.goalType === 'areasCovered') {
      const areas = new Set();
      monthEntries.forEach(([, v]) => v.areas.forEach(a => areas.add(a)));
      current = areas.size;
    }
    return { current, pct: (current / challenge.target) * 100 };
  }

  /* ---------------------------------------------------------------------
     LIBRARY view
     --------------------------------------------------------------------- */
  function renderLibrary() {
    renderHeader();
    const filterBar = $('#areaFilter');
    filterBar.innerHTML = `<button class="filter-chip ${activeAreaFilter === 'all' ? 'active' : ''}" data-area="all">All</button>` +
      Object.entries(AREAS).map(([key, a]) =>
        `<button class="filter-chip ${activeAreaFilter === key ? 'active' : ''}" data-area="${key}" style="--chip-color:${a.color}">${a.emoji} ${a.label}</button>`
      ).join('');
    $$('.filter-chip', filterBar).forEach(chip => {
      chip.onclick = () => { activeAreaFilter = chip.dataset.area; renderLibrary(); };
    });

    const searchInput = $('#librarySearch');
    if (searchInput.value !== librarySearchQuery) searchInput.value = librarySearchQuery;
    searchInput.oninput = (e) => { librarySearchQuery = e.target.value; renderLibrary(); };

    const list = $('#libraryList');
    list.innerHTML = '';
    let items = activeAreaFilter === 'all' ? STRETCHES : stretchesByArea(activeAreaFilter);
    const q = librarySearchQuery.trim().toLowerCase();
    if (q) {
      items = items.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q) ||
        AREAS[s.area].label.toLowerCase().includes(q)
      );
    }
    $('#libraryEmpty').classList.toggle('hidden', items.length > 0);
    items.forEach(s => {
      const area = AREAS[s.area];
      const row = document.createElement('div');
      row.className = 'lib-row' + (selectedLibraryStretches.has(s.id) ? ' selected' : '');
      row.innerHTML = `
        <div class="lib-check">${selectedLibraryStretches.has(s.id) ? '✓' : ''}</div>
        <div class="lib-emoji" style="--area-color:${area.color}">${s.emoji}</div>
        <div class="lib-info">
          <p class="lib-name">${s.name}</p>
          <p class="lib-meta">${area.label} · ${s.duration}s${s.sides ? ' per side' : ''}</p>
        </div>
        <button class="lib-play" aria-label="Preview and start">▶</button>
      `;
      row.querySelector('.lib-play').onclick = (e) => { e.stopPropagation(); startSession([s.id], s.name); };
      row.onclick = () => {
        if (selectedLibraryStretches.has(s.id)) selectedLibraryStretches.delete(s.id);
        else selectedLibraryStretches.add(s.id);
        renderLibrary();
      };
      list.appendChild(row);
    });

    const startCustomBtn = $('#startCustomBtn');
    $('#customCount').textContent = selectedLibraryStretches.size;
    startCustomBtn.classList.toggle('hidden', selectedLibraryStretches.size === 0);
    startCustomBtn.onclick = () => {
      const ids = Array.from(selectedLibraryStretches);
      selectedLibraryStretches.clear();
      startSession(ids, 'Custom Session');
    };
  }

  /* ---------------------------------------------------------------------
     PROGRESS view
     --------------------------------------------------------------------- */
  function renderProgress() {
    renderHeader();
    const stats = Store.totalStats();
    const state = Store.getState();

    let emptyState = $('#progressEmpty');
    if (stats.totalDays === 0) {
      if (!emptyState) {
        emptyState = document.createElement('div');
        emptyState.id = 'progressEmpty';
        emptyState.className = 'card empty-state';
        emptyState.innerHTML = `
          <p class="card-title">No stretches logged yet</p>
          <p class="card-sub">Your streak, badges, and heatmap will fill in as soon as you finish your first session.</p>
          <button class="btn-secondary btn-block" id="progressEmptyCta">Go stretch now</button>
        `;
        $('#statGrid').insertAdjacentElement('beforebegin', emptyState);
        $('#progressEmptyCta').onclick = () => switchView('today');
      }
      emptyState.classList.remove('hidden');
    } else if (emptyState) {
      emptyState.classList.add('hidden');
    }

    $('#statGrid').innerHTML = `
      <div class="stat-tile" id="statCurrentStreak" role="button" tabindex="0"><strong>${state.streak.current}</strong><span>Current streak</span></div>
      <div class="stat-tile"><strong>${state.streak.longest}</strong><span>Longest streak</span></div>
      <div class="stat-tile"><strong>${Math.round(stats.totalMinutes)}</strong><span>Total minutes</span></div>
      <div class="stat-tile"><strong>${stats.totalDays}</strong><span>Days stretched</span></div>
    `;
    $('#statCurrentStreak').onclick = openStreakSheet;

    renderHeatmap();
    renderBadgeGrid('#allBadgeGrid');

    $('#soundToggle').checked = state.settings.sound;
    $('#hapticToggle').checked = state.settings.haptics;
    $('#soundToggle').onchange = (e) => Store.setSetting('sound', e.target.checked);
    $('#hapticToggle').onchange = (e) => Store.setSetting('haptics', e.target.checked);
    $('#resetDataBtn').onclick = () => {
      if (confirm('Reset all StretchLine data? This cannot be undone.')) {
        Store.resetAll();
        showToast('All data reset');
        switchView('today');
      }
    };
  }

  function renderHeatmap() {
    const el = $('#heatmap');
    el.innerHTML = '';
    const state = Store.getState();
    const today = new Date();
    const totalDays = 49; // 7 weeks
    const cells = [];
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      const entry = state.completions[key];
      cells.push({ key, level: entry ? Math.min(4, 1 + Math.floor(entry.minutes / 5)) : 0 });
    }
    cells.forEach(c => {
      const cell = document.createElement('div');
      cell.className = `heat-cell level-${c.level}`;
      cell.title = c.key;
      el.appendChild(cell);
    });
  }

  /* ---------------------------------------------------------------------
     Date helpers (view-layer; storage.js has its own copies to stay standalone)
     --------------------------------------------------------------------- */
  function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function last7DaysKeys() {
    const out = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      out.push(dateKey(d));
    }
    return out;
  }
  function dateForWeekday(weekday) {
    const today = new Date();
    const diff = weekday - today.getDay();
    const d = new Date(today);
    d.setDate(d.getDate() + diff);
    return d;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------------------------------------------------------------------
     Session Player
     --------------------------------------------------------------------- */
  let queue = [];
  let queueIndex = 0;
  let secondsLeft = 0;
  let totalSeconds = 0;
  let timerHandle = null;
  let paused = false;
  let sessionStretchIds = [];
  let sessionAreas = [];
  let sessionElapsed = 0;
  let sessionLabel = '';

  const RING_CIRCUMFERENCE = 2 * Math.PI * 90;

  function buildQueue(stretchIds) {
    const q = [];
    stretchIds.forEach(id => {
      const s = getStretch(id);
      if (!s) return;
      if (s.sides) {
        q.push({ stretch: s, side: 'Left' });
        q.push({ stretch: s, side: 'Right' });
      } else {
        q.push({ stretch: s, side: null });
      }
    });
    return q;
  }

  function startSession(stretchIds, label) {
    if (!stretchIds || stretchIds.length === 0) return;
    queue = buildQueue(stretchIds);
    queueIndex = 0;
    sessionStretchIds = [...stretchIds];
    sessionAreas = Array.from(new Set(stretchIds.map(id => getStretch(id)?.area).filter(Boolean)));
    sessionElapsed = 0;
    sessionLabel = label || 'Stretch Session';
    paused = false;
    $('#player').classList.remove('hidden');
    document.body.classList.add('lock-scroll');
    loadStep();
  }

  function loadStep() {
    if (queueIndex >= queue.length) {
      finishSession();
      return;
    }
    const step = queue[queueIndex];
    const s = step.stretch;
    $('#playerArea').textContent = AREAS[s.area].label + (queue.length > 1 ? ` · ${queueIndex + 1}/${queue.length}` : '');
    $('#playerStretchName').textContent = s.name;
    $('#playerSide').textContent = step.side ? `${step.side} side` : '';
    $('#playerDesc').textContent = s.desc;
    $('#playerTip').textContent = s.tip ? `👨‍🍳 ${s.tip}` : '';
    renderPlayerProgress();

    totalSeconds = s.duration;
    secondsLeft = s.duration;
    updateRing(1);
    $('#timerLabel').textContent = secondsLeft;
    $('#playerPause').textContent = 'Pause';
    paused = false;
    clearInterval(timerHandle);
    timerHandle = setInterval(tick, 1000);
    playCue('start');
    hapticTick();
  }

  function renderPlayerProgress() {
    const wrap = $('#playerProgress');
    wrap.innerHTML = queue.map((_, i) =>
      `<span class="prog-seg ${i < queueIndex ? 'done' : ''} ${i === queueIndex ? 'active' : ''}"></span>`
    ).join('');
  }

  function tick() {
    if (paused) return;
    secondsLeft -= 1;
    sessionElapsed += 1;
    $('#timerLabel').textContent = Math.max(0, secondsLeft);
    updateRing(secondsLeft / totalSeconds);
    if (secondsLeft <= 3 && secondsLeft > 0) playCue('tick');
    if (secondsLeft <= 0) {
      clearInterval(timerHandle);
      playCue('done');
      hapticTick();
      queueIndex += 1;
      loadStep();
    }
  }

  function updateRing(fraction) {
    const ring = $('#ringFg');
    const offset = RING_CIRCUMFERENCE * (1 - Math.max(0, fraction));
    ring.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;
    ring.style.strokeDashoffset = `${offset}`;
  }

  function togglePause() {
    paused = !paused;
    $('#playerPause').textContent = paused ? 'Resume' : 'Pause';
  }

  function skipStep() {
    clearInterval(timerHandle);
    sessionElapsed += secondsLeft > 0 ? (totalSeconds - secondsLeft) : totalSeconds;
    // count at least a few seconds so a rapid skip-through doesn't log 0 minutes oddly
    queueIndex += 1;
    loadStep();
  }

  function closePlayer(logPartial) {
    clearInterval(timerHandle);
    $('#player').classList.add('hidden');
    document.body.classList.remove('lock-scroll');
    if (logPartial && sessionElapsed > 10) {
      finishSession(true);
    }
  }

  function finishSession(silent) {
    clearInterval(timerHandle);
    $('#player').classList.add('hidden');
    document.body.classList.remove('lock-scroll');

    const effectiveSeconds = Math.max(sessionElapsed, 15);
    const prevLongest = Store.getState().streak.longest;
    Store.recordSession({ stretchIds: sessionStretchIds, areas: sessionAreas, seconds: effectiveSeconds });
    const newState = Store.getState();

    if (silent) return;

    $('#completionMsg').textContent = randomEncouragement();
    $('#completionMinutes').textContent = Math.max(1, Math.round(effectiveSeconds / 60));
    $('#completionStreak').textContent = newState.streak.current;

    const badgeEl = $('#completionBadge');
    const newlyHit = STREAK_BADGES.find(b => b.days === newState.streak.current && newState.streak.longest > prevLongest);
    if (newlyHit && Store.unlockBadge(newlyHit.days)) {
      badgeEl.classList.remove('hidden');
      badgeEl.innerHTML = `<span class="badge-emoji-lg">${newlyHit.emoji}</span> New badge: ${newlyHit.label}!`;
    } else {
      badgeEl.classList.add('hidden');
    }

    $('#completion').classList.remove('hidden');
    burstConfetti();
    playCue('celebrate');
    hapticTick(true);
    renderHeader();
  }

  function playCue(kind) {
    if (!Store.getState().settings.sound) return;
    try {
      const ctx = playCue._ctx || (playCue._ctx = new (window.AudioContext || window.webkitAudioContext)());
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      const freqs = { start: 440, tick: 660, done: 880, celebrate: 990 };
      o.frequency.value = freqs[kind] || 500;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      o.start();
      o.stop(ctx.currentTime + 0.2);
    } catch (e) { /* audio not available, ignore */ }
  }

  function hapticTick(strong) {
    if (!Store.getState().settings.haptics) return;
    // Vibration API isn't available in iOS Safari/PWA, so pair it with a visual
    // "tactile" pulse that reads the same on any device.
    if (navigator.vibrate) navigator.vibrate(strong ? [30, 40, 30] : 15);
    const target = $('.timer-ring-wrap');
    if (target) {
      target.classList.remove('pulse');
      void target.offsetWidth; // restart animation
      target.classList.add('pulse');
    }
  }

  function burstConfetti() {
    const layer = $('#confettiLayer');
    if (!layer) return;
    layer.innerHTML = '';
    const colors = ['#fb923c', '#2dd4bf', '#ec4899', '#eab308', '#6366f1', '#22c55e'];
    const count = 26;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${Math.random() * 0.3}s`;
      piece.style.animationDuration = `${1.4 + Math.random() * 0.9}s`;
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      layer.appendChild(piece);
    }
    setTimeout(() => { layer.innerHTML = ''; }, 2600);
  }

  /* ---------------------------------------------------------------------
     Streak sheet
     --------------------------------------------------------------------- */
  function openStreakSheet() {
    const state = Store.getState();
    const info = Store.currentStreakInfo();
    $('#sheetStreakCount').textContent = info.current;
    $('#sheetStreakSub').textContent = info.atRisk
      ? "Stretch today to keep it alive!"
      : `Longest streak: ${state.streak.longest} days`;

    const week = last7DaysKeys();
    $('#weekDots').innerHTML = week.map(k => {
      const d = parseDateKey(k);
      const label = d.toLocaleDateString('default', { weekday: 'narrow' });
      return `<div class="week-dot-col"><span class="dot ${state.completions[k] ? 'filled' : ''}"></span><span class="dot-label">${label}</span></div>`;
    }).join('');

    $('#freezeInfo').innerHTML = state.streak.freezesAvailable > 0
      ? `❄️ You have ${state.streak.freezesAvailable} streak freeze${state.streak.freezesAvailable > 1 ? 's' : ''} — miss a day and it's automatically covered.`
      : `❄️ Earn a streak freeze every 10-day streak to protect against a missed day.`;

    $('#streakSheet').classList.remove('hidden');
  }
  function closeStreakSheet() { $('#streakSheet').classList.add('hidden'); }

  async function shareStreak() {
    const state = Store.getState();
    const text = state.streak.current > 0
      ? `I'm on a ${state.streak.current}-day stretch streak with StretchLine 🔥`
      : `I just started building a stretch streak with StretchLine 🔥`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch (e) { /* user cancelled */ }
    } else if (navigator.clipboard) {
      try { await navigator.clipboard.writeText(text); showToast('Copied to clipboard'); }
      catch (e) { showToast(text); }
    } else {
      showToast(text);
    }
  }

  /* ---------------------------------------------------------------------
     Toast
     --------------------------------------------------------------------- */
  let toastTimer = null;
  function showToast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.classList.add('hidden'), 300);
    }, 2600);
  }

  /* ---------------------------------------------------------------------
     Wire up static controls + boot
     --------------------------------------------------------------------- */
  function initPlayerControls() {
    $('#playerClose').onclick = () => closePlayer(true);
    $('#playerPause').onclick = togglePause;
    $('#playerSkip').onclick = skipStep;
    $('#timerRingWrap').addEventListener('click', togglePause);
    $('#timerRingWrap').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePause(); }
    });
    $('#completionDone').onclick = () => { $('#completion').classList.add('hidden'); renderToday(); };
    $('#completion').addEventListener('click', (e) => {
      if (e.target.id === 'completion') { $('#completion').classList.add('hidden'); renderToday(); }
    });
    $('#streakPill').onclick = openStreakSheet;
    $('#streakSheetClose').onclick = closeStreakSheet;
    $('#streakSheetBackdrop').onclick = closeStreakSheet;
    $('#shareStreakBtn').onclick = shareStreak;
    $('#preShiftBtn').onclick = () => startSession(PRE_SHIFT_ROUTINE.stretchIds, PRE_SHIFT_ROUTINE.name);
    $('#onboardingDone').onclick = () => {
      Store.completeOnboarding();
      $('#onboarding').classList.add('hidden');
      document.body.classList.remove('lock-scroll');
    };
  }

  function maybeShowOnboarding() {
    if (!Store.getState().onboarded) {
      $('#onboarding').classList.remove('hidden');
      document.body.classList.add('lock-scroll');
    }
  }

  /* ---------------------------------------------------------------------
     "Add to Home Screen" banner — only relevant on iOS Safari, and only
     when the app is NOT already running as an installed standalone app.
     --------------------------------------------------------------------- */
  const INSTALL_DISMISS_KEY = 'stretchline:installBannerDismissed';

  function initInstallBanner() {
    const isStandalone = window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const dismissed = localStorage.getItem(INSTALL_DISMISS_KEY) === '1';

    if (isStandalone || !isIOS || dismissed) return;

    const banner = $('#installBanner');
    banner.classList.remove('hidden');
    $('#installBannerClose').onclick = () => {
      banner.classList.add('hidden');
      localStorage.setItem(INSTALL_DISMISS_KEY, '1');
    };
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW registration failed', err));
      });
    }
  }

  function boot() {
    initPlayerControls();
    initNav();
    initSwipeNav();
    maybeShowOnboarding();
    initInstallBanner();
    registerServiceWorker();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
