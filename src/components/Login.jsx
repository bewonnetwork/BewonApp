import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase';
import { LANGS, useT } from '../i18n.js';

const errKey = (code) => {
  switch (code) {
    case 'auth/invalid-email':
      return 'errEmail';
    case 'auth/missing-password':
    case 'auth/weak-password':
      return 'errPass';
    case 'auth/email-already-in-use':
      return 'errExists';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'errCred';
    case 'auth/operation-not-allowed':
      return 'errDisabled';
    default:
      return 'errGeneric';
  }
};

export default function Login({ lang, onLang }) {
  const { t } = useT();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'signup' && !name.trim()) {
      setError(t('errName'));
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        // Profile document App.jsx toiri kore; tar jonno nam ar bhasha age rekhe dei
        try {
          localStorage.setItem('cc_pending_name', name.trim());
          localStorage.setItem('cc_lang', lang);
        } catch (err) {
          /* ignore */
        }
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      setError(t(errKey(err.code)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="logo">💬</div>
        <h1>ChatCall</h1>
        <p className="sub">{t('tagline')}</p>

        <label className="field-label" htmlFor="lang">
          🌐 {t('language')}
        </label>
        <select id="lang" value={lang} onChange={(e) => onLang(e.target.value)}>
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>

        {mode === 'signup' && (
          <input
            placeholder={t('yourName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        )}
        <input
          type="email"
          placeholder={t('email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          type="password"
          placeholder={t('password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />

        {error && <div className="error">{error}</div>}

        <button className="primary" disabled={busy}>
          {busy ? t('wait') : mode === 'signup' ? t('signup') : t('login')}
        </button>

        <button
          type="button"
          className="link"
          onClick={() => {
            setMode(mode === 'signup' ? 'login' : 'signup');
            setError('');
          }}
        >
          {mode === 'signup' ? t('haveAcc') : t('newHere')}
        </button>
      </form>
    </div>
  );
}
