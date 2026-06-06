// sound.js - UI feedback via Web Audio synth + optional Howler mp3 fallbacks
import { Howl, Howler } from 'howler';

Howler.volume(1.0);

const soundManifest = {
  confirm: 'sounds/confirm.mp3',
  points: 'sounds/points.mp3',
  vip: 'sounds/vip.mp3',
  error: 'sounds/error.mp3',
};

const soundCache = {};
let audioCtx = null;
let masterGain = null;

const getAudioContext = () => {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.85;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

/** Short pop + drip tail — satisfying tactile click for buttons/keys */
const playSynthClick = () => {
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;

  const now = ctx.currentTime;
  const detune = Math.random() * 50 - 25;

  const popOsc = ctx.createOscillator();
  const popGain = ctx.createGain();
  popOsc.type = 'sine';
  popOsc.frequency.setValueAtTime(720 + detune, now);
  popOsc.frequency.exponentialRampToValueAtTime(220, now + 0.055);
  popGain.gain.setValueAtTime(0.0001, now);
  popGain.gain.linearRampToValueAtTime(0.55, now + 0.003);
  popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  popOsc.connect(popGain);
  popGain.connect(masterGain);
  popOsc.start(now);
  popOsc.stop(now + 0.09);

  const dripOsc = ctx.createOscillator();
  const dripGain = ctx.createGain();
  dripOsc.type = 'triangle';
  dripOsc.frequency.setValueAtTime(340 + detune * 0.4, now + 0.012);
  dripOsc.frequency.exponentialRampToValueAtTime(110, now + 0.13);
  dripGain.gain.setValueAtTime(0.0001, now + 0.012);
  dripGain.gain.linearRampToValueAtTime(0.22, now + 0.018);
  dripGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
  dripOsc.connect(dripGain);
  dripGain.connect(masterGain);
  dripOsc.start(now + 0.012);
  dripOsc.stop(now + 0.16);
};

const playHowl = (type) => {
  const path = soundManifest[type];
  if (!path) return false;

  if (!soundCache[type]) {
    soundCache[type] = new Howl({
      src: [`/${path}`],
      volume: 1.0,
      preload: true,
      html5: false,
      onloaderror: (_id, err) => console.error(`Error loading sound ${type}:`, err),
      onplayerror: (_id, err) => {
        console.error(`Error playing sound ${type}:`, err);
        soundCache[type].unlock();
      },
    });
  }

  try {
    if (soundCache[type].state() === 'loaded') {
      soundCache[type].play();
    } else {
      soundCache[type].once('load', () => soundCache[type].play());
      soundCache[type].load();
    }
    return true;
  } catch (e) {
    console.error(`Failed to trigger sound ${type}:`, e);
    return false;
  }
};

/**
 * Plays a sound effect by type.
 * @param {('click'|'confirm'|'points'|'vip'|'error')} type
 */
const playSound = (type) => {
  if (type === 'click') {
    playSynthClick();
    return;
  }

  if (!playHowl(type)) {
    console.warn(`Sound type '${type}' not found in manifest.`);
  }
};

export default playSound;
