// sound.js - Utility for playing high-quality UI sound effects using Howler.js
import { Howl, Howler } from 'howler';

// Set global volume to max
Howler.volume(1.0);

const soundManifest = {
  click: 'sounds/click.mp3',
  confirm: 'sounds/confirm.mp3',
  points: 'sounds/points.mp3',
  vip: 'sounds/vip.mp3',
  error: 'sounds/error.mp3'
};

// Cache for Howl instances
const soundCache = {};

/**
 * Plays a sound effect by type.
 * @param {('click'|'confirm'|'points'|'vip'|'error')} type 
 */
const playSound = (type) => {
  const path = soundManifest[type];
  if (!path) {
    console.warn(`Sound type '${type}' not found in manifest.`);
    return;
  }

  // Use cached instance or create new one
  if (!soundCache[type]) {
    soundCache[type] = new Howl({
      src: [`/${path}`], // Leading slash points to public folder in Vite/Electron
      volume: 1.0,
      preload: true,
      html5: false, // Local files don't need HTML5 audio mode
      onloaderror: (id, err) => console.error(`Error loading sound ${type}:`, err),
      onplayerror: (id, err) => {
        console.error(`Error playing sound ${type}:`, err);
        soundCache[type].unlock();
      }
    });
  }

  // Play the sound
  try {
    if (soundCache[type].state() === 'loaded') {
      soundCache[type].play();
    } else {
      soundCache[type].once('load', () => soundCache[type].play());
      soundCache[type].load();
    }
  } catch (e) {
    console.error(`Failed to trigger sound ${type}:`, e);
  }
};

export default playSound;