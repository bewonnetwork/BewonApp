import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { signOut, updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import { LANGS, useT } from '../i18n.js';

export default function Settings({ me, onClose }) {
  const { t } = useT();
  const [name, setName] = useState(me.name || '');
  const [about, setAbout] = useState(me.about || '');
  const [lang, setLang] = useState(me.lang || 'en');
  const [auto, setAuto] = useState(me.autoTranslate !== false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'users', me.uid), {
        name: name.trim(),
        about: about.trim(),
        lang,
        autoTranslate: auto,
      });
      try {
        localStorage.setItem('cc_lang', lang);
        if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: name.trim() });
      } catch (e) {
        /* ignore */
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('yourProfile')}</h2>

        <label className="field-label">{t('yourName')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />

        <label className="field-label">{t('about')}</label>
        <input value={about} placeholder={t('aboutPh')} onChange={(e) => setAbout(e.target.value)} />

        <label className="field-label">🌐 {t('language')}</label>
        <select value={lang} onChange={(e) => setLang(e.target.value)}>
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>

        <label className="check">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          <span>
            {t('autoTr')}
            <small>{t('autoTrHint')}</small>
          </span>
        </label>

        <div className="modal-actions">
          <button className="primary" disabled={busy} onClick={save}>
            {saved ? t('saved') : t('save')}
          </button>
          <button className="ghost" onClick={onClose}>
            {t('close')}
          </button>
        </div>
        <button className="link danger" onClick={() => signOut(auth)}>
          ⎋ {t('logout')}
        </button>
      </div>
    </div>
  );
}
