import { useEffect, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { chatIdFor } from './Sidebar';

const fmtTime = (ts) =>
  ts?.toDate ? ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

export default function ChatWindow({ me, peer, onBack, onCall, callBusy }) {
  const chatId = chatIdFor(me.uid, peer.uid);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    setMessages([]);
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setMessages([]) // chat ekhono toiri hoy nai (permission), khali dekhao
    );
    return unsub;
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText('');
    // Prothome chat doc (rules-er jonno message-er age thaka dorkar)
    await setDoc(
      doc(db, 'chats', chatId),
      {
        members: [me.uid, peer.uid],
        lastMessage: body,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      from: me.uid,
      text: body,
      createdAt: serverTimestamp(),
    });
  };

  return (
    <section className="chat">
      <header className="chat-head">
        <button className="icon-btn back" onClick={onBack} title="Back">
          ←
        </button>
        <div className="avatar">{peer.name?.slice(0, 1).toUpperCase()}</div>
        <div className="grow">
          <div className="name">{peer.name}</div>
          <div className="muted small">{peer.email}</div>
        </div>
        <button
          className="icon-btn"
          title="Voice call"
          disabled={callBusy}
          onClick={() => onCall(peer, 'audio')}
        >
          📞
        </button>
        <button
          className="icon-btn"
          title="Video call"
          disabled={callBusy}
          onClick={() => onCall(peer, 'video')}
        >
          🎥
        </button>
      </header>

      <div className="messages">
        {messages.length === 0 && (
          <div className="empty">Ekhono kono message nai. Prothom message tumi pathao 👋</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.from === me.uid ? 'mine' : 'theirs'}`}>
            <span className="text">{m.text}</span>
            <span className="time">{fmtTime(m.createdAt)}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="composer" onSubmit={send}>
        <input
          placeholder="Message likho"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="send" disabled={!text.trim()}>
          ➤
        </button>
      </form>
    </section>
  );
}
