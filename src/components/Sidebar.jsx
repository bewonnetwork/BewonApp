import { useEffect, useMemo, useState } from 'react';
import Avatar from './Avatar.jsx';
import CallLog from './CallLog.jsx';
import Meet from './Meet.jsx';
import News from './News.jsx';
import Status from './Status.jsx';
import Communities from './Communities.jsx';
import Icon from './Icon.jsx';
import { useT, sameLang } from '../i18n.js';
import { translateText } from '../translate.js';
import { chatIdFor, fmtDayOrTime, tsMs } from '../utils.js';

// Chat list-er last message-o nijer bhasha-y translate kore dekhay
function Preview({ chat, me, text }) {
  const { lang } = useT();
  const [out, setOut] = useState(null);
  const incoming = chat && chat.lastFrom && chat.lastFrom !== me.uid && chat.lastType === 'text';
  const auto = me.autoTranslate !== false;
  useEffect(() => {
    setOut(null);
    if (!incoming || !auto || !chat.lastMessage || !chat.lastLang || sameLang(chat.lastLang, lang)) return;
    let alive = true;
    translateText(chat.lastMessage, chat.lastLang, lang).then((r) => {
      if (alive && r && r.text) setOut(r.text);
    });
    return () => {
      alive = false;
    };
  }, [chat && chat.lastMessage, chat && chat.lastLang, lang, incoming, auto]);
  return (
    <span className="muted small ellipsis" dir="auto">
      {out || text}
    </span>
  );
}

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
  onStarred,
  onReadAll,
  onJoinMeeting,
  onBroadcast,
  onLinked,
  lockedIds,
  lockedView,
  onOpenLocked,
  onCloseLocked,
}) {
  const { t, lang } = useT();
  const [tab, setTab] = useState('chats');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState(false);

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
      .filter((i) => (lockedView ? lockedIds.has(i.key) : !lockedIds.has(i.key)))
      .filter((i) => !s || i.name.toLowerCase().includes(s) || (i.user && (i.user.email || '').includes(s)))
      .filter((i) => {
        if (filter === 'unread') return ((i.chat && i.chat.unread && i.chat.unread[me.uid]) || 0) > 0;
        if (filter === 'groups') return i.kind === 'group';
        return true;
      })
      .sort((a, b) => {
        const ta = tsMs(a.chat && a.chat.updatedAt);
        const tb = tsMs(b.chat && b.chat.updatedAt);
        if (ta !== tb) return tb - ta;
        return a.name.localeCompare(b.name);
      });
  }, [users, chats, chatsById, search, filter, me.uid, lockedIds, lockedView]);

  const previewOf = (chat) => {
    if (!chat || (!chat.lastMessage && !chat.lastType)) return t('sayHi');
    let body = chat.lastMessage;
    if (chat.lastType === 'image') body = t('photo');
    else if (chat.lastType === 'audio') body = t('voiceMsg');
    else if (chat.lastType === 'file') body = `${t('fileMsg')}: ${chat.lastMessage || ''}`;
    if (!body) return t('sayHi');
    return chat.lastFrom === me.uid ? `${t('you')}: ${body}` : body;
  };

  const totalUnread = chats.reduce((n, c) => n + ((c.unread && c.unread[me.uid]) || 0), 0);

  const TABS = [
    ['chats', 'chat', t('chats')],
    ['updates', 'status', t('updates')],
    ['communities', 'people', t('communities')],
    ['calls', 'phone', t('calls')],
    ['meet', 'video', t('meetings')],
    ['news', 'news', t('news')],
  ];
  const MENU = [
    ['group', t('newGroup'), onNewGroup],
    ['broadcast', t('broadcastLists'), onBroadcast],
    ['swap', t('linkedDevices'), onLinked],
    ['star', t('starred'), onStarred],
    ['checks', t('readAll'), onReadAll],
    ['gear', t('settings'), onSettings],
  ];

  return (
    <aside className="sidebar">
      <header className="side-head">
        <button className="avatar-btn" onClick={onSettings} title={t('settings')}>
          <Avatar name={me.name} photo={me.photo} size={36} />
        </button>
        <div className="grow">
          <div className="name ellipsis">{me.name}</div>
        </div>
        <div className="menu-wrap">
          <button className="icon-btn" title={t('menu')} onClick={() => setMenu((v) => !v)}>
            <Icon n="more" />
          </button>
          {menu && (
            <>
              <div className="menu-back" onClick={() => setMenu(false)} />
              <div className="menu">
                {MENU.map(([ic, label, fn]) => (
                  <button
                    key={ic}
                    onClick={() => {
                      setMenu(false);
                      fn();
                    }}
                  >
                    <Icon n={ic} size={19} /> {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      {tab === 'calls' && <CallLog me={me} usersMap={usersMap} onCall={onCall} callBusy={callBusy} />}
      {tab === 'meet' && <Meet me={me} onJoinMeeting={onJoinMeeting} busy={callBusy} />}
      {tab === 'news' && <News lang={lang} />}
      {tab === 'updates' && <Status me={me} />}
      {tab === 'communities' && (
        <Communities me={me} users={users} chats={chats} onOpenGroup={(id) => { onSelect({ type: 'group', id }); setTab('chats'); }} />
      )}

      {tab === 'chats' && (
        <>
          <div className="search-box">
            <input placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} dir="auto" />
          </div>
          <div className="chips">
            {[
              ['all', t('filterAll')],
              ['unread', `${t('filterUnread')}${totalUnread ? ` ${totalUnread}` : ''}`],
              ['groups', t('filterGroups')],
            ].map(([k, label]) => (
              <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
                {label}
              </button>
            ))}
          </div>

          <div className="user-list">
            {lockedView ? (
              <button className="status-row" onClick={onCloseLocked}>
                <Icon n="back" />
                <b>{t('lockedChats')}</b>
              </button>
            ) : (
              lockedIds.size > 0 && (
                <button className="status-row" onClick={onOpenLocked}>
                  <span className="comm-ico">
                    <Icon n="lock" size={20} />
                  </span>
                  <div className="grow left">
                    <div className="name">{t('lockedChats')}</div>
                  </div>
                  <span className="muted small">{lockedIds.size}</span>
                </button>
              )
            )}
            {lockedView && items.length === 0 && <div className="empty">{t('noLocked')}</div>}
            {loadError && <div className="empty">{t('loadFail', { code: loadError })}</div>}
            {!loadError && !lockedView && items.length === 0 && (
              <div className="empty">{users.length <= 1 ? t('noUsers') : t('noResults')}</div>
            )}
            {items.map((i) => {
              const unread = (i.chat && i.chat.unread && i.chat.unread[me.uid]) || 0;
              return (
                <div key={i.key} className={`user-row ${selectedKey === i.key ? 'active' : ''}`}>
                  <button
                    className="user-main"
                    onClick={() =>
                      onSelect(i.kind === 'direct' ? { type: 'direct', uid: i.user.uid } : { type: 'group', id: i.key })
                    }
                  >
                    <Avatar name={i.name} group={i.kind === 'group'} photo={i.user && i.user.photo} />
                    <div className="grow left">
                      <div className="row-top">
                        <span className="name ellipsis">{i.name}</span>
                        <span className={`small ${unread ? 'unread-time' : 'muted'}`}>
                          {fmtDayOrTime(tsMs(i.chat && i.chat.updatedAt))}
                        </span>
                      </div>
                      <div className="row-top">
                        <Preview chat={i.chat} me={me} text={previewOf(i.chat)} />
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
                        <Icon n="phone" size={19} />
                      </button>
                      <button
                        className="icon-btn"
                        title={t('videoCall')}
                        disabled={callBusy}
                        onClick={() => onCall(i.user, 'video')}
                      >
                        <Icon n="video" size={19} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <nav className="tabs">
        {TABS.map(([k, icon, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            <span className="tab-ico"><Icon n={icon} size={22} /></span>
            <span>{label}</span>
            {k === 'chats' && totalUnread > 0 && <span className="badge">{totalUnread}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}
