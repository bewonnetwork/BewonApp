import { useState } from 'react';
import { useT } from '../i18n.js';
import Icon from './Icon.jsx';

// mode: 'set' (notun PIN) ba 'verify' (PIN die kholo)
export default function PinModal({ mode, lock, onDone, onClose }) {
  const { t } = useT();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (mode === 'set') {
      if (!/^\d{4,8}$/.test(a)) return setErr(t('pinShort'));
      if (a !== b) return setErr(t('pinMismatch'));
      await lock.setPin(a);
      onDone();
    } else if (await lock.verify(a)) {
      onDone();
    } else {
      setErr(t('wrongPin'));
      setA('');
    }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className="h-icon">
          <Icon n="lock" size={20} /> {mode === 'set' ? t('setPin') : t('enterPin')}
        </h2>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          maxLength={8}
          placeholder="PIN"
          value={a}
          onChange={(e) => setA(e.target.value.replace(/\D/g, ''))}
        />
        {mode === 'set' && (
          <>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              placeholder={t('confirmPin')}
              value={b}
              onChange={(e) => setB(e.target.value.replace(/\D/g, ''))}
            />
            <div className="muted small">{t('pinNote')}</div>
          </>
        )}
        {err && <div className="error">{err}</div>}
        <div className="modal-actions">
          <button className="primary">OK</button>
          <button type="button" className="ghost" onClick={onClose}>
            {t('cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
