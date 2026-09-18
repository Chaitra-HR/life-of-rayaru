// RAYARA ANTARANGA · the soundscape.
// ONE recording is the score (the owner's, assets/audio/boopul-deep*.m4a),
// held under the whole journey at a restrained level, and nothing else
// (the filtered-noise river of 19 Sept 2026 was heard as a second track
// and removed the same day). Nothing starts or stops between chapters:
// every change is a gain moving on its own time constant.
//
// The recording is STREAMED through an <audio> element, never decoded
// whole: eight minutes of PCM is more memory than a phone should give a
// website. It loops on its own.
//
// It is ON BY DEFAULT on every visit. Browsers only let a page make sound
// after the visitor has interacted with it, so the score starts on the
// first click, tap or key press; the SOUND control in the header (and M)
// turns it off, and that choice holds for the session.
import { smooth, remap, clamp01 } from './util.js';

/* the recording in two encodings: HE-AAC at 48 kbps (2.9 MB, the one the
   page preloads from its head) for every browser that decodes it, and the
   AAC-LC at 80 kbps (4.9 MB) for the rare one that does not */
const TRACK_HE = 'assets/audio/boopul-deep-he.m4a';
const TRACK_LC = 'assets/audio/boopul-deep.m4a';
const TRACK = (() => { try { const a = document.createElement('audio'); return a.canPlayType('audio/mp4; codecs="mp4a.40.5"') ? TRACK_HE : TRACK_LC; } catch (e) { return TRACK_LC; } })();
const PREF = 'antaranga-sound';

/* the level, as a fraction of the master: restrained, under the place.
   Tune by ear. */
const MUSIC = .34;
const MASTER = .8;

