import { useState } from 'react';
import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useT } from '../i18n.js';
import Avatar from './Avatar.jsx';

export default function GroupInfo({ me, group, users, usersMap, onClose, onLeft }) {
  const { t } = useT();
  const [adding, setAdding] = useState(false);
  const isAdmin = group.createdBy === me.uid;
  const ref = doc(db, 'chats', group.id);
  const others = users.filter((u) => !group.members.includes(u.uid));

  const leave = async () => {
    await updateDoc(ref, { members: arrayRemove(me.uid) }).catch(() => {});
    onLeft();
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{group.name}</h2>
        <div className="muted small">{t('members', { n: group.members.length })}</div>
        <div className="pick-list">
          {group.members.map((uid) => (
            <div key={uid} className="pick-row">
              <Avatar name={(usersMap[uid] && usersMap[uid].name) || '?'} photo={usersMap[uid] && usersMap[uid].photo} size={32} />
              <span className="grow">
                {uid === me.uid ? t('you') : (usersMap[uid] && usersMap[uid].name) || '…'}
                {uid === group.createdBy ? ` · ${t('admin')}` : ''}
              </span>
              {isAdmin && uid !== me.uid && (
                <button className="link danger" onClick={() => updateDoc(ref, { members: arrayRemove(uid) }).catch(() => {})}>
                  {t('removeMember')}
                </button>
              )}
            </div>
          ))}
        </div>
        {isAdmin && (
          <>
            <button className="ghost" onClick={() => setAdding((v) => !v)}>
              + {t('addMembers')}
            </button>
            {adding &&
              others.map((u) => (
                <div key={u.uid} className="pick-row">
                  <Avatar name={u.name} photo={u.photo} size={32} />
                  <span className="grow">{u.name}</span>
                  <button className="ghost" onClick={() => updateDoc(ref, { members: arrayUnion(u.uid) }).catch(() => {})}>
                    {t('invite')}
                  </button>
                </div>
              ))}
          </>
        )}
        <button className="link danger" onClick={leave}>
          {t('leaveGroup')}
        </button>
        <button className="ghost" onClick={onClose}>
          {t('close')}
        </button>
      </div>
    </div>
  );
}
