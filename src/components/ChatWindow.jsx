import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
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

  const startReply = (m) => {
    setReplyTo({
      id: m.id,
      name: m.from === me.uid ? me.name : (usersMap[m.from] && usersMap[m.from].name) || m.fromName || '',
      kind: m.type,
      text: m.type === 'text' ? (m.text || '').slice(0, 100) : '',
    });
  };

  const starMsg = (m, on) => onStar({ chatId, chatTitle: group ? group.name : peer.name, m, on });

  const deleteMsg = (m) => {
    updateDoc(doc(chatRef, 'messages', m.id), {
      deleted: true,
      text: '',
      image: '',
      audio: '',
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

  return (
    <section className="chat">
      <header className="chat-head">
        <button className="icon-btn back" onClick={onBack} title={t('back')}>
          ←
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
              title={t('voiceCall')}
              disabled={callBusy}
              onClick={() => onCall(peer, 'audio')}
            >
              📞
            </button>
            <button
              className="icon-btn"
              title={t('videoCall')}
              disabled={callBusy}
              onClick={() => onCall(peer, 'video')}
            >
              🎥
            </button>
          </>
        )}
        {group && fresh(chat && chat.activeCall) && (
          <button className="pill live" disabled={callBusy} onClick={() => onJoinRoom(chat)}>
            📞 {t('joinCall')}
          </button>
        )}
        {group && !fresh(chat && chat.activeCall) && (
          <>
            <button
              className="icon-btn"
              title={t('groupCall')}
              disabled={callBusy}
              onClick={() => onGroupCall(chat, 'audio')}
            >
              📞
            </button>
            <button
              className="icon-btn"
              title={t('groupCall')}
              disabled={callBusy}
              onClick={() => onGroupCall(chat, 'video')}
            >
              🎥
            </button>
          </>
        )}
      </header>

      <div className="messages">
        {messages.length === 0 && <div className="empty">{t('noMsgs')}</div>}
        {messages.map((m) => (
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
            ✖
          </button>
        </div>
      )}

      {showEmoji && (
        <div className="emoji-panel">
          {EMOJIS.map((em) => (
            <button key={em} type="button" onClick={() => setText((v) => v + em)}>
              {em}
            </button>
          ))}
        </div>
      )}

      {recording ? (
        <div className="composer recording">
          <button type="button" className="icon-btn" title={t('cancel')} onClick={() => finishRec(true)}>
            🗑
          </button>
          <div className="rec-info">
            <span className="rec-dot" /> {t('recording')} {fmtDur(secs)}
          </div>
          <button type="button" className="send" title={t('send')} onClick={() => finishRec(false)}>
            ➤
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
            😊
          </button>
          <label className="icon-btn" title={t('attach')}>
            📷
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
              ➤
            </button>
          ) : (
            <button type="button" className="send" title={t('record')} onClick={startRec}>
              🎤
            </button>
          )}
        </form>
      )}

      {viewImg && (
        <div className="lightbox" onClick={() => setViewImg(null)}>
          <img src={viewImg} alt="" />
        </div>
      )}
    </section>
  );
}