export function createAmbience({ button = null } = {}) {
  const buttons = (Array.isArray(button) ? button : [button]).filter(Boolean);
  let ctx = null, nodes = null, on = false, media = null;

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    /* Chrome queues a resume() made before the visitor's first gesture and
       runs it at that gesture, even if the sound was switched off in the
       meantime: while OFF, a context that comes up is put straight back down */
    ctx.addEventListener('statechange', () => { if (!on && ctx.state === 'running') ctx.suspend().then(setPlaying, setPlaying); setPlaying(); });
    const master = ctx.createGain(); master.gain.value = 0;
    master.connect(ctx.destination);

    /* the score: the element made at load (prime) so its first seconds are
       already buffered by the time the visitor's first tap arrives */
    if (!media) media = makeMedia();
    const src = ctx.createMediaElementSource(media);
    const music = ctx.createGain(); music.gain.value = MUSIC;
    // a gentle top-end roll-off keeps it dark, under the place
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 6400; tone.Q.value = .5;
    src.connect(tone).connect(music).connect(master);

    nodes = { master, music };
    return true;
  }

  /* the element is made, and asked to buffer, as soon as the module loads:
     on a phone the first tap used to create it and then wait on the
     network before a note was heard. The page preloads the file from its
     head (index.html, a low-priority <link rel="preload" as="audio">), so
     by the time this module runs the bytes are in the cache. */
  function makeMedia() {
    const m = new Audio();
    m.loop = true; m.preload = 'auto'; m.crossOrigin = 'anonymous';
    m.src = TRACK;
    try { m.load(); } catch (e) {}
    return m;
  }
  function prime() {
    if (media) return;
    media = makeMedia();   // the file itself is already coming: index.html preloads it from the head, with the page
  }

  const setLabel = () => {
    for (const b of buttons) {
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', on ? 'Sound on. Turn off (M)' : 'Sound off. Turn on (M)');
      const eq = '<span class="snd-eq" aria-hidden="true"><i></i><i></i><i></i></span>';
      b.innerHTML = b.dataset.compact != null
        ? eq + (on ? '' : '<span class="snd-x" aria-hidden="true"></span>')
        : (on ? 'SOUND · ON' + eq : 'SOUND · OFF');
    }
  };
  /* the bars move only while this tab is actually making sound */
  const setPlaying = () => {
    const p = !!(on && ctx && ctx.state === 'running' && !document.hidden);
    for (const b of buttons) b.classList.toggle('playing', p);
  };
  let pauseTimer = 0, started = false;
  /* the choice holds for this session's tabs; a new visit starts with the score on */
  const remember = (v) => { try { sessionStorage.setItem(PREF, v ? 'on' : 'off'); } catch (e) {} };
  /* bring the engine up to the current state: fade in and run, or fade out
     and pause once the fade has finished */
  async function apply() {
    if (!ctx && !build()) return;
    clearTimeout(pauseTimer);
    const now = ctx.currentTime;
    nodes.master.gain.cancelScheduledValues(now);
    if (on) {
      /* an arrival over a couple of seconds (the first one a little
         quicker, so the tap that starts the score is answered) */
      nodes.master.gain.setTargetAtTime(MASTER, now, started ? 2.6 : 1.4);
      started = true;
      // a tab nobody can see never plays; visibilitychange resumes it.
      // Both calls are made SYNCHRONOUSLY, inside the visitor's gesture (a
      // phone's Safari counts the gesture only until the first await), and
      // only then waited on
      const pc = document.hidden ? ctx.suspend() : ctx.resume();
      const pm = (media && !document.hidden) ? media.play() : null;
      try { await pc; } catch (e) {}
      if (pm) { try { await pm; } catch (e) { /* the browser wants a gesture; the next one starts it */ } }
    } else {
      /* off is immediate in effect: the master is cut at once, and the engine
         is paused outright a moment later (the fade is shorter than the
         visitor's finger leaving the button) */
      nodes.master.gain.setTargetAtTime(0, now, .05);
      pauseTimer = setTimeout(() => { if (!on && ctx) { ctx.suspend().then(setPlaying, setPlaying); if (media) media.pause(); } }, 250);
    }
    setPlaying();
  }
  function set(v, save = true) {
    on = v;
    if (save) remember(on);
    disarm();
    setLabel();
    return apply();
  }
  function toggle() {
    /* the control means what it says: reading ON, a click turns the sound
       off, whether or not the browser had let it start yet; reading OFF, a
       click turns it on (and that click is the gesture the browser wants) */
    return set(!on);
  }
  /* on by default: start with the first interaction the browser accepts as
     permission to play. Scrolling alone does not count, so a click, a tap or
     a key does it. */
  const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'];
  let kicks = 0;
  const kick = (e) => {
    kicks++;
    if (e && buttons.some(b => b.contains(e.target))) return;   // the buttons handle themselves
    if (e && e.type === 'keydown' && (e.key === 'm' || e.key === 'M')) return;   // so does the shortcut
    if (on) apply().then(() => { if (ctx && ctx.state === 'running' && media && !media.paused) disarm(); });
  };
  function arm() { for (const g of GESTURES) window.addEventListener(g, kick, { capture: true, passive: true }); }
  function disarm() { for (const g of GESTURES) window.removeEventListener(g, kick, { capture: true }); }
  let pref = 'on';
  try { pref = sessionStorage.getItem(PREF) || 'on'; } catch (e) {}
  on = pref !== 'off';
  if (on) { arm(); prime(); }
  for (const b of buttons) b.addEventListener('click', toggle);
  setLabel();
  /* M turns the sound on or off from anywhere (not while typing) */
  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key !== 'm' && e.key !== 'M') return;
    const el = document.activeElement;
    if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
    toggle();
  });
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { ctx.suspend().then(setPlaying, setPlaying); if (media) media.pause(); }
    else if (on) { ctx.resume().then(setPlaying, setPlaying); if (media) media.play().catch(() => {}); }
  });

  /* the place, by the story: the score sits a little lower under the
     chapters, where the words are read, and in the chamber under the bank.
     Targets are re-set only when they move, on long time constants, so
     nothing steps. */
  let lastM = -1;

  return {
    toggle,
    get on() { return on; },
    get state() { return ctx ? ctx.state : 'none'; },
    /* review aids */
    get media() { return media; },
    get kicks() { return kicks; },
    /* try to start without a gesture (some browsers allow it for a site the
       visitor has engaged with); otherwise the first gesture starts it */
    async tryStart() {
      if (!on) return;
      if (!ctx && !build()) return;
      await apply();
      if (ctx.state === 'running' && media && !media.paused) disarm();
    },
    /* t: global scroll */
    update(t) {
      if (!ctx || !on || !nodes) return;
      const chamber = smooth(remap(t, .76, .80)) * (1 - smooth(remap(t, .86, .90)));   // under the bank, the water is far
      const reading = smooth(remap(t, .07, .12)) * (1 - smooth(remap(t, .70, .74)));   // the chapters
      const m = MUSIC * (1 - .14 * reading) * (1 - .18 * chamber);
      const now = ctx.currentTime;
      if (Math.abs(m - lastM) > .004) { lastM = m; nodes.music.gain.setTargetAtTime(m, now, 1.6); }
    },
  };
}
