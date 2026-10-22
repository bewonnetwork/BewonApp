import { useEffect, useState } from 'react';
import { translateText } from '../translate.js';
import { langName, sameLang, useT } from '../i18n.js';
import { fmtClock, tsMs } from '../utils.js';

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
    body = <span className="deleted">🚫 {t('deleted')}</span>;
  } else if (m.type === 'image') {
    body = <img className="msg-img" src={m.image} alt="" onClick={(e) => { e.stopPropagation(); onImage(m.image); }} />;
  } else if (m.type === 'audio') {
    body = <audio className="msg-audio" controls preload="metadata" src={m.audio} onClick={(e) => e.stopPropagation()} />;
  } else {
    body = (
      <>
        <span className="text" dir="auto">
          {shownText}
        </span>
        {canTranslate && (
          <div className="tr-note">
            {loading && <span>{t('translating')}</span>}
            {failed && (
              <button type="button" onClick={(e) => { e.stopPropagation(); doTranslate(); }}>
                {t('translateFail')} ↻
              </button>
            )}
            {translated && (
              <>
                <span>{t('translatedFrom', { lang: langName(tr.from) })}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); setShowOrig((v) => !v); }}>
                  {showOrig ? t('showTranslation') : t('showOriginal')}
                </button>
              </>
            )}
            {!auto && !tr && !loading && !failed && (
              <button type="button" onClick={(e) => { e.stopPropagation(); doTranslate(); }}>
                🌐 {t('translate')}
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
          {starred && <span>⭐</span>}
          <span className="time">{pending ? '' : fmtClock(msgMs)}</span>
          {mine && !m.deleted && (
            <span className={`tick ${read ? 'read' : ''}`}>{pending ? '🕓' : read ? '✓✓' : '✓'}</span>
          )}
        </div>
      </div>
      {menu && !m.deleted && (
        <div className="msg-actions">
          <button
            type="button"
            onClick={() => {
              setMenu(false);
              onReply(m);
            }}
          >
            ↩ {t('reply')}
          </button>
          <button
            type="button"
            onClick={() => {
              setMenu(false);
              onStar(m, !starred);
            }}
          >
            {starred ? '☆ ' + t('unstar') : '⭐ ' + t('star')}
          </button>
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
              📋 {t('copy')}
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
              🗑 {t('delete')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
