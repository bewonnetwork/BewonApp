import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useT } from '../i18n.js';
import Avatar from './Avatar.jsx';

export default function NewGroup({ me, users, onClose, onCreated }) {
  const { t } = useT();
  const [name, setName] = useState('');
  const [picked, setPicked] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ids = Object.keys(picked).filter((k) => picked[k]);

  const create = async () => {
    if (!name.trim() || ids.length < 1) {
      setError(t('groupNeed'));
      return;
    }
    setBusy(true);
    try {
      const ref = await addDoc(collection(db, 'chats'), {
        isGroup: true,
        name: name.trim(),
        members: [me.uid, ...ids],
        createdBy: me.uid,
        lastMessage: '',
        lastType: 'text',
        updatedAt: serverTimestamp(),
        unread: {},
        lastRead: {},
        typing: {},
      });
      onCreated(ref.id);
    } catch (e) {
      setError(t('errGeneric'));
      setBusy(false);
    }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('newGroup')}</h2>
        <input placeholder={t('groupName')} value={name} onChange={(e) => setName(e.target.value)} />
        <label className="field-label">{t('pickMembers')}</label>
        <div className="pick-list">
          {users.map((u) => (
            <label key={u.uid} className="pick-row">
              <input
                type="checkbox"
                checked={!!picked[u.uid]}
                onChange={(e) => setPicked({ ...picked, [u.uid]: e.target.checked })}
              />
              <Avatar name={u.name} size={32} />
              <span>{u.name}</span>
            </label>
          ))}
        </div>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button className="primary" disabled={busy} onClick={create}>
            {t('create')}
          </button>
          <button className="ghost" onClick={onClose}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
