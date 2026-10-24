import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useT } from '../i18n.js';
import { bioAuth, bioAvailable, hashPin, loadSec, newSecret, saveSec, verifyTotp } from '../security.js';
import Icon from './Icon.jsx';

export default function SecuritySettings({ uid, email }) {
  const { t } = useT();
  const [sec, setSec] = useState(() => loadSec(uid));
  const [bioOk, setBioOk] = useState(false);
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [setup, setSetup] = useState(null); // { secret, qr }
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    bioAvailable().then(setBioOk);
  }, []);

  const update = (next) => {
    setSec(next);
    saveSec(uid, next);
  };

  const enableLock = async () => {
    if (!/^\d{4,8}$/.test(pin1)) return setMsg(t('pinShort'));
    if (pin1 !== pin2) return setMsg(t('pinMismatch'));
    update({ ...sec, pin: await hashPin(uid, pin1) });
    setPin1('');
    setPin2('');
    setMsg('');
  };
  const disableLock = () => update({});

  const toggleBio = async () => {
    if (sec.bio) return update({ ...sec, bio: false });
    if (await bioAuth(t('unlockApp'))) update({ ...sec, bio: true });
  };

  const startTotp = async () => {
    const secret = newSecret();
    const uri = `otpauth://totp/BewonChat:${encodeURIComponent(email || uid)}?secret=${secret}&issuer=BewonChat`;
    const qr = await QRCode.toDataURL(uri, { margin: 1, width: 180 });
    setSetup({ secret, qr });
    setCode('');
  };
  const confirmTotp = async () => {
    if (await verifyTotp(setup.secret, code)) {
      update({ ...sec, totp: setup.secret });
      setSetup(null);
      setMsg('');
    } else setMsg(t('codeWrong'));
  };

  return (
    <div className="sec-box">
      <h3 className="h-icon">
        <Icon n="lock" size={18} /> {t('security')}
      </h3>
      {!sec.pin ? (
        <>
          <div className="muted small">{t('appLockHint')}</div>
          <input type="password" inputMode="numeric" maxLength={8} placeholder="PIN" value={pin1} onChange={(e) => setPin1(e.target.value.replace(/\D/g, ''))} />
          <input type="password" inputMode="numeric" maxLength={8} placeholder={t('confirmPin')} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} />
          <button className="ghost" onClick={enableLock}>
            {t('appLock')}
          </button>
        </>
      ) : (
        <>
          <div className="ok">{t('appLock')}: ON</div>
          {bioOk && (
            <label className="check">
              <input type="checkbox" checked={!!sec.bio} onChange={toggleBio} />
              <span>{t('fingerprint')}</span>
            </label>
          )}
          {!sec.totp && !setup && (
            <button className="ghost" onClick={startTotp}>
              {t('authenticator')}
            </button>
          )}
          {sec.totp && (
            <button className="ghost" onClick={() => update({ ...sec, totp: '' })}>
              {t('authenticator')}: ON · {t('remove')}
            </button>
          )}
          {setup && (
            <div className="totp-box">
              <div className="muted small">{t('scanQr')}</div>
              <img src={setup.qr} alt="QR" width="180" height="180" />
              <code className="secret">{setup.secret}</code>
              <input inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
              <button className="primary" onClick={confirmTotp}>
                OK
              </button>
            </div>
          )}
          <button className="link danger" onClick={disableLock}>
            {t('appLock')}: {t('remove')}
          </button>
        </>
      )}
      {msg && <div className="error">{msg}</div>}
    </div>
  );
}
