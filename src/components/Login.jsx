import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const friendly = (code) => {
  switch (code) {
    case 'auth/invalid-email':
      return 'Email thik nai.';
    case 'auth/missing-password':
    case 'auth/weak-password':
      return 'Password komti 6 character hote hobe.';
    case 'auth/email-already-in-use':
      return 'Ei email diye already account ache. Login koro.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email ba password vul.';
    case 'auth/operation-not-allowed':
      return 'Firebase Console-e Email/Password sign-in chalu koro.';
    default:
      return 'Kichu ekta vul hoyeche, abar chesta koro.';
  }
};

export default function Login() {
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
      setError('Tomar nam likho.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          createdAt: serverTimestamp(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      setError(friendly(err.code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="logo">💬</div>
        <h1>ChatCall</h1>
        <p className="sub">Message ar call, ek jaygay</p>

        {mode === 'signup' && (
          <input
            placeholder="Tomar nam"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Password (kom pokkhe 6 character)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />

        {error && <div className="error">{error}</div>}

        <button className="primary" disabled={busy}>
          {busy ? 'Wait koro...' : mode === 'signup' ? 'Account kholo' : 'Login'}
        </button>

        <button
          type="button"
          className="link"
          onClick={() => {
            setMode(mode === 'signup' ? 'login' : 'signup');
            setError('');
          }}
        >
          {mode === 'signup' ? 'Already account ache? Login koro' : 'Notun? Account kholo'}
        </button>
      </form>
    </div>
  );
}
