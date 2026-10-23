import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { ICE_CONFIG } from './ice.js';
import { createMediaController } from './media.js';


/**
 * Group call (chat-er bhitore) ar Meeting (code diye) -- duto-i ekoi "room" logic.
 * Mesh WebRTC: prottek participant prottek jon-er shathe sorasori connect hoy (choto group-er jonno, ~6 jon porjonto).
 *
 * base = Firestore path segments of the room doc, e.g.
 *   ['chats', chatId, 'gcalls', callId]   or   ['meetings', code]
 * room doc-er bhitore: participants/{uid} ar signals/{id}
 */
export function useRoom(me) {
  const [room, setRoom] = useState(null); // { kind, base, title, type, code }
  const [localStream, setLocalStream] = useState(null);
  const [streams, setStreams] = useState({});
  const [participants, setParticipants] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState(null);

  const peers = useRef({});
  const localRef = useRef(null);
  const unsubs = useRef([]);
  const ctx = useRef(null); // { base, joinedMs, onEmpty, type }
  const ctrlRef = useRef(null);

  const closePeer = useCallback((uid) => {
    const p = peers.current[uid];
    if (!p) return;
    try {
      p.pc.onicecandidate = null;
      p.pc.ontrack = null;
      p.pc.close();
    } catch (e) {
      /* ignore */
    }
    delete peers.current[uid];
    setStreams((s) => {
      const n = { ...s };
      delete n[uid];
      return n;
    });
  }, []);

  const sendSignal = (to, type, payload) => {
    const c = ctx.current;
    if (!c) return;
    addDoc(collection(db, ...c.base, 'signals'), {
      from: me.uid,
      to,
      type,
      payload,
      createdMs: Date.now(),
    }).catch(() => {});
  };

  const createPeer = (uid) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    const local = localRef.current;
    local.getTracks().forEach((tr) => pc.addTrack(tr, local));
    // Video track na thakleo screen share-er jonno video slot rakhi
    if (!local.getVideoTracks().length) pc.addTransceiver('video', { direction: 'sendrecv' });
    pc.ontrack = (e) => {
      const src = e.streams && e.streams[0] ? e.streams[0].getTracks() : [e.track];
      setStreams((s) => ({ ...s, [uid]: new MediaStream(src) }));
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(uid, 'candidate', e.candidate.toJSON());
    };
    const p = { pc, pending: [], offered: false };
    peers.current[uid] = p;
    return p;
  };

  const flush = (p) => {
    p.pending.splice(0).forEach((c) => {
      p.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    });
  };

  const makeOffer = async (uid) => {
    const p = peers.current[uid] || createPeer(uid);
    try {
      const offer = await p.pc.createOffer();
      await p.pc.setLocalDescription(offer);
      sendSignal(uid, 'offer', { type: offer.type, sdp: offer.sdp });
    } catch (e) {
      console.warn('offer failed', e);
    }
  };

  const handleSignal = async (sig) => {
    const p = peers.current[sig.from] || createPeer(sig.from);
    try {
      if (sig.type === 'offer') {
        await p.pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
        flush(p);
        const ans = await p.pc.createAnswer();
        await p.pc.setLocalDescription(ans);
        sendSignal(sig.from, 'answer', { type: ans.type, sdp: ans.sdp });
      } else if (sig.type === 'answer') {
        if (p.pc.signalingState === 'have-local-offer') {
          await p.pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
          flush(p);
        }
      } else if (sig.type === 'candidate') {
        if (p.pc.remoteDescription) {
          await p.pc.addIceCandidate(new RTCIceCandidate(sig.payload)).catch(() => {});
        } else {
          p.pending.push(sig.payload);
        }
      }
    } catch (e) {
      console.warn('signal failed', e);
    }
  };

  const teardown = useCallback(() => {
    unsubs.current.forEach((u) => {
      try {
        u();
      } catch (e) {
        /* ignore */
      }
    });
    unsubs.current = [];
    Object.keys(peers.current).forEach(closePeer);
    if (ctrlRef.current) ctrlRef.current.cleanup();
    ctrlRef.current = null;
    if (localRef.current) {
      localRef.current.getTracks().forEach((tr) => tr.stop());
      localRef.current = null;
    }
    setLocalStream(null);
    setStreams({});
    setParticipants([]);
    setSharing(false);
    setRoom(null);
  }, [closePeer]);

  const leave = useCallback(async () => {
    const c = ctx.current;
    ctx.current = null;
    teardown();
    if (!c || !me) return;
    try {
      await deleteDoc(doc(db, ...c.base, 'participants', me.uid));
      const rest = await getDocs(collection(db, ...c.base, 'participants'));
      if (rest.empty && c.onEmpty) await c.onEmpty();
    } catch (e) {
      /* ignore */
    }
  }, [teardown, me]);

  const join = useCallback(
    async ({ kind, base, title, type, code, onEmpty }) => {
      if (room || !me) return false;
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video' ? { facingMode: 'user' } : false,
        });
        localRef.current = stream;
        setLocalStream(stream);
      } catch (e) {
        setError({ key: 'permErr' });
        return false;
      }

      ctx.current = { base, joinedMs: Date.now(), onEmpty, type };
      ctrlRef.current = createMediaController({
        getLocal: () => localRef.current,
        setLocal: setLocalStream,
        getPcs: () => Object.values(peers.current).map((p) => p.pc),
        hadVideo: () => type === 'video',
        onShare: setSharing,
      });
      setRoom({ kind, base, title, type, code });

      try {
        // Amar nam e pathano signal-gulo
        const unsubSig = onSnapshot(
          query(collection(db, ...base, 'signals'), where('to', '==', me.uid)),
          (snap) => {
            snap.docChanges().forEach((ch) => {
              if (ch.type !== 'added') return;
              const sig = ch.doc.data();
              deleteDoc(ch.doc.ref).catch(() => {});
              if (!ctx.current || (sig.createdMs || 0) < ctx.current.joinedMs - 5000) return;
              handleSignal(sig);
            });
          },
          () => {}
        );
        // Participant ashle/gele
        const unsubPart = onSnapshot(
          collection(db, ...base, 'participants'),
          (snap) => {
            setParticipants(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
            snap.docChanges().forEach((ch) => {
              const id = ch.doc.id;
              if (id === me.uid) return;
              if (ch.type === 'added') {
                const p = peers.current[id] || createPeer(id);
                // Je-i uid chhoto, sei offer pathay (duijon ekshathe offer korle conflict hoy na)
                if (me.uid < id && !p.offered) {
                  p.offered = true;
                  makeOffer(id);
                }
              } else if (ch.type === 'removed') {
                closePeer(id);
              }
            });
          },
          () => {}
        );
        unsubs.current.push(unsubSig, unsubPart);
        await setDoc(doc(db, ...base, 'participants', me.uid), {
          name: me.name,
          joinedMs: Date.now(),
        });
        return true;
      } catch (e) {
        console.error(e);
        setError({ key: 'callFail' });
        ctx.current = null;
        teardown();
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [room, me, teardown, closePeer]
  );

  // Tab bondho korle best-effort leave
  useEffect(() => {
    const onHide = () => {
      const c = ctx.current;
      if (c && me) deleteDoc(doc(db, ...c.base, 'participants', me.uid)).catch(() => {});
    };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [me]);

  useEffect(
    () => () => {
      ctx.current = null;
      teardown();
    },
    [teardown]
  );

  const toggleMic = useCallback(() => {
    const tr = localRef.current && localRef.current.getAudioTracks()[0];
    if (tr) tr.enabled = !tr.enabled;
    return tr ? !tr.enabled : false;
  }, []);

  const toggleCam = useCallback(() => {
    const tr = localRef.current && localRef.current.getVideoTracks()[0];
    if (tr) tr.enabled = !tr.enabled;
    return tr ? !tr.enabled : false;
  }, []);

  const switchCamera = useCallback(async () => {
    if (!ctrlRef.current) return;
    try {
      await ctrlRef.current.switchCamera();
    } catch (e) {
      setError({ key: 'camFail' });
    }
  }, []);

  const toggleShare = useCallback(async () => {
    if (!ctrlRef.current) return;
    try {
      await ctrlRef.current.toggleShare();
    } catch (e) {
      /* picker cancelled */
    }
  }, []);

  return {
    room,
    localStream,
    streams,
    participants,
    sharing,
    error,
    clearError: () => setError(null),
    join,
    leave,
    toggleMic,
    toggleCam,
    switchCamera,
    toggleShare,
  };
}
