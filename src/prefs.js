import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Chat-wise nijer pasand: pin, favourite, archive, mute (users/{uid}/prefs/{chatId})
export function usePrefs(uid) {
  const [map, setMap] = useState({});
  useEffect(() => {
    if (!uid) {
      setMap({});
      return undefined;
    }
    return onSnapshot(
      collection(db, 'users', uid, 'prefs'),
      (s) => {
        const m = {};
        s.docs.forEach((d) => {
          m[d.id] = d.data();
        });
        setMap(m);
      },
      () => {}
    );
  }, [uid]);
  const setPref = useMemo(
    () => (chatId, patch) =>
      setDoc(doc(db, 'users', uid, 'prefs', chatId), patch, { merge: true }).catch(() => {}),
    [uid]
  );
  return { prefs: map, setPref };
}
