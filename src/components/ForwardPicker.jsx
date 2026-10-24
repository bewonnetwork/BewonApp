import { useState } from 'react';
import { useT } from '../i18n.js';
import { sendPayload } from '../chatSend.js';
import { chatIdFor } from '../utils.js';
import Avatar from './Avatar.jsx';

export default function ForwardPicker({ me, users, groups, payload, onClose }) {
  const { t } = useT();
  const [done, setDone] = useState({});
  const go = async (key, chatId, members, isGroup) => {
    setDone((d) => ({ ...d, [key]: 'x' }));
    try {
      await sendPayload(me, chatId, members, isGroup, payload);
      setDone((d) => ({ ...d, [key]: 'ok' }));
    } catch (e) {
      setDone((d) => ({ ...d, [key]: '' }));
    }
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('forwardTo')}</h2>
        <div className="pick-list">
          {groups.map((g) => (
            <div key={g.id} className="pick-row">
              <Avatar name={g.name} group size={32} />
              <span className="grow">{g.name}</span>
              <button className="ghost" disabled={!!done[g.id]} onClick={() => go(g.id, g.id, g.members, true)}>
                {done[g.id] === 'ok' ? t('sent') : t('send2')}
              </button>
            </div>
          ))}
          {users.map((u) => (
            <div key={u.uid} className="pick-row">
              <Avatar name={u.name} photo={u.photo} size={32} />
              <span className="grow">{u.name}</span>
              <button className="ghost" disabled={!!done[u.uid]} onClick={() => go(u.uid, chatIdFor(me.uid, u.uid), [me.uid, u.uid], false)}>
                {done[u.uid] === 'ok' ? t('sent') : t('send2')}
              </button>
            </div>
          ))}
        </div>
        <button className="ghost" onClick={onClose}>
          {t('close')}
        </button>
      </div>
    </div>
  );
}
