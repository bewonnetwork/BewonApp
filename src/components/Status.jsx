import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import Avatar from './Avatar.jsx';
import Icon from './Icon.jsx';
import { useT, sameLang } from '../i18n.js';
import { translateText } from '../translate.js';
import { compressImage, fmtDayOrTime } from '../utils.js';

const DAY = 24 * 3600 * 1000;
const BGS = ['#128c7e', '#6a1b9a', '#c2185b', '#1565c0', '#ef6c00', '#37474f', '#2e7d32'];

function Composer({ me, onClose }) {
  const { t } = useT();
  const [text, setText] = useState('');
  const [bg, setBg] = useState(BGS[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const post = async (payload) => {
    setBusy(true);
    try {
      await addDoc(collection(db, 'statuses'), {
        uid: me.uid,
        name: me.name,
        photo: me.photo || '',
        lang: me.lang,
        createdMs: Date.now(),
        viewedBy: [],
        ...payload,
      });
      onClose();
    } catch (e) {
      setErr(t('sendFail'));
      setBusy(false);
    }
  };

  const onPhoto = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const image = await compressImage(f, 900, 0.7);
      await post({ type: 'image', image, text: text.trim() });
    } catch (x) {
      setErr(t('imgFail'));
    }
  };

  return (
    <div className="status-composer" style={{ background: bg }}>
      <div className="sv-top">
        <button className="icon-btn light" onClick={onClose}>
          <Icon n="close" />
        </button>
        <div className="grow" />
        <label className="icon-btn light" title={t('statusPhoto')}>
          <Icon n="camera" />
          <input type="file" accept="image/*" hidden onChange={onPhoto} />
        </label>
      </div>
      <textarea
        autoFocus
        dir="auto"
        placeholder={t('statusText')}
        value={text}
        maxLength={400}
        onChange={(e) => setText(e.target.value)}
      />
      {err && <div className="status-err">{err}</div>}
      <div className="sv-bottom">
        <div className="bg-dots">
          {BGS.map((c) => (
            <button key={c} className={c === bg ? 'on' : ''} style={{ background: c }} onClick={() => setBg(c)} />
          ))}
        </div>
        <button
          className="send"
          disabled={busy || !text.trim()}
          title={t('statusPost')}
          onClick={() => post({ type: 'text', text: text.trim(), bg })}
        >
          <Icon n="send" size={20} />
        </button>
      </div>
    </div>
  );
}

