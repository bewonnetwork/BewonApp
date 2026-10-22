import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

const ICE_CONFIG = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    // Free public TURN (best-effort). Mobile data-te call connect hote help kore.
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

const RING_TIMEOUT_MS = 45000;

/**
 * WebRTC call logic. Signaling Firestore-er "calls" collection diye hoy.
 * me = { uid, name }
 * error = { key, name } (App.jsx t(key) diye dekhay)
 */
export function useCall(me, t) {
  const [incoming, setIncoming] = useState(null);
  const [active, setActive] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [error, setError] = useState(null);

  const pcRef = useRef(null);
  const localRef = useRef(null);
  const unsubsRef = useRef([]);
  const timerRef = useRef(null);
  const callIdRef = useRef(null);

  const cleanup = useCallback(() => {
    clearTimeout(timerRef.current);
    unsubsRef.current.forEach((u) => {
      try {
        u();
      } catch (e) {
        /* ignore */
      }
    });
    unsubsRef.current = [];
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localRef.current) {
      localRef.current.getTracks().forEach((tr) => tr.stop());
      localRef.current = null;
    }
    callIdRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setActive(null);
  }, []);

  // Incoming call listener
  useEffect(() => {
    if (!me || !me.uid) return undefined;
    const q = query(
      collection(db, 'calls'),
      where('calleeId', '==', me.uid),
      where('status', '==', 'ringing')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const fresh = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((c) => Date.now() - (c.createdMs || 0) < RING_TIMEOUT_MS);
        setIncoming(fresh.length ? fresh[0] : null);
      },
      () => {}
    );
    return unsub;
  }, [me && me.uid]);

  useEffect(() => cleanup, [cleanup]);

  // Ringing dekhale 45s por nijei bondho (caller offline hole)
  useEffect(() => {
    if (!incoming) return undefined;
    const left = RING_TIMEOUT_MS - (Date.now() - (incoming.createdMs || 0));
    const id = setTimeout(() => setIncoming(null), Math.max(1000, left));
    return () => clearTimeout(id);
  }, [incoming]);

  const getMedia = async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? { facingMode: 'user' } : false,
      });
      localRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (e) {
      setError({ key: 'permErr' });
      throw e;
    }
  };

  const makePeer = (stream) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;
    stream.getTracks().forEach((tr) => pc.addTrack(tr, stream));
    const remote = new MediaStream();
    setRemoteStream(remote);
    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((tr) => remote.addTrack(tr));
      setRemoteStream(new MediaStream(remote.getTracks()));
    };
    return pc;
  };

  const startCall = useCallback(
    async (peer, type) => {
      if (active || !me) return;
      setError(null);
      try {
        const stream = await getMedia(type);
        const pc = makePeer(stream);
        const callRef = doc(collection(db, 'calls'));
        callIdRef.current = callRef.id;
        setActive({ id: callRef.id, peerName: peer.name, type, status: 'calling' });

        // Call doc toiri hoyar age candidate likhle rules permission dey na, tai queue kore rakhi
        let ready = false;
        const queue = [];
        const pushCandidate = (c) => {
          if (ready) addDoc(collection(callRef, 'callerCandidates'), c).catch(() => {});
          else queue.push(c);
        };
        pc.onicecandidate = (e) => {
          if (e.candidate) pushCandidate(e.candidate.toJSON());
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await setDoc(callRef, {
          callerId: me.uid,
          callerName: me.name,
          calleeId: peer.uid,
          calleeName: peer.name,
          type,
          status: 'ringing',
          createdMs: Date.now(),
          offer: { type: offer.type, sdp: offer.sdp },
        });
        ready = true;
        queue.splice(0).forEach(pushCandidate);

        let answered = false;
        const unsubCall = onSnapshot(callRef, (snap) => {
          const data = snap.data();
          if (!data) return;
          if (data.answer && !answered) {
            answered = true;
            pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(() => {});
            setActive((a) => (a ? { ...a, status: 'connected' } : a));
            clearTimeout(timerRef.current);
            const unsubCand = onSnapshot(collection(callRef, 'calleeCandidates'), (cs) => {
              cs.docChanges().forEach((c) => {
                if (c.type === 'added') {
                  pc.addIceCandidate(new RTCIceCandidate(c.doc.data())).catch(() => {});
                }
              });
            });
            unsubsRef.current.push(unsubCand);
          }
          if (data.status === 'ended' || data.status === 'rejected' || data.status === 'missed') {
            if (data.status === 'rejected') setError({ key: 'declined', name: peer.name });
            cleanup();
          }
        });
        unsubsRef.current.push(unsubCall);

        // Keu na dhorle auto-cut
        timerRef.current = setTimeout(async () => {
          try {
            await updateDoc(callRef, { status: 'missed', endedMs: Date.now() });
          } catch (e) {
            /* ignore */
          }
          setError({ key: 'noAnswer', name: peer.name });
          cleanup();
        }, RING_TIMEOUT_MS);
      } catch (e) {
        console.error(e);
        setError((prev) => prev || { key: 'callFail' });
        cleanup();
      }
    },
    [active, me, cleanup]
  );

  const acceptCall = useCallback(async () => {
    if (!incoming) return;
    setError(null);
    const call = incoming;
    setIncoming(null);
    try {
      const stream = await getMedia(call.type);
      const pc = makePeer(stream);
      const callRef = doc(db, 'calls', call.id);
      callIdRef.current = call.id;
      setActive({ id: call.id, peerName: call.callerName, type: call.type, status: 'connected' });

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          addDoc(collection(callRef, 'calleeCandidates'), e.candidate.toJSON()).catch(() => {});
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(call.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await updateDoc(callRef, {
        answer: { type: answer.type, sdp: answer.sdp },
        status: 'accepted',
        answeredMs: Date.now(),
      });

      const unsubCand = onSnapshot(collection(callRef, 'callerCandidates'), (cs) => {
        cs.docChanges().forEach((c) => {
          if (c.type === 'added') {
            pc.addIceCandidate(new RTCIceCandidate(c.doc.data())).catch(() => {});
          }
        });
      });
      const unsubCall = onSnapshot(callRef, (snap) => {
        const data = snap.data();
        if (data && (data.status === 'ended' || data.status === 'missed')) cleanup();
      });
      unsubsRef.current.push(unsubCand, unsubCall);
    } catch (e) {
      console.error(e);
      setError((prev) => prev || { key: 'callFail' });
      try {
        await updateDoc(doc(db, 'calls', call.id), { status: 'ended', endedMs: Date.now() });
      } catch (err) {
        /* ignore */
      }
      cleanup();
    }
  }, [incoming, cleanup]);

  const rejectCall = useCallback(async () => {
    if (!incoming) return;
    const id = incoming.id;
    setIncoming(null);
    try {
      await updateDoc(doc(db, 'calls', id), { status: 'rejected', endedMs: Date.now() });
    } catch (e) {
      /* ignore */
    }
  }, [incoming]);

  const endCall = useCallback(async () => {
    const id = callIdRef.current;
    if (id) {
      try {
        await updateDoc(doc(db, 'calls', id), { status: 'ended', endedMs: Date.now() });
      } catch (e) {
        /* ignore */
      }
    }
    cleanup();
  }, [cleanup]);

  const toggleMic = useCallback(() => {
    const tr = localRef.current && localRef.current.getAudioTracks()[0];
    if (tr) tr.enabled = !tr.enabled;
    return tr ? !tr.enabled : false; // muted?
  }, []);

  const toggleCam = useCallback(() => {
    const tr = localRef.current && localRef.current.getVideoTracks()[0];
    if (tr) tr.enabled = !tr.enabled;
    return tr ? !tr.enabled : false; // cam off?
  }, []);

  return {
    incoming,
    active,
    localStream,
    remoteStream,
    error,
    clearError: () => setError(null),
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCam,
  };
}
