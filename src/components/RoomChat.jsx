import { useEffect, useRef, useState } from 'react';
import { addDoc, collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useT, sameLang } from '../i18n.js';
import { translateText } from '../translate.js';
import Icon from './Icon.jsx';

function Line({ m, mine, lang }) {
  const [tr, setTr] = useState(null);
  useEffect(() => {
    if (mine || !m.lang || sameLang(m.lang, lang)) return undefined;
    let alive = true;
    translateText(m.text, m.lang, lang).then((r) => alive && r && r.text && setTr(r.text));
    return () => {
      alive = false;
    };
  }, [m.text, m.lang, lang, mine]);
  return (
    <div className={`rc-line ${mine ? 'mine' : ''}`}>
      {!mine && <b>{m.name}</b>}
      <span dir="auto">{tr || m.text}</span>
    </div>
  );
}

// Meeting/group call-er bhitorer chat (nijer bhasha-y auto translate)
export default function RoomChat({ me, base, onClose }) {
  const { t, lang } = useT();
  const [list, setList] = useState([]);
  const [text, setText] = useState('');
  const end = useRef(null);

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, ...base, 'chat'), orderBy('createdMs', 'asc')),
        (s) => setList(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => {}
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useEffect(() => {
    end.current && end.current.scrollIntoView();
  }, [list.length]);

  const send = async (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    setText('');
    await addDoc(collection(db, ...base, 'chat'), {
      from: me.uid,
      name: me.name,
      lang: me.lang,
      text: v,
      createdMs: Date.now(),
    }).catch(() => {});
  };

  return (
    <div className="room-panel">
      <div className="rp-head">
        <b className="grow">{t('meetChat')}</b>
        <button className="icon-btn light" onClick={onClose}>
          <Icon n="close" size={18} />
        </button>
      </div>
      <div className="rp-body">
        {list.map((m) => (
          <Line key={m.id} m={m} mine={m.from === me.uid} lang={lang} />
        ))}
        <div ref={end} />
      </div>
      <form className="rp-form" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('typeMsg')} dir="auto" />
        <button className="send">
          <Icon n="send" size={18} />
        </button>
      </form>
    </div>
  );
}
