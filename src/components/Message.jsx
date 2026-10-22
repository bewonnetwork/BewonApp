import { useEffect, useState } from 'react';
import { translateText } from '../translate.js';
import { langName, useT } from '../i18n.js';
import { fmtClock, tsMs } from '../utils.js';

const sameLang = (a = '', b = '') => a.split('-')[0] === b.split('-')[0];

export default function Message({
  m,
  mine,
  me,
  senderName,
  showSender,
  others,
  chat,
  onDelete,
  onImage,
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
    body = (
      <img className="msg-img" src={m.image} alt="" onClick={() => onImage(m.image)} />
    );
  } else if (m.type === 'audio') {
    body = <audio className="msg-audio" controls preload="metadata" src={m.audio} />;
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
              <button type="button" onClick={doTranslate}>
                {t('translateFail')} ↻
              </button>
            )}
            {translated && (
              <>
                <span>{t('translatedFrom', { lang: langName(tr.from) })}</span>
                <button type="button" onClick={() => setShowOrig((v) => !v)}>
                  {showOrig ? t('showTranslation') : t('showOriginal')}
                </button>
              </>
            )}
            {!auto && !tr && !loading && !failed && (
              <button type="button" onClick={doTranslate}>
                🌐 {t('translate')}
              </button>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <div className={`bubble-wrap ${mine ? 'mine' : 'theirs'}`}>
      <div
        className={`bubble ${mine ? 'mine' : 'theirs'}`}
        onClick={() => mine && !m.deleted && setMenu((v) => !v)}
      >
        {showSender && !mine && (
          <div className="sender" style={{ color: '#128c7e' }}>
            {senderName}
          </div>
        )}
        <div className="bubble-body">{body}</div>
        <div className="meta">
          <span className="time">{pending ? '' : fmtClock(msgMs)}</span>
          {mine && !m.deleted && (
            <span className={`tick ${read ? 'read' : ''}`}>
              {pending ? '🕓' : read ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
      {menu && mine && !m.deleted && (
        <button
          type="button"
          className="del-btn"
          onClick={() => {
            setMenu(false);
            onDelete(m);
          }}
        >
          🗑 {t('delete')}
        </button>
      )}
    </div>
  );
}
