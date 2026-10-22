import { useMemo, useState } from 'react';
import Avatar from './Avatar.jsx';
import CallLog from './CallLog.jsx';
import { useT } from '../i18n.js';
import { chatIdFor, fmtDayOrTime, tsMs } from '../utils.js';

export default function Sidebar({
  me,
  users,
  usersMap,
  chats,
  chatsById,
  loadError,
  selectedKey,
  onSelect,
  onCall,
  callBusy,
  onSettings,
  onNewGroup,
}) {
  const { t } = useT();
  const [tab, setTab] = useState('chats');
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    const s = search.trim().toLowerCase();
    const directs = users
      .filter((u) => u.uid !== me.uid)
      .map((u) => ({
        key: chatIdFor(me.uid, u.uid),
        kind: 'direct',
        user: u,
        name: u.name || '',
        chat: chatsById[chatIdFor(me.uid, u.uid)],
      }));
    const groups = chats
      .filter((c) => c.isGroup)
      .map((c) => ({ key: c.id, kind: 'group', name: c.name || '', chat: c }));
    return [...directs, ...groups]
      .filter((i) => !s || i.name.toLowerCase().includes(s) || (i.user && (i.user.email || '').includes(s)))
      .sort((a, b) => {
        const ta = tsMs(a.chat && a.chat.updatedAt);
        const tb = tsMs(b.chat && b.chat.updatedAt);
        if (ta !== tb) return tb - ta;
        return a.name.localeCompare(b.name);
      });
  }, [users, chats, chatsById, search, me.uid]);

  const previewOf = (chat) => {
    if (!chat || (!chat.lastMessage && !chat.lastType)) return t('sayHi');
    let body = chat.lastMessage;
    if (chat.lastType === 'image') body = t('photo');
    else if (chat.lastType === 'audio') body = t('voiceMsg');
    if (!body) return t('sayHi');
    return chat.lastFrom === me.uid ? `${t('you')}: ${body}` : body;
  };

  const totalUnread = chats.reduce((n, c) => n + ((c.unread && c.unread[me.uid]) || 0), 0);

  return (
    <aside className="sidebar">
      <header className="side-head">
        <button className="avatar-btn" onClick={onSettings} title={t('settings')}>
          <Avatar name={me.name} size={40} />
        </button>
        <div className="grow">
          <div className="name ellipsis">{me.name}</div>
          <div className="muted small ellipsis">{me.email}</div>
        </div>
        <button className="icon-btn" title={t('newGroup')} onClick={onNewGroup}>
          👥
        </button>
        <button className="icon-btn" title={t('settings')} onClick={onSettings}>
          ⚙️
        </button>
      </header>

      <div className="tabs">
        <button className={tab === 'chats' ? 'on' : ''} onClick={() => setTab('chats')}>
          {t('chats')}
          {totalUnread > 0 && <span className="badge">{totalUnread}</span>}
        </button>
        <button className={tab === 'calls' ? 'on' : ''} onClick={() => setTab('calls')}>
          {t('calls')}
        </button>
      </div>

      {tab === 'calls' ? (
        <CallLog me={me} usersMap={usersMap} onCall={onCall} callBusy={callBusy} />
      ) : (
        <>
          <div className="search-box">
            <input placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} dir="auto" />
          </div>

          <div className="user-list">
            {loadError && <div className="empty">{t('loadFail', { code: loadError })}</div>}
            {!loadError && items.length === 0 && (
              <div className="empty">{users.length <= 1 ? t('noUsers') : t('noResults')}</div>
            )}
            {items.map((i) => {
              const unread = (i.chat && i.chat.unread && i.chat.unread[me.uid]) || 0;
              return (
                <div key={i.key} className={`user-row ${selectedKey === i.key ? 'active' : ''}`}>
                  <button
                    className="user-main"
                    onClick={() => onSelect(i.kind === 'direct' ? { type: 'direct', uid: i.user.uid } : { type: 'group', id: i.key })}
                  >
                    <Avatar name={i.name} group={i.kind === 'group'} />
                    <div className="grow left">
                      <div className="row-top">
                        <span className="name ellipsis">{i.name}</span>
                        <span className={`small ${unread ? 'unread-time' : 'muted'}`}>
                          {fmtDayOrTime(tsMs(i.chat && i.chat.updatedAt))}
                        </span>
                      </div>
                      <div className="row-top">
                        <span className="muted small ellipsis" dir="auto">
                          {previewOf(i.chat)}
                        </span>
                        {unread > 0 && <span className="badge">{unread}</span>}
                      </div>
                    </div>
                  </button>
                  {i.kind === 'direct' && (
                    <>
                      <button
                        className="icon-btn"
                        title={t('voiceCall')}
                        disabled={callBusy}
                        onClick={() => onCall(i.user, 'audio')}
                      >
                        📞
                      </button>
                      <button
                        className="icon-btn"
                        title={t('videoCall')}
                        disabled={callBusy}
                        onClick={() => onCall(i.user, 'video')}
                      >
                        🎥
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
}
