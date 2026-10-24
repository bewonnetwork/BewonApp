import { registerPlugin } from '@capacitor/core';
import { IS_NATIVE } from './config.js';

const Native = IS_NATIVE ? registerPlugin('AudioRoute') : null;

// Phone-e call chalu hole speaker ba kan-er moddhe awaj switch kore
export const setSpeaker = async (on) => {
  if (!Native) return;
  try {
    await Native.setSpeaker({ on });
  } catch (e) {
    /* ignore */
  }
};
export const resetAudio = async () => {
  if (!Native) return;
  try {
    await Native.reset();
  } catch (e) {
    /* ignore */
  }
};
export const hasAudioRoute = !!Native;