function Viewer({ me, items, onClose }) {
  const { t, lang } = useT();
  const [i, setI] = useState(0);
  const [tr, setTr] = useState(null);
  const timer = useRef(null);
  const s = items[i];
  const mine = s.uid === me.uid;

  useEffect(() => {
    if (!mine && !(s.viewedBy || []).includes(me.uid)) {
      updateDoc(doc(db, 'statuses', s.id), { viewedBy: arrayUnion(me.uid) }).catch(() => {});
    }
    setTr(null);
    if (s.text && s.lang && !sameLang(s.lang, lang) && me.autoTranslate !== false) {
      let alive = true;
      translateText(s.text, s.lang, lang).then((r) => alive && r && setTr(r.text));
      timer.current = null;
      return () => {
        alive = false;
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.id]);

  useEffect(() => {
    timer.current = setTimeout(() => {
      if (i < items.length - 1) setI(i + 1);
      else onClose();
    }, 5500);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const del = async () => {
    await deleteDoc(doc(db, 'statuses', s.id)).catch(() => {});
    onClose();
  };

  return (
    <div className="status-view" style={{ background: s.type === 'text' ? s.bg || BGS[0] : '#000' }}>
      <div className="sv-bars">
        {items.map((x, k) => (
          <span key={x.id} className={k < i ? 'done' : k === i ? 'run' : ''} />
        ))}
      </div>
      <div className="sv-top">
        <Avatar name={s.name} photo={s.photo} size={36} />
        <div className="grow">
          <div className="name" style={{ color: '#fff' }}>
            {mine ? t('myStatus') : s.name}
          </div>
          <div className="small" style={{ color: '#ddd' }}>
            {fmtDayOrTime(s.createdMs)}
          </div>
        </div>
        {mine && (
          <button className="icon-btn light" onClick={del}>
            <Icon n="trash" />
          </button>
        )}
        <button className="icon-btn light" onClick={onClose}>
          <Icon n="close" />
        </button>
      </div>
      <div className="sv-body">
        <div className="sv-tap l" onClick={() => setI(Math.max(0, i - 1))} />
        <div className="sv-tap r" onClick={() => (i < items.length - 1 ? setI(i + 1) : onClose())} />
        {s.type === 'image' && <img src={s.image} alt="" />}
        {s.text && (
          <div className={`sv-text ${s.type === 'image' ? 'cap' : ''}`} dir="auto">
            {tr || s.text}
          </div>
        )}
      </div>
      {mine && (
        <div className="sv-views">
          <Icon n="eye" size={18} /> {t('viewedBy', { n: (s.viewedBy || []).length })}
        </div>
      )}
    </div>
  );
}

export default function Status({ me }) {
  const { t } = useT();
  const [list, setList] = useState([]);
  const [compose, setCompose] = useState(false);
  const [view, setView] = useState(null); // { items }
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const q = query(collection(db, 'statuses'), where('createdMs', '>', now - DAY));
    return onSnapshot(
      q,
      (snap) => setList(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => console.warn('status', e)
    );
  }, [now]);

  const { mine, groups } = useMemo(() => {
    const byUid = {};
    list.forEach((s) => {
      (byUid[s.uid] = byUid[s.uid] || []).push(s);
    });
    Object.values(byUid).forEach((a) => a.sort((x, y) => x.createdMs - y.createdMs));
    const m = byUid[me.uid] || [];
    const g = Object.entries(byUid)
      .filter(([u]) => u !== me.uid)
      .map(([u, items]) => ({
        uid: u,
        items,
        last: items[items.length - 1],
        seen: items.every((x) => (x.viewedBy || []).includes(me.uid)),
      }))
      .sort((a, b) => b.last.createdMs - a.last.createdMs);
    return { mine: m, groups: g };
  }, [list, me.uid]);

  const unseen = groups.filter((g) => !g.seen);
  const seen = groups.filter((g) => g.seen);

  const Row = ({ g }) => (
    <button className="status-row" onClick={() => setView({ items: g.items })}>
      <span className={`ring ${g.seen ? 'seen' : ''}`}>
        <Avatar name={g.last.name} photo={g.last.photo} size={44} />
      </span>
      <div className="grow left">
        <div className="name ellipsis">{g.last.name}</div>
        <div className="muted small">{fmtDayOrTime(g.last.createdMs)}</div>
      </div>
    </button>
  );

  return (
    <div className="user-list">
      <button
        className="status-row"
        onClick={() => (mine.length ? setView({ items: mine }) : setCompose(true))}
      >
        <span className={`ring ${mine.length ? '' : 'none'}`}>
          <Avatar name={me.name} photo={me.photo} size={44} />
          {!mine.length && (
            <span className="plus">
              <Icon n="plus" size={14} />
            </span>
          )}
        </span>
        <div className="grow left">
          <div className="name">{t('myStatus')}</div>
          <div className="muted small">{mine.length ? t('statusExpire') : t('tapToAdd')}</div>
        </div>
        {mine.length > 0 && (
          <span
            className="icon-btn"
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              setCompose(true);
            }}
          >
            <Icon n="plus" />
          </span>
        )}
      </button>

      {groups.length === 0 && <div className="empty">{t('noStatus')}</div>}
      {unseen.length > 0 && <div className="group-title">{t('recentUpdates')}</div>}
      {unseen.map((g) => (
        <Row key={g.uid} g={g} />
      ))}
      {seen.length > 0 && <div className="group-title">{t('recentUpdates')} · ✓</div>}
      {seen.map((g) => (
        <Row key={g.uid} g={g} />
      ))}

      {compose && <Composer me={me} onClose={() => setCompose(false)} />}
      {view && <Viewer me={me} items={view.items} onClose={() => setView(null)} />}
    </div>
  );
}
