import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteField,
  doc,
  increment,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import Avatar from './Avatar.jsx';
import Message from './Message.jsx';
import Icon from './Icon.jsx';
import MediaPanel from './MediaPanel.jsx';
import GroupInfo from './GroupInfo.jsx';
import { useT } from '../i18n.js';
import { blobToDataURL, compressImage, fmtDur, fmtSeen } from '../utils.js';

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎', '🤔', '😢', '😭', '😡',
  '👍', '👎', '🙏', '👏', '🔥', '❤️', '💔', '🎉', '✨', '🌹', '😴', '🤝',
  '💪', '👌', '🙌', '😅', '😇', '🥰', '😜', '🤗', '😮', '😱', '🥳', '😋',
];

const MAX_REC_SECS = 90;

const fresh = (ac) => ac && Date.now() - (ac.startedMs || 0) < 3 * 3600 * 1000;

export default function ChatWindow({
  me,
  chatId,
  peer,
  group,
  chat,
  usersMap,
  starredIds,
  onStar,
  onBack,
  onCall,
  callBusy,
  onGroupCall,
  onJoinRoom,
  locked,
  onToggleLock,
  pref = {},
  onPref = () => {},
  onForward = () => {},
  allUsers = [],
}) {
  const { t } = useT();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [viewImg, setViewImg] = useState(null);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now());
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [replyTo, setReplyTo] = useState(null);
  const [hmenu, setHmenu] = useState(false);
  const [search, setSearch] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  const bottomRef = useRef(null);
  const lastTyping = useRef(0);
  const recRef = useRef(null);
  const recCancel = useRef(false);
  const recTimer = useRef(null);
  const recSecs = useRef(0);

  const memberIds = group ? group.members : [me.uid, peer.uid];
  const others = memberIds.filter((u) => u !== me.uid);
  const chatRef = useMemo(() => doc(db, 'chats', chatId), [chatId]);

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  // Messages shunbo (direct chat-er doc age toiri kore nei, noile rules permission dey na)
  useEffect(() => {
    setMessages([]);
    let unsub = null;
    let cancelled = false;
    (async () => {
      if (!group) {
        try {
          await setDoc(
            chatRef,
            { members: [me.uid, peer.uid], isGroup: false },
            { merge: true }
          );
        } catch (e) {
          console.warn('chat create failed', e);
        }
      }
      if (cancelled) return;
      const q = query(collection(chatRef, 'messages'), orderBy('createdAt', 'asc'), limitToLast(300));
      unsub = onSnapshot(
        q,
        (snap) =>
          setMessages(
            snap.docs.map((d) => ({
              id: d.id,
              pending: d.metadata.hasPendingWrites,
              ...d.data({ serverTimestamps: 'estimate' }),
            }))
          ),
        (err) => console.warn('messages listener', err)
      );
    })();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Unread 0 kora + "read" mark
  const myUnread = (chat && chat.unread && chat.unread[me.uid]) || 0;
  useEffect(() => {
    if (!chat || myUnread <= 0) return;
    if (document.visibilityState !== 'visible') return;
    updateDoc(chatRef, {
      [`lastRead.${me.uid}`]: serverTimestamp(),
      [`unread.${me.uid}`]: 0,
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUnread, !!chat, chatId]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && chat) {
        updateDoc(chatRef, {
          [`lastRead.${me.uid}`]: serverTimestamp(),
          [`unread.${me.uid}`]: 0,
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, !!chat]);

  // Header-er status line
  const typers = others.filter(
    (u) => now - (((chat && chat.typing && chat.typing[u]) || 0)) < 6000
  );
  let statusLine = '';
  if (typers.length) {
    statusLine = group
      ? t('typingName', { name: (usersMap[typers[0]] && usersMap[typers[0]].name) || '' })
      : t('typing');
  } else if (group) {
    statusLine = t('members', { n: group.members.length });
  } else if (peer.lastSeenMs && now - peer.lastSeenMs < 150000) {
    statusLine = t('online');
  } else if (peer.lastSeenMs) {
    statusLine = t('lastSeen', { time: fmtSeen(peer.lastSeenMs) });
  }

  const send = async (payload, lastType, preview) => {
    const unread = {};
    others.forEach((u) => {
      unread[u] = increment(1);
    });
    try {
      await addDoc(collection(chatRef, 'messages'), {
        from: me.uid,
        fromName: me.name,
        lang: me.lang,
        createdAt: serverTimestamp(),
        ...(replyTo ? { replyTo } : {}),
        ...payload,
      });
      setReplyTo(null);
      await setDoc(
        chatRef,
        {
          lastMessage: preview || '',
          lastType,
          lastLang: me.lang,
          lastFrom: me.uid,
          updatedAt: serverTimestamp(),
          unread,
          typing: { [me.uid]: 0 },
          lastRead: { [me.uid]: serverTimestamp() },
        },
        { merge: true }
      );
    } catch (e) {
      console.warn(e);
      flash(t('sendFail'));
    }
  };

  const sendText = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText('');
    setShowEmoji(false);
    await send({ type: 'text', text: body }, 'text', body.slice(0, 120));
  };

  const sendGif = (url) => {
    setShowEmoji(false);
    return send({ type: 'gif', gif: url }, 'gif', 'GIF');
  };
  const sendSticker = (e) => {
    setShowEmoji(false);
    return send({ type: 'sticker', text: e }, 'sticker', e);
  };
  const sendLocation = () => {
    if (!navigator.geolocation) return flash(t('sendFail'));
    navigator.geolocation.getCurrentPosition(
      (p) => send({ type: 'location', lat: p.coords.latitude, lng: p.coords.longitude }, 'location', 'Location'),
      () => flash(t('sendFail')),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  const reactMsg = (m, e) => {
    const cur = m.reactions && m.reactions[me.uid];
    updateDoc(doc(chatRef, 'messages', m.id), { [`reactions.${me.uid}`]: cur === e ? deleteField() : e }).catch(() => {});
  };
  const forwardMsg = (m) => {
    const keep = ['type', 'text', 'image', 'audio', 'duration', 'file', 'fileName', 'fileSize', 'mime', 'gif', 'lat', 'lng'];
    const payload = {};
    keep.forEach((k) => {
      if (m[k] !== undefined) payload[k] = m[k];
    });
    onForward(payload);
  };

  const onType = (v) => {
    setText(v);
    if (Date.now() - lastTyping.current > 2500) {
      lastTyping.current = Date.now();
      updateDoc(chatRef, { [`typing.${me.uid}`]: Date.now() }).catch(() => {});
    }
  };

  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const dataUrl = await compressImage(f);
      await send({ type: 'image', image: dataUrl }, 'image', '');
    } catch (err) {
      flash(t('imgFail'));
    }
  };

  const onDoc = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 600 * 1024) {
      flash(t('fileTooBig'));
      return;
    }
    try {
      const dataUrl = await blobToDataURL(f);
      await send(
        { type: 'file', file: dataUrl, fileName: f.name, fileSize: f.size, mime: f.type || '' },
        'file',
        f.name
      );
    } catch (err) {
      flash(t('sendFail'));
    }
  };

  const startReply = (m) => {
    setReplyTo({
      id: m.id,
      name: m.from === me.uid ? me.name : (usersMap[m.from] && usersMap[m.from].name) || m.fromName || '',
      kind: m.type,
      text: m.type === 'text' ? (m.text || '').slice(0, 100) : m.type === 'file' ? m.fileName || '' : '',
    });
  };

  const starMsg = (m, on) => onStar({ chatId, chatTitle: group ? group.name : peer.name, m, on });

  const deleteMsg = (m) => {
    updateDoc(doc(chatRef, 'messages', m.id), {
      deleted: true,
      text: '',
      image: '',
      audio: '',
      file: '',
      gif: '',
    }).catch(() => flash(t('sendFail')));
  };

  // ---- Voice message ----
  const stopTimer = () => {
    clearInterval(recTimer.current);
    recTimer.current = null;
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(
          (m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)
        ) || '';
      const opts = { audioBitsPerSecond: 24000 };
      if (mime) opts.mimeType = mime;
      const rec = new MediaRecorder(stream, opts);
      const chunks = [];
      recCancel.current = false;
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size) chunks.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        stopTimer();
        setRecording(false);
        if (recCancel.current) return;
        const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' });
        if (blob.size > 700 * 1024) {
          flash(t('tooBig'));
          return;
        }
        if (blob.size < 800) return;
        const dataUrl = await blobToDataURL(blob);
        await send({ type: 'audio', audio: dataUrl, duration: recSecs.current }, 'audio', '');
      };
      recRef.current = rec;
      recSecs.current = 0;
      setSecs(0);
      rec.start();
      setRecording(true);
      recTimer.current = setInterval(() => {
        recSecs.current += 1;
        setSecs(recSecs.current);
        if (recSecs.current >= MAX_REC_SECS && recRef.current) recRef.current.stop();
      }, 1000);
    } catch (e) {
      flash(t('micDenied'));
    }
  };

  const finishRec = (cancel) => {
    recCancel.current = cancel;
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
  };

  useEffect(
    () => () => {
      recCancel.current = true;
      if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
      stopTimer();
    },
    []
  );

  const title = group ? group.name : peer.name;
  const sq = (search || '').trim().toLowerCase();
  const shown = sq ? messages.filter((m) => (m.text || m.fileName || '').toLowerCase().includes(sq)) : messages;

  return (
    <section className="chat">
      <header className="chat-head">
        <button className="icon-btn back" onClick={onBack} title={t('back')}>
          <Icon n="back" />
        </button>
        <Avatar name={title} group={!!group} size={40} photo={peer && peer.photo} />
        <div className="grow">
          <div className="name ellipsis">{title}</div>
          <div className={`small ${typers.length ? 'typing' : 'muted'}`}>{statusLine}</div>
        </div>
        {!group && (
          <>
            <button
              className="icon-btn"
              title={t('videoCall')}
              disabled={callBusy}
              onClick={() => onCall(peer, 'video')}
            >
              <Icon n="video" size={21} />
            </button>
            <button
              className="icon-btn"
              title={t('voiceCall')}
              disabled={callBusy}
              onClick={() => onCall(peer, 'audio')}
            >
              <Icon n="phone" size={20} />
            </button>
          </>
        )}
        {group && fresh(chat && chat.activeCall) && (
          <button className="pill live" disabled={callBusy} onClick={() => onJoinRoom(chat)}>
            {t('joinCall')}
          </button>
        )}
        {group && !fresh(chat && chat.activeCall) && (
          <>
            <button
              className="icon-btn"
              title={t('groupCall')}
              disabled={callBusy}
              onClick={() => onGroupCall(chat, 'video')}
            >
              <Icon n="video" size={21} />
            </button>
            <button
              className="icon-btn"
              title={t('groupCall')}
              disabled={callBusy}
              onClick={() => onGroupCall(chat, 'audio')}
            >
              <Icon n="phone" size={20} />
            </button>
          </>
        )}
        <div className="menu-wrap">
          <button className="icon-btn" onClick={() => setHmenu((v) => !v)}>
            <Icon n="more" />
          </button>
          {hmenu && (
            <>
              <div className="menu-back" onClick={() => setHmenu(false)} />
              <div className="menu">
                {[
                  ['search', t('searchChat'), () => setSearch('')],
                  ...(group ? [['group', t('groupInfo'), () => setShowInfo(true)]] : []),
                  ['pinloc', t('location'), sendLocation],
                  ['lock', locked ? t('unlockChat') : t('lockChat'), onToggleLock],
                  ['pin', pref.pin ? t('unpinChat') : t('pinChat'), () => onPref({ pin: !pref.pin })],
                  ['star', pref.fav ? t('removeFav') : t('addFav'), () => onPref({ fav: !pref.fav })],
                  ['archive', pref.arch ? t('unarchiveChat') : t('archiveChat'), () => onPref({ arch: !pref.arch })],
                  [
                    'mute',
                    pref.mute > Date.now() ? t('unmuteChat') : t('muteChat'),
                    () => onPref({ mute: pref.mute > Date.now() ? 0 : Date.now() + 8 * 3600 * 1000 }),
                  ],
                ].map(([ic, label, fn]) => (
                  <button
                    key={ic}
                    onClick={() => {
                      setHmenu(false);
                      fn();
                    }}
                  >
                    <Icon n={ic} size={18} /> {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      {search !== null && (
        <div className="chat-search">
          <input autoFocus placeholder={t('searchChat')} value={search} dir="auto" onChange={(e) => setSearch(e.target.value)} />
          <button className="icon-btn" onClick={() => setSearch(null)}>
            <Icon n="close" size={18} />
          </button>
        </div>
      )}

      <div className="messages">
        {messages.length === 0 && <div className="empty">{t('noMsgs')}</div>}
        {shown.length === 0 && messages.length > 0 && <div className="empty">{t('noMatch')}</div>}
        {shown.map((m) => (
          <Message
            key={m.id}
            m={m}
            mine={m.from === me.uid}
            me={me}
            senderName={(usersMap[m.from] && usersMap[m.from].name) || m.fromName}
            showSender={!!group}
            others={others}
            chat={chat}
            starred={!!(starredIds && starredIds.has(`${chatId}_${m.id}`))}
            onStar={starMsg}
            onReply={startReply}
            onDelete={deleteMsg}
            onImage={setViewImg}
            onReact={reactMsg}
            onForward={forwardMsg}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {notice && <div className="chat-notice">{notice}</div>}

      {replyTo && (
        <div className="reply-bar">
          <div className="grow">
            <b>{t('replyingTo', { name: replyTo.name })}</b>
            <div className="ellipsis" dir="auto">
              {replyTo.kind === 'image' ? t('photo') : replyTo.kind === 'audio' ? t('voiceMsg') : replyTo.text}
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={() => setReplyTo(null)}>
            <Icon n="close" size={18} />
          </button>
        </div>
      )}

      {showEmoji && <MediaPanel onEmoji={(e) => setText((v) => v + e)} onGif={sendGif} onSticker={sendSticker} />}

      {recording ? (
        <div className="composer recording">
          <button type="button" className="icon-btn" title={t('cancel')} onClick={() => finishRec(true)}>
            <Icon n="trash" size={20} />
          </button>
          <div className="rec-info">
            <span className="rec-dot" /> {t('recording')} {fmtDur(secs)}
          </div>
          <button type="button" className="send" title={t('send')} onClick={() => finishRec(false)}>
            <Icon n="send" size={19} />
          </button>
        </div>
      ) : (
        <form className="composer" onSubmit={sendText}>
          <button
            type="button"
            className="icon-btn"
            title={t('emoji')}
            onClick={() => setShowEmoji((v) => !v)}
          >
            <Icon n="smile" size={22} />
          </button>
          <label className="icon-btn" title={t('fileDoc')}>
            <Icon n="clip" size={21} />
            <input type="file" hidden onChange={onDoc} />
          </label>
          <label className="icon-btn" title={t('attach')}>
            <Icon n="camera" size={21} />
            <input type="file" accept="image/*" hidden onChange={onFile} />
          </label>
          <input
            placeholder={t('typeMsg')}
            value={text}
            dir="auto"
            onChange={(e) => onType(e.target.value)}
          />
          {text.trim() ? (
            <button className="send" title={t('send')}>
              <Icon n="send" size={19} />
            </button>
          ) : (
            <button type="button" className="send" title={t('record')} onClick={startRec}>
              <Icon n="mic" size={20} />
            </button>
          )}
        </form>
      )}

      {showInfo && group && (
        <GroupInfo me={me} group={group} users={allUsers} usersMap={usersMap} onClose={() => setShowInfo(false)} onLeft={() => { setShowInfo(false); onBack(); }} />
      )}

      {viewImg && (
        <div className="lightbox" onClick={() => setViewImg(null)}>
          <img src={viewImg} alt="" />
        </div>
      )}
    </section>
  );
}
