// ANTARANGA · procedural soundscape. Everything is synthesized — river noise,
// night insects, temple bell, a low drone — so nothing unlicensed is shipped.
// Audio is opt-in and evolves with the journey; silence is used deliberately.
import { clamp01, remap, smooth, win, lerp } from './util.js';

export class Soundscape {
  constructor() {
    this.enabled = false;
    this.ctx = null;
    this.lastBell = -99;
    this.lastTick = -99;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    /* river: looped brown noise through a low-pass */
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + .02 * w) / 1.02;
      d[i] = last * 3.2;
    }
    const river = ctx.createBufferSource();
    river.buffer = buf; river.loop = true;
    const riverLP = ctx.createBiquadFilter();
    riverLP.type = 'lowpass'; riverLP.frequency.value = 420; riverLP.Q.value = .4;
    this.riverGain = ctx.createGain(); this.riverGain.gain.value = 0;
    river.connect(riverLP).connect(this.riverGain).connect(this.master);
    river.start();

    /* wind/air: filtered white noise, very quiet */
    const wbuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const wd = wbuf.getChannelData(0);
    for (let i = 0; i < len; i++) wd[i] = (Math.random() * 2 - 1) * .4;
    const wind = ctx.createBufferSource();
    wind.buffer = wbuf; wind.loop = true;
    const windBP = ctx.createBiquadFilter();
    windBP.type = 'bandpass'; windBP.frequency.value = 700; windBP.Q.value = .6;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0;
    wind.connect(windBP).connect(this.windGain).connect(this.master);
    wind.start();

    /* insects: narrow-band shimmer */
    const insBP = ctx.createBiquadFilter();
    insBP.type = 'bandpass'; insBP.frequency.value = 4200; insBP.Q.value = 18;
    const ins = ctx.createBufferSource();
    ins.buffer = wbuf; ins.loop = true;
    const insLFO = ctx.createOscillator(); insLFO.frequency.value = 11;
    const insLFOGain = ctx.createGain(); insLFOGain.gain.value = .5;
    const insCarrier = ctx.createGain(); insCarrier.gain.value = .5;
    insLFO.connect(insLFOGain).connect(insCarrier.gain);
    this.insGain = ctx.createGain(); this.insGain.gain.value = 0;
    ins.connect(insBP).connect(insCarrier).connect(this.insGain).connect(this.master);
    ins.start(); insLFO.start();

    /* low drone for the innermost passages */
    const droneOsc = ctx.createOscillator();
    droneOsc.type = 'sine'; droneOsc.frequency.value = 72;
    const droneOsc2 = ctx.createOscillator();
    droneOsc2.type = 'sine'; droneOsc2.frequency.value = 108.2;
    this.droneGain = ctx.createGain(); this.droneGain.gain.value = 0;
    const dg2 = ctx.createGain(); dg2.gain.value = .35;
    droneOsc.connect(this.droneGain);
    droneOsc2.connect(dg2).connect(this.droneGain);
    this.droneGain.connect(this.master);
    droneOsc.start(); droneOsc2.start();
  }

  /* a struck bell: inharmonic partials with long decay */
  bell(gain = .16) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    for (const [f, a, dec] of [[428, 1, 3.2], [572, .55, 2.6], [856, .4, 2.1], [1122, .28, 1.6], [1712, .14, 1.2]]) {
      const o = ctx.createOscillator();
      o.frequency.value = f * (1 + (Math.random() - .5) * .004);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gain * a, t0 + .008);
      g.gain.exponentialRampToValueAtTime(.0001, t0 + dec);
      o.connect(g).connect(this.master);
      o.start(t0); o.stop(t0 + dec + .1);
    }
  }

  /* one japa bead passing — a tiny wooden tick */
  tick() {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'triangle'; o.frequency.value = 1900 + Math.random() * 300;
    const g = ctx.createGain();
    g.gain.setValueAtTime(.05, t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + .05);
    o.connect(g).connect(this.master);
    o.start(t0); o.stop(t0 + .07);
  }

  toggle() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.enabled = !this.enabled;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.linearRampToValueAtTime(this.enabled ? 1 : 0, t + 1.2);
    return this.enabled;
  }

  /* evolve with the journey */
  update(t, time) {
    if (!this.ctx || !this.enabled) return;
    // river: strong at open and close, gone in the interior chapters
    const river =
      .16 * (1 - smooth(remap(t, .055, .085)))
      + .05 * win(t, .66, .685, .705, .725)      // manchale, distant
      + .18 * smooth(remap(t, .895, .93));       // the return
    // insects: dawn opening only
    const insects = .05 * (1 - smooth(remap(t, .05, .08)));
    // wind/air: the settlement, the journey, manchale
    const wind =
      .04 * win(t, .075, .11, .2, .24)
      + .05 * win(t, .575, .6, .645, .66)
      + .06 * win(t, .655, .675, .71, .725);
    // drone: the sanctum stillness through the interior of the Brindavana
    const drone =
      .05 * win(t, .728, .75, .785, .795)
      + .07 * win(t, .797, .82, .85, .858)
      + .04 * win(t, .86, .875, .9, .908);

    const now = this.ctx.currentTime;
    this.riverGain.gain.setTargetAtTime(river, now, .6);
    this.insGain.gain.setTargetAtTime(insects, now, .8);
    this.windGain.gain.setTargetAtTime(wind, now, .8);
    this.droneGain.gain.setTargetAtTime(drone, now, 1.2);

    // temple bell moments: entering manchale, and the aradhana morning
    const bellZones = [.66, .918, .958];
    for (const z of bellZones) {
      if (Math.abs(t - z) < .002 && time - this.lastBell > 6) {
        this.lastBell = time;
        this.bell(.12);
      }
    }
  }
}
