// Camera switch (front/back) ar screen share-er helper. 1-to-1 call ar group/meeting duto-te use hoy.

export const screenShareSupported = () =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices &&
  typeof navigator.mediaDevices.getDisplayMedia === 'function';

export async function getCameraTrack(facing = 'user') {
  const s = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: facing } },
  });
  return s.getVideoTracks()[0];
}

export async function getScreenTrack() {
  const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  return s.getVideoTracks()[0];
}

async function replaceOnPeers(pcs, track) {
  for (const pc of pcs) {
    const tr = pc
      .getTransceivers()
      .find((t) => t.receiver && t.receiver.track && t.receiver.track.kind === 'video');
    if (tr) {
      try {
        await tr.sender.replaceTrack(track);
      } catch (e) {
        /* ignore */
      }
    }
  }
}

/**
 * getLocal(): current local MediaStream (mutated in place)
 * setLocal(stream): React state update (new MediaStream object)
 * getPcs(): list of RTCPeerConnection
 * hadVideo(): call started as video call?
 * onShare(bool): sharing state changed
 */
export function createMediaController({ getLocal, setLocal, getPcs, hadVideo, onShare }) {
  let facing = 'user';
  let screen = null;

  const setLocalVideo = (track) => {
    const ls = getLocal();
    if (!ls) return;
    ls.getVideoTracks().forEach((t) => {
      ls.removeTrack(t);
      t.stop();
    });
    if (track) ls.addTrack(track);
    setLocal(new MediaStream(ls.getTracks()));
  };

  const stopShare = async () => {
    if (!screen) return;
    const s = screen;
    screen = null;
    s.stop();
    let cam = null;
    if (hadVideo()) {
      try {
        cam = await getCameraTrack(facing);
      } catch (e) {
        cam = null;
      }
    }
    setLocalVideo(cam);
    await replaceOnPeers(getPcs(), cam);
    onShare(false);
  };

  const startShare = async () => {
    const track = await getScreenTrack();
    screen = track;
    track.onended = () => {
      if (screen === track) stopShare();
    };
    setLocalVideo(track);
    await replaceOnPeers(getPcs(), track);
    onShare(true);
  };

  return {
    isSharing: () => !!screen,
    async toggleShare() {
      if (screen) await stopShare();
      else await startShare();
    },
    async switchCamera() {
      if (screen) return false;
      const next = facing === 'user' ? 'environment' : 'user';
      const track = await getCameraTrack(next);
      facing = next;
      setLocalVideo(track);
      await replaceOnPeers(getPcs(), track);
      return true;
    },
    cleanup() {
      if (screen) {
        screen.stop();
        screen = null;
      }
    },
  };
}
