import { useEffect, useRef, useState } from 'react';
import { addDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { speechCode, sameLang } from './i18n.js';
import { translateText } from './translate.js';
import { IS_NATIVE } from './config.js';

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
export const speechInputSupported = !!SR || IS_NATIVE;

/**
 * Voice call-e live translate.
 * - Tumi jeta bolo: browser nijer bhasha-y text kore (speech recognition), Firestore diye onno pash-e pathay.
 * - Onno pash-er kotha: tomar bhasha-y translate hoye caption hishebe ashe (chaile awaj-o kore pore).
 */
export function useLiveTranslate({ callId, enabled, speak, me }) {
  const [lines, setLines] = useState([]);
  const [micState, setMicState] = useState('idle'); // idle | listening | denied | unsupported
  const speakRef = useRef(speak);
  const speakingRef = useRef(false);
  const recRef = useRef(null);
  speakRef.current = speak;

  const addLine = (l) => setLines((prev) => [...prev.slice(-5), l]);

  // Nijer kotha -> text -> pathao
  useEffect(() => {
    if (!callId || !enabled) return undefined;
    let stopped = false;
    // APK (Android): native speech recognition plugin
    if (!SR && IS_NATIVE) {
      (async () => {
        try {
          const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
          const perm = await SpeechRecognition.requestPermissions();
          if (perm.speechRecognition !== 'granted') {
            setMicState('denied');
            return;
          }
          setMicState('listening');
          while (!stopped) {
            try {
              const r = await SpeechRecognition.start({
                language: speechCode(me.lang),
                maxResults: 1,
                partialResults: false,
                popup: false,
              });
              const text = ((r && r.matches && r.matches[0]) || '').trim();
              if (text && !speakingRef.current && !stopped) {
                addLine({ id: `me${Date.now()}`, mine: true, text });
                addDoc(collection(db, 'calls', callId, 'captions'), {
                  from: me.uid,
                  text,
                  lang: me.lang,
                  createdMs: Date.now(),
                }).catch(() => {});
              }
            } catch (e) {
              await new Promise((res) => setTimeout(res, 1200));
            }
          }
        } catch (e) {
          setMicState('unsupported');
        }
      })();
      return () => {
        stopped = true;
        setMicState('idle');
        import('@capacitor-community/speech-recognition')
          .then(({ SpeechRecognition }) => SpeechRecognition.stop())
          .catch(() => {});
      };
    }
    if (!SR) {
      setMicState('unsupported');
      return undefined;
    }
    const start = () => {
      if (stopped) return;
      const rec = new SR();
      recRef.current = rec;
      rec.lang = speechCode(me.lang);
      rec.continuous = true;
      rec.interimResults = false;
      rec.onstart = () => setMicState('listening');
      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i += 1) {
          if (!e.results[i].isFinal) continue;
          const text = (e.results[i][0].transcript || '').trim();
          if (!text || speakingRef.current) continue;
          addLine({ id: `me${Date.now()}${i}`, mine: true, text });
          addDoc(collection(db, 'calls', callId, 'captions'), {
            from: me.uid,
            text,
            lang: me.lang,
            createdMs: Date.now(),
          }).catch(() => {});
        }
      };
      rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          stopped = true;
          setMicState('denied');
        }
      };
      rec.onend = () => {
        if (!stopped) setTimeout(start, 300);
      };
      try {
        rec.start();
      } catch (e) {
        /* already started */
      }
    };
    start();
    return () => {
      stopped = true;
      setMicState('idle');
      try {
        if (recRef.current) recRef.current.abort();
      } catch (e) {
        /* ignore */
      }
    };
  }, [callId, enabled, me.lang, me.uid]);

  // Onno pash-er kotha -> amar bhasha-y
  useEffect(() => {
    setLines([]);
    if (!callId || !enabled) return undefined;
    const startMs = Date.now();
    const unsub = onSnapshot(
      collection(db, 'calls', callId, 'captions'),
      (snap) => {
        snap.docChanges().forEach(async (ch) => {
          if (ch.type !== 'added') return;
          const d = ch.doc.data();
          if (d.from === me.uid || (d.createdMs || 0) < startMs - 4000) return;
          let text = d.text;
          if (!sameLang(d.lang, me.lang)) {
            const r = await translateText(d.text, d.lang, me.lang);
            if (r && r.text) text = r.text;
          }
          addLine({ id: ch.doc.id, mine: false, text, original: d.text });
          if (speakRef.current && window.speechSynthesis) {
            try {
              const u = new SpeechSynthesisUtterance(text);
              u.lang = speechCode(me.lang);
              speakingRef.current = true;
              const done = () => {
                setTimeout(() => {
                  speakingRef.current = false;
                }, 500);
              };
              u.onend = done;
              u.onerror = done;
              window.speechSynthesis.speak(u);
            } catch (e) {
              speakingRef.current = false;
            }
          }
        });
      },
      () => {}
    );
    return () => {
      unsub();
      try {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
      } catch (e) {
        /* ignore */
      }
    };
  }, [callId, enabled, me.lang, me.uid]);

  return { lines, micState };
}
