import { User } from '@/entities/all';

export const CLASSICAL_RINGTONES = {
  'beethoven_5th': 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Beethoven_Symphony_No._5_1st_movement_opening.ogg',
  'vivaldi_spring': 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Antonio_Vivaldi_-_Spring_Mvt_1_Allegro_-_John_Harrison_violin.ogg',
  'mozart_night': 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Mozart_-_Eine_kleine_Nachtmusik_-_1._Allegro.ogg',
  'bach_cello': 'https://upload.wikimedia.org/wikipedia/commons/d/d0/J.S.Bach_-_Cello_Suite_No._1_in_G_Major_-_I._Prelude.ogg',
  'tchaikovsky_sugar': 'https://upload.wikimedia.org/wikipedia/commons/3/38/Tchaikovsky_-_Dance_of_the_Sugar_Plum_Fairy_-_The_Nutcracker.ogg',
  'brahms_lullaby': 'https://upload.wikimedia.org/wikipedia/commons/2/21/Johannes_Brahms_-_Wiegenlied_Op._49%2C_No._4.ogg',
  'chopin_nocturne': 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Fr%C3%A9d%C3%A9ric_Chopin_-_Nocturne_Op._9_No._2.ogg',
  'strauss_danube': 'https://upload.wikimedia.org/wikipedia/commons/2/27/Strauss_-_The_Blue_Danube.ogg',
  'pachelbel_canon': 'https://upload.wikimedia.org/wikipedia/commons/0/07/Johann_Pachelbel_-_Canon_in_D_Major.ogg',
  'debussy_clair': 'https://upload.wikimedia.org/wikipedia/commons/0/03/Clair_de_lune_%28Debussy%29_Suite_bergamasque.ogg'
};

export function playTone(freq = 600, durationMs = 300, type = 'sine', volume = 0.2) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, durationMs);
  } catch (e) {
    // ignore audio errors
  }
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

  // רינגטונים קלאסיים
  if (CLASSICAL_RINGTONES[kind]) {
    const audio = new Audio(CLASSICAL_RINGTONES[kind]);
    audio.volume = 0.6;
    audio.play().catch(e => console.error("Audio play failed", e));
    return;
  }

  // רינגטונים מוגדרים מראש
  if (kind === 'ding') {
    playTone(660, 250, 'sine', 0.25);
    setTimeout(() => playTone(880, 200, 'sine', 0.22), 260);
  } else if (kind === 'chime') {
    playTone(523, 200, 'triangle', 0.22);
    setTimeout(() => playTone(659, 250, 'triangle', 0.22), 220);
    setTimeout(() => playTone(784, 300, 'triangle', 0.22), 500);
  } else {
    // alarm
    for (let i = 0; i < 4; i++) {
      setTimeout(() => playTone(700, 200, 'square', 0.3), i * 300);
    }
  }
}