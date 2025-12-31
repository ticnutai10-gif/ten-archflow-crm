import { User } from '@/entities/all';

// תדרים של תווים
const N = {
  rest: 0,
  c3: 130.81, cs3: 138.59, d3: 146.83, ds3: 155.56, e3: 164.81, f3: 174.61, fs3: 185.00, g3: 196.00, gs3: 207.65, a3: 220.00, as3: 233.08, b3: 246.94,
  c4: 261.63, cs4: 277.18, d4: 293.66, ds4: 311.13, e4: 329.63, f4: 349.23, fs4: 369.99, g4: 392.00, gs4: 415.30, a4: 440.00, as4: 466.16, b4: 493.88,
  c5: 523.25, cs5: 554.37, d5: 587.33, ds5: 622.25, e5: 659.25, f5: 698.46, fs5: 739.99, g5: 783.99, gs5: 830.61, a5: 880.00, as5: 932.33, b5: 987.77,
  c6: 1046.50, cs6: 1108.73, d6: 1174.66, e6: 1318.51, f6: 1396.91, g6: 1567.98, a6: 1760.00
};

// הגדרת המנגינות (תו, משך במילישניות)
const MELODIES = {
  'beethoven_5th': [
    {n: N.g4, d: 100}, {n: N.rest, d: 100}, {n: N.g4, d: 100}, {n: N.rest, d: 100}, {n: N.g4, d: 100}, {n: N.rest, d: 100}, {n: N.ds4, d: 600},
    {n: N.rest, d: 200},
    {n: N.f4, d: 100}, {n: N.rest, d: 100}, {n: N.f4, d: 100}, {n: N.rest, d: 100}, {n: N.f4, d: 100}, {n: N.rest, d: 100}, {n: N.d4, d: 600}
  ],
  'vivaldi_spring': [
    {n: N.e5, d: 200}, {n: N.rest, d: 50}, {n: N.gs5, d: 200}, {n: N.rest, d: 50}, {n: N.gs5, d: 200}, {n: N.rest, d: 50}, {n: N.gs5, d: 400},
    {n: N.fs5, d: 100}, {n: N.e5, d: 100}, {n: N.b4, d: 200}, {n: N.gs5, d: 200}, {n: N.rest, d: 50}, {n: N.gs5, d: 200}, {n: N.rest, d: 50}, {n: N.gs5, d: 400},
    {n: N.fs5, d: 100}, {n: N.e5, d: 100}, {n: N.b4, d: 400}
  ],
  'mozart_night': [
    {n: N.g4, d: 300}, {n: N.rest, d: 50}, {n: N.d4, d: 150}, {n: N.g4, d: 150}, {n: N.d4, d: 150}, {n: N.g4, d: 150}, {n: N.d4, d: 150}, {n: N.g4, d: 150}, {n: N.b4, d: 150}, {n: N.d5, d: 300},
    {n: N.rest, d: 150},
    {n: N.c5, d: 300}, {n: N.rest, d: 50}, {n: N.a4, d: 150}, {n: N.c5, d: 150}, {n: N.a4, d: 150}, {n: N.c5, d: 150}, {n: N.a4, d: 150}, {n: N.c5, d: 150}, {n: N.fs5, d: 150}, {n: N.a5, d: 300}
  ],
  'bach_cello': [
    {n: N.g3, d: 200}, {n: N.d4, d: 200}, {n: N.b4, d: 200}, {n: N.a4, d: 200}, {n: N.b4, d: 200}, {n: N.d4, d: 200}, {n: N.b4, d: 200}, {n: N.d4, d: 200},
    {n: N.g3, d: 200}, {n: N.d4, d: 200}, {n: N.b4, d: 200}, {n: N.a4, d: 200}, {n: N.b4, d: 200}, {n: N.d4, d: 200}, {n: N.b4, d: 200}, {n: N.d4, d: 200}
  ],
  'tchaikovsky_sugar': [
    {n: N.b5, d: 150}, {n: N.rest, d: 50}, {n: N.as5, d: 150}, {n: N.b5, d: 150}, {n: N.cs6, d: 150}, {n: N.b5, d: 150}, {n: N.as5, d: 150}, {n: N.b5, d: 150},
    {n: N.g5, d: 400}, {n: N.e5, d: 200}, {n: N.c5, d: 200}, {n: N.a4, d: 200}, {n: N.fs4, d: 600}
  ],
  'brahms_lullaby': [
    {n: N.fs4, d: 150}, {n: N.fs4, d: 150}, {n: N.a4, d: 400},
    {n: N.fs4, d: 150}, {n: N.fs4, d: 150}, {n: N.a4, d: 400},
    {n: N.fs4, d: 150}, {n: N.a4, d: 150}, {n: N.d5, d: 400}, {n: N.cs5, d: 200}, {n: N.b4, d: 200}, {n: N.b4, d: 200}, {n: N.a4, d: 600}
  ],
  'chopin_nocturne': [
    {n: N.g4, d: 300}, {n: N.g5, d: 600}, {n: N.d5, d: 300}, {n: N.g4, d: 300}, {n: N.fs4, d: 150}, {n: N.f4, d: 150}, {n: N.e4, d: 150}, {n: N.d4, d: 150}, {n: N.c4, d: 600}
  ],
  'strauss_danube': [
    {n: N.c4, d: 300}, {n: N.c4, d: 300}, {n: N.e4, d: 300}, {n: N.g4, d: 300}, {n: N.g4, d: 300},
    {n: N.e5, d: 200}, {n: N.e5, d: 200}, {n: N.rest, d: 100}, {n: N.e5, d: 200}, {n: N.e5, d: 200}
  ],
  'pachelbel_canon': [
    {n: N.fs4, d: 400}, {n: N.e4, d: 400}, {n: N.d4, d: 400}, {n: N.cs4, d: 400}, {n: N.b3, d: 400}, {n: N.a3, d: 400}, {n: N.b3, d: 400}, {n: N.cs4, d: 400}
  ],
  'debussy_clair': [
    {n: N.f4, d: 200}, {n: N.gs4, d: 200}, {n: N.f5, d: 600}, {n: N.f5, d: 200}, {n: N.ds5, d: 200}, {n: N.f5, d: 600}, {n: N.cs5, d: 800}
  ]
};

