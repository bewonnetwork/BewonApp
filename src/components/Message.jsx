import { useEffect, useState } from 'react';
import { translateText } from '../translate.js';
import { langName, sameLang, useT } from '../i18n.js';
import Icon from './Icon.jsx';
import { fmtClock, openFile, tsMs } from '../utils.js';

export default function Message({
  m,
  mine,
  me,
  senderName,
  showSender,
  others,
  chat,
  starred,
  onDelete,
  onImage,
  onReply,
  onStar,
  onReact,
  onForward,
}) {
  const { t, lang } = useT();
  const [menu, setMenu] = useState(false);
  const [tr, setTr] = useState(null); // { text, from } | { same: true }
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showOrig, setShowOrig] = useState(false);

  const auto = me.autoTranslate !== false;
  const canTranslate = !mine && m.type === 'text' && !m.deleted && !!m.text;

  const doTranslate = async () => {
    setLoading(true);
    setFailed(false);
    const r = await translateText(m.text, m.lang, lang);
    setLoading(false);
    if (!r) {
      setFailed(true);
      return;
    }
    if (sameLang(r.from, lang) || r.text.trim() === m.text.trim()) setTr({ same: true });
    else setTr(r);
  };

  useEffect(() => {
    setTr(null);
    setShowOrig(false);
    if (canTranslate && auto) doTranslate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.text, lang, auto]);

  const translated = tr && !tr.same;
  const shownText = translated && !showOrig ? tr.text : m.text;

  // Read tick (server time diye tulona kora hoy)
  const msgMs = tsMs(m.createdAt);
  const pending = !!m.pending;
  const read =
    mine &&
    !pending &&
    others.length > 0 &&
    others.every((u) => tsMs(chat && chat.lastRead && chat.lastRead[u]) >= msgMs);

  let body;
  if (m.deleted) {
    body = <span className="deleted">{t('deleted')}</span>;
  } else if (m.type === 'image') {
    body = <img className="msg-img" src={m.image} alt="" onClick={(e) => { e.stopPropagation(); onImage(m.image); }} />;
  } else if (m.type === 'gif') {
    body = <img className="msg-gif" src={m.gif} alt="GIF" onClick={(e) => { e.stopPropagation(); onImage(m.gif); }} />;
  } else if (m.type === 'sticker') {
    body = <span className="sticker-msg">{m.text}</span>;
  } else if (m.type === 'location') {
    body = (
      <a
        className="loc-card"
        href={`https://www.google.com/maps?q=${m.lat},${m.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="file-ico"><Icon n="pinloc" size={22} /></span>
        <span className="grow left">
          <b>{t('locMsg')}</b>
          <span className="muted small" style={{ display: 'block' }}>{Number(m.lat).toFixed(4)}, {Number(m.lng).toFixed(4)}</span>
        </span>
      </a>
    );
  } else if (m.type === 'file') {
    body = (
      <button
        type="button"
        className="file-card"
        onClick={(e) => {
          e.stopPropagation();
          openFile(m);
        }}
      >
        <span className="file-ico">
          <Icon n="file" size={24} />
        </span>
        <span className="grow left">
          <span className="ellipsis file-name">{m.fileName}</span>
          <span className="muted small">{Math.max(1, Math.round((m.fileSize || 0) / 1024))} KB</span>
        </span>
        <Icon n="download" size={20} />
      </button>
    );
  } else if (m.type === 'audio') {
    body = <audio className="msg-audio" controls preload="metadata" src={m.audio} onClick={(e) => e.stopPropagation()} />;
  } else {
    body = (
      <>
        <span className="text" dir="auto">
          {shownText}
        </span>
        {canTranslate && (loading || failed) && (
          <div className="tr-note">
            {loading && <span>{t('translating')}</span>}
            {failed && (
              <button type="button" onClick={(e) => { e.stopPropagation(); doTranslate(); }}>
                {t('translateFail')} ↻
              </button>
            )}
          </div>
        )}
      </>
    );
  }

  const quote = m.replyTo && !m.deleted ? m.replyTo : null;

  return (
    <div className={`bubble-wrap ${mine ? 'mine' : 'theirs'}`}>
      <div className={`bubble ${mine ? 'mine' : 'theirs'}`} onClick={() => !m.deleted && setMenu((v) => !v)}>
        {showSender && !mine && (
          <div className="sender" style={{ color: '#128c7e' }}>
            {senderName}
          </div>
        )}
        {quote && (
          <div className="quote">
            <b>{quote.name}</b>
            <span dir="auto">
              {quote.kind === 'image' ? t('photo') : quote.kind === 'audio' ? t('voiceMsg') : quote.text}
            </span>
          </div>
        )}
        <div className="bubble-body">{body}</div>
        <div className="meta">
          {starred && <Icon n="star" size={11} fill />}
          <span className="time">{pending ? '' : fmtClock(msgMs)}</span>
          {mine && !m.deleted && (
            <span className={`tick ${read ? 'read' : ''}`}>{pending ? <Icon n="check" size={14} /> : read ? <Icon n="checks" size={16} /> : <Icon n="check" size={14} />}</span>
          )}
        </div>
      </div>
      {m.reactions && Object.keys(m.reactions).length > 0 && (
        <div className="reacts">
          {Array.from(new Set(Object.values(m.reactions))).join('')} {Object.keys(m.reactions).length > 1 ? Object.keys(m.reactions).length : ''}
        </div>
      )}
      {menu && !m.deleted && (
        <div className="msg-actions">
          <div className="react-pick">
            {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((e) => (
              <button key={e} type="button" onClick={() => { setMenu(false); onReact(m, e); }}>{e}</button>
            ))}
          </div>
          <button type="button" onClick={() => { setMenu(false); onForward(m); }}>
            <Icon n="forward" size={17} /> {t('forward')}
          </button>
          <button
            type="button"
            onClick={() => {
              setMenu(false);
              onReply(m);
            }}
          >
            <Icon n="reply" size={17} /> {t('reply')}
          </button>
          <button
            type="button"
            onClick={() => {
              setMenu(false);
              onStar(m, !starred);
            }}
          >
            <Icon n="star" size={17} fill={starred} /> {starred ? t('unstar') : t('star')}
          </button>
          {canTranslate && (translated || !auto) && (
            <button
              type="button"
              onClick={() => {
                setMenu(false);
                if (translated) setShowOrig((v) => !v);
                else doTranslate();
              }}
            >
              <Icon n="globe" size={17} /> {translated ? (showOrig ? t('showTranslation') : t('showOriginal')) : t('translate')}
            </button>
          )}
          {m.type === 'text' && (
            <button
              type="button"
              onClick={() => {
                setMenu(false);
                try {
                  navigator.clipboard.writeText(m.text);
                } catch (e) {
                  /* ignore */
                }
              }}
            >
              <Icon n="copy" size={17} /> {t('copy')}
            </button>
          )}
          {mine && (
            <button
              type="button"
              className="danger"
              onClick={() => {
                setMenu(false);
                onDelete(m);
              }}
            >
              <Icon n="trash" size={17} /> {t('delete')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
