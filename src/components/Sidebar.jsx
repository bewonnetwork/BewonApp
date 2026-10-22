import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';

export const chatIdFor = (a, b) => [a, b].sort().join('_');

const initials = (name = '?') => name.trim().slice(0, 1).toUpperCase();

const timeLabel = (ts) => {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

export default function Sidebar({ me, selectedUid, onSelect, onCall, callBusy }) {
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState({});
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setLoadError('');
        setUsers(snap.docs.map((d) => d.data()).filter((u) => u.uid !== me.uid));
      },
      (err) => setLoadError(`User list load hoyni (${err.code}). Firestore rules deploy kora ache kina dekho.`)
    );
    return unsub;
  }, [me.uid]);

  useEffect(() => {
    const q = query(collection(db, 'chats'), where('members', 'array-contains', me.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const map = {};
        snap.docs.forEach((d) => {
          map[d.id] = d.data();
        });
        setChats(map);
      },
      () => {}
    );
    return unsub;
  }, [me.uid]);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return users
      .filter((u) => !s || u.name?.toLowerCase().includes(s) || u.email?.includes(s))
      .map((u) => ({ ...u, chat: chats[chatIdFor(me.uid, u.uid)] }))
      .sort((a, b) => {
        const ta = a.chat?.updatedAt?.toMillis?.() || 0;
        const tb = b.chat?.updatedAt?.toMillis?.() || 0;
        if (ta !== tb) return tb - ta;
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [users, chats, search, me.uid]);

  return (
    <aside className="sidebar">
      <header className="side-head">
        <div className="avatar me">{initials(me.name)}</div>
        <div className="grow">
          <div className="name">{me.name}</div>
          <div className="muted small">{me.email}</div>
        </div>
        <button className="icon-btn" title="Logout" onClick={() => signOut(auth)}>
          ⎋
        </button>
      </header>

      <div className="search-box">
        <input
          placeholder="Khojo ba notun chat shuru koro"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="user-list">
        {loadError && <div className="empty">{loadError}</div>}
        {!loadError && list.length === 0 && (
          <div className="empty">
            {users.length === 0
              ? 'Ekhono ar keu join kore nai. Onno device/browser theke onno email diye account kholo, tahole ekhane dekhabe.'
              : 'Kauke paoa jayni.'}
          </div>
        )}
        {list.map((u) => (
          <div key={u.uid} className={`user-row ${selectedUid === u.uid ? 'active' : ''}`}>
            <button className="user-main" onClick={() => onSelect(u)}>
              <div className="avatar">{initials(u.name)}</div>
              <div className="grow left">
                <div className="row-top">
                  <span className="name">{u.name}</span>
                  <span className="muted small">{timeLabel(u.chat?.updatedAt)}</span>
                </div>
                <div className="muted small ellipsis">
                  {u.chat?.lastMessage || 'Message pathao'}
                </div>
              </div>
            </button>
            <button
              className="icon-btn"
              title="Voice call"
              disabled={callBusy}
              onClick={() => onCall(u, 'audio')}
            >
              📞
            </button>
            <button
              className="icon-btn"
              title="Video call"
              disabled={callBusy}
              onClick={() => onCall(u, 'video')}
            >
              🎥
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
