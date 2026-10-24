import { useEffect, useState } from 'react';
import { useT } from '../i18n.js';
import { bioAuth, hashPin, loadSec, verifyTotp } from '../security.js';
import Icon from './Icon.jsx';

// App kholar shomoy PIN / fingerprint, tarpor (chalu thakle) Authenticator code
export default function AppLock({ uid, onOpen }) {
  const { t } = useT();
  const sec = loadSec(uid);
  const [step, setStep] = useState('first'); // first | code
  const [pin, setPin] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  const afterFirst = () => {
    if (sec.totp) setStep('code');
    else onOpen();
  };

  useEffect(() => {
    if (sec.bio) bioAuth(t('unlockApp')).then((ok) => ok && afterFirst());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitPin = async (e) => {
    e.preventDefault();
    if ((await hashPin(uid, pin)) === sec.pin) afterFirst();
    else {
      setErr(t('wrongPin'));
      setPin('');
    }
  };
  const submitCode = async (e) => {
    e.preventDefault();
    if (await verifyTotp(sec.totp, code)) onOpen();
    else {
      setErr(t('codeWrong'));
      setCode('');
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <img className="logo-img" src="/logo.png" alt="BewonChat" />
        <h1>BewonChat</h1>
        {step === 'first' ? (
          <form onSubmit={submitPin} className="lock-form">
            <p className="sub">{t('unlockApp')}</p>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              maxLength={8}
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
            {err && <div className="error">{err}</div>}
            <button className="primary">OK</button>
            {sec.bio && (
              <button type="button" className="ghost" onClick={() => bioAuth(t('unlockApp')).then((ok) => ok && afterFirst())}>
                <Icon n="lock" size={16} /> {t('fingerprint')}
              </button>
            )}
          </form>
        ) : (
          <form onSubmit={submitCode} className="lock-form">
            <p className="sub">{t('enterCode')}</p>
            <input
              inputMode="numeric"
              autoFocus
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            {err && <div className="error">{err}</div>}
            <button className="primary">OK</button>
          </form>
        )}
      </div>
    </div>
  );
}