// הקשר אודיו יחיד לכל האפליקציה (Singleton) למניעת בעיות דפדפן
let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  // בדפדפנים מסוימים צריך לחדש את הקונטקסט אם הוא מושהה
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

export function playTone(freq = 600, durationMs = 300, type = 'sine', volume = 0.1) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.value = freq;
    
    // מעטפת ווליום (Envelope) למניעת "קליקים"
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (durationMs / 1000));
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + (durationMs / 1000));
  } catch (e) {
    console.error("Audio error:", e);
  }
}

function playMelodySequence(melodyName) {
  const notes = MELODIES[melodyName];
  if (!notes) return;

  const ctx = getAudioContext();
  let startTime = ctx.currentTime + 0.1;

  notes.forEach(({ n, d }) => {
    if (n > 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // סוג הגל - triangle נשמע נעים יותר למנגינות קלאסיות (כמו חליל/כינור מסונתז)
      osc.type = 'triangle'; 
      osc.frequency.value = n;
      
      // ADSR Envelope
      const durationSec = d / 1000;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05); // Attack
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.1); // Decay
      gain.gain.setValueAtTime(0.1, startTime + durationSec - 0.05); // Sustain
      gain.gain.linearRampToValueAtTime(0, startTime + durationSec); // Release
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + durationSec);
    }
    
    startTime += (d / 1000) * 1.1; // קצת מרווח בין תווים
  });
}

export async function playCustomRingtone(ringtoneId) {
  try {
    const user = await User.me();
    const customRingtones = user.custom_ringtones || [];
    const ringtone = customRingtones.find(r => r.id === ringtoneId);
    
    if (!ringtone) {
      console.error('Custom ringtone not found:', ringtoneId);
      playTone(660, 250, 'sine', 0.25); // fallback
      return;
    }
    
    const audio = new Audio(ringtone.url);
    audio.volume = 0.7;
    audio.play().catch(error => {
      console.error('Error playing custom ringtone:', error);
      playTone(660, 250, 'sine', 0.25); // fallback
    });
  } catch (error) {
    console.error('Error loading custom ringtone:', error);
    playTone(660, 250, 'sine', 0.25); // fallback
  }
}

export function playRingtone(kind = 'ding') {
  if (!kind) kind = 'ding';
  
  // אם זה רינגטון מותאם אישית
  if (kind.startsWith('custom_')) {
    playCustomRingtone(kind.replace('custom_', ''));
    return;
  }

  // רינגטונים קלאסיים (סינתזה)
  if (MELODIES[kind]) {
    playMelodySequence(kind);
    return;
  }

  // רינגטונים מוגדרים מראש (ישנים)
  if (kind === 'ding') {
    playTone(660, 250, 'sine', 0.25);
    setTimeout(() => playTone(880, 200, 'sine', 0.22), 260);
  } else if (kind === 'chime') {
    playTone(523, 200, 'triangle', 0.22);
    setTimeout(() => playTone(659, 250, 'triangle', 0.22), 220);
    setTimeout(() => playTone(784, 300, 'triangle', 0.22), 500);
  } else {
    // alarm
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 700;
        gain.gain.value = 0.1;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.3);
        osc.stop(now + i * 0.3 + 0.2);
    }
  }
}