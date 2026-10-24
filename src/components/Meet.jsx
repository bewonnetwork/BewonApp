import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useT } from '../i18n.js';
import { WEB_URL } from '../config.js';
import { scheduleAt } from '../notify.js';
import Icon from './Icon.jsx';
import { openFile } from '../utils.js';

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

const pad = (n) => String(n).padStart(2, '0');
const icsDate = (ms) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
};
const fmtWhen = (ms) => new Date(ms).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const defaultLocal = () => {
  const d = new Date(Date.now() + 3600000);
  d.setMinutes(0, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function Meet({ me, onJoinMeeting, busy }) {
  const { t } = useT();
  const [title, setTitle] = useState('');
  const [customId, setCustomId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [sched, setSched] = useState(false);
  const [when, setWhen] = useState(defaultLocal);
  const [list, setList] = useState([]);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'meetings'), where('createdBy', '==', me.uid));
    return onSnapshot(
      q,
      (s) => setList(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((m) => m.scheduledMs && m.scheduledMs > Date.now() - 3 * 3600000).sort((a, b) => a.scheduledMs - b.scheduledMs)),
      () => {}
    );
  }, [me.uid]);

  const pickCode = async () => {
    const custom = cleanCode(customId);
    if (!custom) return newCode();
    if (custom.length < 4) throw new Error('short');
    const snap = await getDoc(doc(db, 'meetings', custom));
    if (snap.exists()) throw new Error('taken');
    return custom;
  };

  const create = async (type) => {
    setError('');
    setWorking(true);
    try {
      const c = await pickCode();
      const name = title.trim() || `${me.name}'s meeting`;
      const scheduledMs = sched ? new Date(when).getTime() : 0;
      await setDoc(doc(db, 'meetings', c), {
        title: name,
        createdBy: me.uid,
        createdName: me.name,
        createdMs: Date.now(),
        createdAt: serverTimestamp(),
        ...(scheduledMs ? { scheduledMs } : {}),
      });
      if (scheduledMs) {
        scheduleAt(name, t('meetStartsSoon'), scheduledMs - 10 * 60000);
        setTitle('');
        setCustomId('');
        setSched(false);
      } else {
        await onJoinMeeting({ code: c, title: name, type });
      }
    } catch (e) {
      setError(e.message === 'short' ? t('idShort') : e.message === 'taken' ? t('idTaken') : t('errGeneric'));
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

  const invitation = (m) =>
    `${m.title}\n${t('when')}: ${fmtWhen(m.scheduledMs)}\n${t('meetingId')}: ${m.id}\n${WEB_URL}/?meet=${m.id}`;
  const copyInvite = (m) => {
    try {
      navigator.clipboard.writeText(invitation(m));
      setCopied(m.id);
      setTimeout(() => setCopied(''), 1800);
    } catch (e) {
      /* ignore */
    }
  };
  const addCalendar = (m) => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `UID:${m.id}@bewonchat`,
      `DTSTAMP:${icsDate(Date.now())}`,
      `DTSTART:${icsDate(m.scheduledMs)}`,
      `DTEND:${icsDate(m.scheduledMs + 3600000)}`,
      `SUMMARY:${m.title}`,
      `DESCRIPTION:${WEB_URL}/?meet=${m.id}`,
      `URL:${WEB_URL}/?meet=${m.id}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    openFile({ file: `data:text/calendar;base64,${btoa(unescape(encodeURIComponent(ics)))}`, fileName: `${m.id}.ics` });
  };

  return (
    <div className="panel">
      <h3>{t('newMeeting')}</h3>
      <input placeholder={t('meetTitlePh')} value={title} dir="auto" onChange={(e) => setTitle(e.target.value)} />
      <input placeholder={t('customIdPh')} value={customId} onChange={(e) => setCustomId(e.target.value)} />
      <label className="check">
        <input type="checkbox" checked={sched} onChange={(e) => setSched(e.target.checked)} />
        <span>{t('scheduleLater')}</span>
      </label>
      {sched && <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />}
      <div className="btn-row">
        {sched ? (
          <button className="primary" disabled={busy || working} onClick={() => create('video')}>
            {t('schedule')}
          </button>
        ) : (
          <>
            <button className="primary" disabled={busy || working} onClick={() => create('video')}>
              {t('startVideo')}
            </button>
            <button className="ghost" disabled={busy || working} onClick={() => create('audio')}>
              {t('startAudio')}
            </button>
          </>
        )}
      </div>
      <p className="muted small">{t('meetHint')}</p>

      {list.length > 0 && (
        <>
          <h3>{t('upcoming')}</h3>
          {list.map((m) => (
            <div key={m.id} className="sched-card">
              <div className="grow">
                <b>{m.title}</b>
                <div className="muted small">{fmtWhen(m.scheduledMs)} · {m.id}</div>
              </div>
              <div className="sched-actions">
                <button className="primary" disabled={busy} onClick={() => onJoinMeeting({ code: m.id, title: m.title, type: 'video' })}>
                  {t('start')}
                </button>
                <button className="icon-btn" title={t('copyInvite')} onClick={() => copyInvite(m)}>
                  {copied === m.id ? <Icon n="check" size={18} /> : <Icon n="copy" size={18} />}
                </button>
                <button className="icon-btn" title={t('addCalendar')} onClick={() => addCalendar(m)}>
                  <Icon n="file" size={18} />
                </button>
                <button className="icon-btn" onClick={() => deleteDoc(doc(db, 'meetings', m.id)).catch(() => {})}>
                  <Icon n="trash" size={18} />
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      <h3>{t('joinMeeting')}</h3>
      <div className="btn-row">
        <input placeholder={t('codePh')} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && join()} />
        <button className="primary" disabled={busy || working || !code.trim()} onClick={join}>
          {t('join')}
        </button>
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
