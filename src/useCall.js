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
  ],
};

const RING_TIMEOUT_MS = 45000;

/**
 * WebRTC call logic. Signaling Firestore-er "calls" collection diye hoy.
 * me = { uid, name }
 */
export function useCall(me) {
  const [incoming, setIncoming] = useState(null); // { id, callerId, callerName, type }
  const [active, setActive] = useState(null); // { id, peerName, type, status }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [error, setError] = useState('');

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
      localRef.current.getTracks().forEach((t) => t.stop());
      localRef.current = null;
    }
    callIdRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setActive(null);
  }, []);

  // Incoming call listener
  useEffect(() => {
    if (!me?.uid) return undefined;
    const q = query(
      collection(db, 'calls'),
      where('calleeId', '==', me.uid),
      where('status', '==', 'ringing')
    );
    const unsub = onSnapshot(q, (snap) => {
      const fresh = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c) => Date.now() - (c.createdMs || 0) < RING_TIMEOUT_MS);
      setIncoming(fresh.length ? fresh[0] : null);
    });
    return unsub;
  }, [me?.uid]);

  // Page close korle call shesh kore daw
  useEffect(() => cleanup, [cleanup]);

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
      setError('Mic/camera permission paoa jayni. Permission allow koro.');
      throw e;
    }
  };

  const makePeer = (stream) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    const remote = new MediaStream();
    setRemoteStream(remote);
    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((t) => remote.addTrack(t));
      setRemoteStream(new MediaStream(remote.getTracks()));
    };
    return pc;
  };

  const startCall = useCallback(
    async (peer, type) => {
      if (active) return;
      setError('');
      try {
        const stream = await getMedia(type);
        const pc = makePeer(stream);
        const callRef = doc(collection(db, 'calls'));
        callIdRef.current = callRef.id;
        setActive({ id: callRef.id, peerName: peer.name, type, status: 'calling' });

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            addDoc(collection(callRef, 'callerCandidates'), e.candidate.toJSON());
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await setDoc(callRef, {
          callerId: me.uid,
          callerName: me.name,
          calleeId: peer.uid,
          type,
          status: 'ringing',
          createdMs: Date.now(),
          offer: { type: offer.type, sdp: offer.sdp },
        });

        let candListening = false;
        const unsubCall = onSnapshot(callRef, (snap) => {
          const data = snap.data();
          if (!data) return;
          if (data.answer && !pc.currentRemoteDescription) {
            pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            setActive((a) => (a ? { ...a, status: 'connected' } : a));
            clearTimeout(timerRef.current);
          }
          if (data.answer && !candListening) {
            candListening = true;
            const unsubCand = onSnapshot(collection(callRef, 'calleeCandidates'), (cs) => {
              cs.docChanges().forEach((c) => {
                if (c.type === 'added') pc.addIceCandidate(new RTCIceCandidate(c.doc.data()));
              });
            });
            unsubsRef.current.push(unsubCand);
          }
          if (data.status === 'ended' || data.status === 'rejected') {
            if (data.status === 'rejected') setError(`${peer.name} call nilo na.`);
            cleanup();
          }
        });
        unsubsRef.current.push(unsubCall);

        // Keu na dhorle auto-cut
        timerRef.current = setTimeout(async () => {
          try {
            await updateDoc(callRef, { status: 'ended' });
          } catch (e) {
            /* ignore */
          }
          setError(`${peer.name} dhoreni.`);
          cleanup();
        }, RING_TIMEOUT_MS);
      } catch (e) {
        console.error(e);
        cleanup();
      }
    },
    [active, me, cleanup]
  );

  const acceptCall = useCallback(async () => {
    if (!incoming) return;
    setError('');
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
          addDoc(collection(callRef, 'calleeCandidates'), e.candidate.toJSON());
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(call.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await updateDoc(callRef, {
        answer: { type: answer.type, sdp: answer.sdp },
        status: 'accepted',
      });

      const unsubCand = onSnapshot(collection(callRef, 'callerCandidates'), (cs) => {
        cs.docChanges().forEach((c) => {
          if (c.type === 'added') pc.addIceCandidate(new RTCIceCandidate(c.doc.data()));
        });
      });
      const unsubCall = onSnapshot(callRef, (snap) => {
        const data = snap.data();
        if (data && data.status === 'ended') cleanup();
      });
      unsubsRef.current.push(unsubCand, unsubCall);
    } catch (e) {
      console.error(e);
      try {
        await updateDoc(doc(db, 'calls', call.id), { status: 'ended' });
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
      await updateDoc(doc(db, 'calls', id), { status: 'rejected' });
    } catch (e) {
      /* ignore */
    }
  }, [incoming]);

  const endCall = useCallback(async () => {
    const id = callIdRef.current;
    if (id) {
      try {
        await updateDoc(doc(db, 'calls', id), { status: 'ended' });
      } catch (e) {
        /* ignore */
      }
    }
    cleanup();
  }, [cleanup]);

  const toggleMic = useCallback(() => {
    const t = localRef.current?.getAudioTracks()[0];
    if (t) t.enabled = !t.enabled;
    return t ? !t.enabled : false; // muted?
  }, []);

  const toggleCam = useCallback(() => {
    const t = localRef.current?.getVideoTracks()[0];
    if (t) t.enabled = !t.enabled;
    return t ? !t.enabled : false; // cam off?
  }, []);

  return {
    incoming,
    active,
    localStream,
    remoteStream,
    error,
    clearError: () => setError(''),
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCam,
  };
}
