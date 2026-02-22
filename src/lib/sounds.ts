// Web Audio API sound effects for QuizSpark — Neon Edition
// All sounds are synthesized — no audio files needed

let audioCtx: AudioContext | null = null;
let lobbyOsc: OscillatorNode | null = null;
let lobbyGain: GainNode | null = null;
let lobbyInterval: ReturnType<typeof setInterval> | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.3,
  delay = 0
): void {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch (_) {
    // Silently fail if audio is not supported
  }
}

/** Ascending chime for correct answer */
export function playCorrect(): void {
  playTone(523.25, 0.15, 'sine', 0.35, 0.0);  // C5
  playTone(659.25, 0.15, 'sine', 0.35, 0.1);  // E5
  playTone(783.99, 0.25, 'sine', 0.35, 0.2);  // G5
  playTone(1046.5, 0.4, 'sine', 0.3, 0.35);   // C6
}

/** Descending buzz for wrong answer */
export function playWrong(): void {
  playTone(300, 0.08, 'sawtooth', 0.25, 0.0);
  playTone(200, 0.08, 'sawtooth', 0.25, 0.1);
  playTone(150, 0.2, 'sawtooth', 0.2, 0.2);
}

/** Soft tick for timer */
export function playTick(): void {
  playTone(800, 0.05, 'square', 0.08);
}

/** Urgent tick for final 3 seconds */
export function playUrgentTick(): void {
  playTone(1000, 0.06, 'square', 0.15, 0.0);
  playTone(1000, 0.06, 'square', 0.15, 0.15);
}

/** Fanfare for game end / high rank */
export function playFanfare(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  notes.forEach((freq, i) => {
    playTone(freq, 0.2, 'sine', 0.3, i * 0.12);
  });
}

/** Whoosh on leaderboard reveal */
export function playWhoosh(): void {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(2000, ctx.currentTime + 0.3);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch (_) { }
}

/** Streak sound — escalating chime based on streak count */
export function playStreakSound(streakCount: number): void {
  const baseFreq = 600 + streakCount * 50;
  for (let i = 0; i < Math.min(streakCount, 5); i++) {
    playTone(baseFreq + i * 100, 0.12, 'sine', 0.25, i * 0.08);
  }
  // Add a shimmer on high streaks
  if (streakCount >= 3) {
    playTone(baseFreq + 500, 0.3, 'triangle', 0.15, 0.4);
  }
}

/** Podium reveal — dramatic ascending fanfare */
export function playPodiumReveal(): void {
  // Deep bass rumble
  playTone(100, 0.5, 'sawtooth', 0.1, 0.0);
  // Build-up
  const buildNotes = [262, 330, 392, 523, 659, 784];
  buildNotes.forEach((freq, i) => {
    playTone(freq, 0.15, 'sine', 0.2, 0.2 + i * 0.1);
  });
  // Grand finale chord
  playTone(1047, 0.6, 'sine', 0.3, 0.85);
  playTone(1319, 0.6, 'sine', 0.25, 0.85);
  playTone(1568, 0.6, 'sine', 0.2, 0.85);
}

/** Start lobby background loop — ambient synth pulse */
export function playLobbyLoop(): void {
  try {
    stopLobbyLoop();
    const ctx = getCtx();

    // Create a pulsing pad
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);

    // LFO for pulsing effect
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.5, ctx.currentTime);
    lfoGain.gain.setValueAtTime(0.03, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    lfo.start();

    lobbyOsc = osc;
    lobbyGain = gain;

    // Add melodic pings every 2 seconds
    const melodyNotes = [440, 523, 659, 523, 440, 392, 440, 523];
    let noteIdx = 0;
    lobbyInterval = setInterval(() => {
      playTone(melodyNotes[noteIdx % melodyNotes.length], 0.3, 'sine', 0.06, 0);
      noteIdx++;
    }, 2000);

  } catch (_) { }
}

/** Stop lobby loop */
export function stopLobbyLoop(): void {
  try {
    if (lobbyOsc) { lobbyOsc.stop(); lobbyOsc = null; }
    if (lobbyGain) { lobbyGain = null; }
    if (lobbyInterval) { clearInterval(lobbyInterval); lobbyInterval = null; }
  } catch (_) { }
}

/** Timer intensifying music — plays faster beats as time decreases */
export function playTimerBeat(secondsLeft: number): void {
  if (secondsLeft > 10) return;
  const urgency = 1 - (secondsLeft / 10);
  const freq = 200 + urgency * 400;
  const vol = 0.05 + urgency * 0.1;
  playTone(freq, 0.06, 'square', vol);
}
