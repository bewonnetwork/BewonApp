import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import Avatar from './Avatar.jsx';
import Icon from './Icon.jsx';
import { useT } from '../i18n.js';
import { sendDirectText } from '../chatSend.js';

export default function Broadcast({ me, users, onClose }) {
  const { t } = useT();
  const [lists, setLists] = useState([]);
  const [mode, setMode] = useState('list'); // list | new | send
  const [cur, setCur] = useState(null);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState({});
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const col = collection(db, 'users', me.uid, 'broadcasts');

  useEffect(
    () =>
      onSnapshot(col, (s) => setLists(s.docs.map((d) => ({ id: d.id, ...d.data() })))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const ids = Object.keys(picked).filter((k) => picked[k]);

  const create = async () => {
    if (!name.trim() || !ids.length) return;
    await addDoc(col, { name: name.trim(), members: ids, createdMs: Date.now() });
    setName('');
    setPicked({});
    setMode('list');
  };

  const send = async () => {
    const body = text.trim();
    if (!body || !cur) return;
    setBusy(true);
    let n = 0;
    for (const uid of cur.members) {
      try {
        await sendDirectText(me, uid, body);
        n += 1;
      } catch (e) {
        /* ignore */
      }
    }
    setBusy(false);
    setText('');
    setMsg(t('sentTo', { n }));
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="h-icon">
          <Icon n="broadcast" size={20} /> {mode === 'new' ? t('newBroadcast') : cur && mode === 'send' ? cur.name : t('broadcastLists')}
        </h2>

        {mode === 'list' && (
          <>
            {lists.length === 0 && <div className="empty">{t('noLists')}</div>}
            <div className="pick-list" style={{ border: 0 }}>
              {lists.map((l) => (
                <div key={l.id} className="pick-row">
                  <button
                    className="grow left"
                    onClick={() => {
                      setCur(l);
                      setMsg('');
                      setMode('send');
                    }}
                  >
                    <b>{l.name}</b>
                    <div className="muted small">{l.members.length}</div>
                  </button>
                  <button className="icon-btn" onClick={() => deleteDoc(doc(db, 'users', me.uid, 'broadcasts', l.id))}>
                    <Icon n="trash" size={18} />
                  </button>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="primary" onClick={() => setMode('new')}>
                + {t('newBroadcast')}
              </button>
              <button className="ghost" onClick={onClose}>
                {t('close')}
              </button>
            </div>
          </>
        )}

        {mode === 'new' && (
          <>
            <input placeholder={t('listName')} value={name} onChange={(e) => setName(e.target.value)} />
            <div className="pick-list">
              {users.map((u) => (
                <label key={u.uid} className="pick-row">
                  <input
                    type="checkbox"
                    checked={!!picked[u.uid]}
                    onChange={(e) => setPicked({ ...picked, [u.uid]: e.target.checked })}
                  />
                  <Avatar name={u.name} photo={u.photo} size={32} />
                  <span>{u.name}</span>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button className="primary" disabled={!name.trim() || !ids.length} onClick={create}>
                {t('create')}
              </button>
              <button className="ghost" onClick={() => setMode('list')}>
                {t('cancel')}
              </button>
            </div>
          </>
        )}

        {mode === 'send' && cur && (
          <>
            <div className="muted small">{t('broadcastHint')}</div>
            <textarea
              className="bc-text"
              dir="auto"
              placeholder={t('typeMsg')}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {msg && <div className="ok">{msg}</div>}
            <div className="modal-actions">
              <button className="primary" disabled={busy || !text.trim()} onClick={send}>
                {t('send2')}
              </button>
              <button className="ghost" onClick={() => setMode('list')}>
                {t('back')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
