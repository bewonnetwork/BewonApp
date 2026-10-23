import { useEffect, useState } from 'react';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import Avatar from './Avatar.jsx';
import Icon from './Icon.jsx';
import { useT } from '../i18n.js';

export default function Communities({ me, users, chats, onOpenGroup }) {
  const { t } = useT();
  const [list, setList] = useState([]);
  const [cur, setCur] = useState(null);
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState({});

  useEffect(() => {
    const q = query(collection(db, 'communities'), where('members', 'array-contains', me.uid));
    return onSnapshot(
      q,
      (s) => setList(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => console.warn('communities', e)
    );
  }, [me.uid]);

  const ids = Object.keys(picked).filter((k) => picked[k]);
  const groupById = (id) => chats.find((c) => c.id === id);
  const active = cur && list.find((c) => c.id === cur);

  const create = async () => {
    if (!name.trim()) return;
    const members = [me.uid, ...ids];
    const g = await addDoc(collection(db, 'chats'), {
      isGroup: true,
      name: `${name.trim()} · ${t('announcements')}`,
      members,
      createdBy: me.uid,
      lastMessage: '',
      lastType: 'text',
      updatedAt: serverTimestamp(),
      unread: {},
      lastRead: {},
      typing: {},
    });
    await addDoc(collection(db, 'communities'), {
      name: name.trim(),
      createdBy: me.uid,
      members,
      groupIds: [g.id],
      createdMs: Date.now(),
    });
    setCreating(false);
    setName('');
    setPicked({});
  };

  const addGroup = async (gid) => {
    await updateDoc(doc(db, 'communities', active.id), { groupIds: arrayUnion(gid) });
    setAdding(false);
  };

  if (creating) {
    return (
      <div className="panel">
        <h3>{t('newCommunity')}</h3>
        <input placeholder={t('communityName')} value={name} onChange={(e) => setName(e.target.value)} />
        <div className="pick-list">
          {users
            .filter((u) => u.uid !== me.uid)
            .map((u) => (
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
        <div className="btn-row">
          <button className="primary" disabled={!name.trim()} onClick={create}>
            {t('create')}
          </button>
          <button className="ghost" onClick={() => setCreating(false)}>
            {t('cancel')}
          </button>
        </div>
      </div>
    );
  }

  if (active) {
    const myGroups = chats.filter((c) => c.isGroup && !active.groupIds.includes(c.id));
    return (
      <div className="user-list">
        <div className="sub-head">
          <button className="icon-btn" onClick={() => setCur(null)}>
            <Icon n="back" />
          </button>
          <b className="grow ellipsis">{active.name}</b>
        </div>
        {active.groupIds.map((gid) => {
          const g = groupById(gid);
          return (
            <button key={gid} className="status-row" onClick={() => g && onOpenGroup(gid)} disabled={!g}>
              <Avatar name={g ? g.name : '?'} group size={40} />
              <div className="grow left">
                <div className="name ellipsis">{g ? g.name : '…'}</div>
              </div>
            </button>
          );
        })}
        <div className="panel">
          <button className="ghost" onClick={() => setAdding((v) => !v)}>
            + {t('addGroup')}
          </button>
          {adding &&
            (myGroups.length === 0 ? (
              <div className="empty">{t('noGroupsToAdd')}</div>
            ) : (
              myGroups.map((g) => (
                <button key={g.id} className="status-row" onClick={() => addGroup(g.id)}>
                  <Avatar name={g.name} group size={36} />
                  <span className="name">{g.name}</span>
                </button>
              ))
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="user-list">
      <button className="status-row" onClick={() => setCreating(true)}>
        <span className="comm-new">
          <Icon n="people" size={22} />
        </span>
        <div className="grow left">
          <div className="name">{t('newCommunity')}</div>
        </div>
      </button>
      {list.length === 0 && <div className="empty">{t('noCommunities')}</div>}
      {list.map((c) => (
        <button key={c.id} className="status-row" onClick={() => setCur(c.id)}>
          <span className="comm-ico">
            <Icon n="people" size={22} />
          </span>
          <div className="grow left">
            <div className="name ellipsis">{c.name}</div>
            <div className="muted small">
              {c.groupIds.length} · {c.members.length} {t('members2')}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
