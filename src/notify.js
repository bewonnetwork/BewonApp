import { IS_NATIVE } from './config.js';

// APK background-e (app chalu thakle) message/call ashle phone-e notification dekhay
let ready = false;
async function plugin() {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  return LocalNotifications;
}

export async function initNotify() {
  if (!IS_NATIVE) return;
  try {
    const LN = await plugin();
    const p = await LN.requestPermissions();
    ready = p.display === 'granted';
    await LN.createChannel({ id: 'calls', name: 'Calls', importance: 5, vibration: true, visibility: 1 });
    await LN.createChannel({ id: 'msgs', name: 'Messages', importance: 4, vibration: true });
  } catch (e) {
    /* ignore */
  }
}

export async function notify(title, body, channel = 'msgs') {
  if (!IS_NATIVE || !ready || document.visibilityState === 'visible') return;
  try {
    const LN = await plugin();
    await LN.schedule({
      notifications: [{ id: Math.floor(Math.random() * 2147483000), title, body, channelId: channel }],
    });
  } catch (e) {
    /* ignore */
  }
}
