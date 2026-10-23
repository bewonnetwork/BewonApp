import Icon from './Icon.jsx';
import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useT } from '../i18n.js';
import Avatar from './Avatar.jsx';
import { fmtDayOrTime, fmtDur } from '../utils.js';

export default function CallLog({ me, usersMap, onCall, callBusy }) {
  const { t } = useT();
  const [out, setOut] = useState([]);
  const [inc, setInc] = useState([]);

  useEffect(() => {
    const u1 = onSnapshot(
      query(collection(db, 'calls'), where('callerId', '==', me.uid)),
      (s) => setOut(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    const u2 = onSnapshot(
      query(collection(db, 'calls'), where('calleeId', '==', me.uid)),
      (s) => setInc(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return () => {
      u1();
      u2();
    };
  }, [me.uid]);

  const items = useMemo(
    () =>
      [...out.map((c) => ({ ...c, dir: 'out' })), ...inc.map((c) => ({ ...c, dir: 'in' }))]
        .sort((a, b) => (b.createdMs || 0) - (a.createdMs || 0))
        .slice(0, 100),
    [out, inc]
  );

  if (!items.length) return <div className="empty">{t('noCalls')}</div>;

  return (
    <div className="user-list">
      {items.map((c) => {
        const peerId = c.dir === 'out' ? c.calleeId : c.callerId;
        const peer = usersMap[peerId];
        const name = (peer && peer.name) || (c.dir === 'out' ? c.calleeName : c.callerName) || '?';
        const answered = !!c.answeredMs;
        let label;
        let bad = false;
        if (answered) {
          label = `${c.dir === 'out' ? t('outgoing') : t('incomingLbl')}${
            c.endedMs ? ` · ${fmtDur((c.endedMs - c.answeredMs) / 1000)}` : ''
          }`;
        } else if (c.dir === 'in') {
          label = t('missed');
          bad = true;
        } else {
          label = c.status === 'rejected' ? t('declinedLbl') : t('cancelledLbl');
        }
        return (
          <div key={c.id} className="user-row">
            <div className="user-main" style={{ cursor: 'default' }}>
              <Avatar name={name} />
              <div className="grow left">
                <div className="row-top">
                  <span className="name">{name}</span>
                  <span className="muted small">{fmtDayOrTime(c.createdMs)}</span>
                </div>
                <div className={`small ${bad ? 'bad' : 'muted'}`}>
                  {c.dir === 'out' ? '↗' : '↙'}  {label}
                </div>
              </div>
            </div>
            {peer && (
              <>
                <button
                  className="icon-btn"
                  disabled={callBusy}
                  title={t('voiceCall')}
                  onClick={() => onCall(peer, 'audio')}
                >
                  <Icon n="phone" size={19} />
                </button>
                <button
                  className="icon-btn"
                  disabled={callBusy}
                  title={t('videoCall')}
                  onClick={() => onCall(peer, 'video')}
                >
                  <Icon n="video" size={19} />
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
