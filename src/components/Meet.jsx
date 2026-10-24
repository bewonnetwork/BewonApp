import { useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useT } from '../i18n.js';

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const rand = (n) => {
  let s = '';
  const buf = new Uint32Array(n);
  crypto.getRandomValues(buf);
  for (let i = 0; i < n; i += 1) s += ALPHABET[buf[i] % ALPHABET.length];
  return s;
};
export const newCode = () => `${rand(3)}-${rand(4)}-${rand(3)}`;
export const cleanCode = (c) => c.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

export default function Meet({ me, onJoinMeeting, busy }) {
  const { t } = useT();
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  const create = async (type) => {
    setError('');
    setWorking(true);
    try {
      const c = newCode();
      const name = title.trim() || `${me.name}'s meeting`;
      await setDoc(doc(db, 'meetings', c), {
        title: name,
        createdBy: me.uid,
        createdName: me.name,
        createdMs: Date.now(),
        createdAt: serverTimestamp(),
      });
      await onJoinMeeting({ code: c, title: name, type });
    } catch (e) {
      setError(t('errGeneric'));
    } finally {
      setWorking(false);
    }
  };

  const join = async () => {
    setError('');
    const c = cleanCode(code);
    if (!c) return;
    setWorking(true);
    try {
      const snap = await getDoc(doc(db, 'meetings', c));
      if (!snap.exists()) {
        setError(t('meetNotFound'));
      } else {
        await onJoinMeeting({ code: c, title: snap.data().title || c, type: 'video' });
      }
    } catch (e) {
      setError(t('meetNotFound'));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="panel">
      <h3>{t('newMeeting')}</h3>
      <input
        placeholder={t('meetTitlePh')}
        value={title}
        dir="auto"
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="btn-row">
        <button className="primary" disabled={busy || working} onClick={() => create('video')}>
          {t('startVideo')}
        </button>
        <button className="ghost" disabled={busy || working} onClick={() => create('audio')}>
          {t('startAudio')}
        </button>
      </div>
      <p className="muted small">{t('meetHint')}</p>

      <h3>{t('joinMeeting')}</h3>
      <div className="btn-row">
        <input
          placeholder={t('codePh')}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && join()}
        />
        <button className="primary" disabled={busy || working || !code.trim()} onClick={join}>
          {t('join')}
        </button>
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
