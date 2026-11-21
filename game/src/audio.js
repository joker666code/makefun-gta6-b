// All sound is synthesized with WebAudio: no audio files, no network.
// Short effects are one-shot oscillator/noise bursts; the music is a tiny
// step sequencer (bass + hats + a sparse lead) that loops while driving.

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicTimer = null;
  let step = 0;
  let enabled = true;
  let musicOn = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, low) {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low || 1200;
    const g = ctx.createGain();
    g.gain.value = vol || 0.3;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t);
  }

  // A two-tone police siren that wails for a couple of seconds.
  function siren() {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.linearRampToValueAtTime(1100, t + 0.5);
    osc.frequency.linearRampToValueAtTime(700, t + 1.0);
    osc.frequency.linearRampToValueAtTime(1100, t + 1.5);
    osc.frequency.linearRampToValueAtTime(700, t + 2.0);
    g.gain.setValueAtTime(0.12, t);
    g.gain.setValueAtTime(0.12, t + 1.9);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.1);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + 2.1);
  }

  // Bass line in A minor, one bar of eight steps, with a hat tick and a rare lead note.
  const BASS = [110, 0, 110, 0, 130.8, 0, 98, 0, 110, 0, 110, 0, 164.8, 0, 146.8, 0];
  const LEAD = [0, 0, 440, 0, 0, 0, 523.25, 0, 0, 0, 0, 659.25, 0, 0, 587.33, 0];

  function musicStep() {
    if (!musicOn || !enabled || !ensure()) return;
    const bass = BASS[step % BASS.length];
    const lead = LEAD[step % LEAD.length];
    if (bass) tone(bass, 0.22, 'triangle', 0.16);
    if (lead && step % 2 === 0) tone(lead, 0.3, 'sine', 0.05);
    if (step % 2 === 0) noise(0.03, 0.05, 6000);
    step++;
  }

  return {
    unlock,
    setEnabled(v) { enabled = v; if (!v) this.stopMusic(); },
    isEnabled() { return enabled; },
    click() { tone(660, 0.07, 'sine', 0.15); },
    pickup() { tone(880, 0.1, 'sine', 0.2); tone(1320, 0.14, 'sine', 0.15); },
    cash() { tone(988, 0.09, 'sine', 0.18); tone(1319, 0.16, 'sine', 0.18); },
    punch() { noise(0.12, 0.3, 500); },
    shoot() { noise(0.14, 0.4, 2400); tone(160, 0.1, 'sawtooth', 0.18, 60); },
    reload() { tone(300, 0.06, 'square', 0.12); tone(420, 0.06, 'square', 0.12); },
    crash() { noise(0.35, 0.45, 700); tone(90, 0.3, 'sawtooth', 0.2, 40); },
    engine() { tone(70, 0.4, 'sawtooth', 0.05, 110); },
    siren,
    busted() { tone(392, 0.25, 'sawtooth', 0.2); tone(311, 0.4, 'sawtooth', 0.2); },
    missionDone() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'sine', 0.2), i * 120)); },
    startMusic() {
      if (musicOn || !ensure()) return;
      musicOn = true;
      step = 0;
      musicTimer = setInterval(musicStep, 240);
    },
    stopMusic() {
      musicOn = false;
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    },
  };
}
