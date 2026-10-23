import { useT } from '../i18n.js';
import { fmtDayOrTime } from '../utils.js';

export default function Starred({ items, onOpen, onClose }) {
  const { t } = useT();
  const sorted = [...items].sort((a, b) => (b.starredMs || 0) - (a.starredMs || 0));
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('starred')}</h2>
        {sorted.length === 0 && <div className="empty">{t('noStarred')}</div>}
        <div className="pick-list" style={{ border: 0 }}>
          {sorted.map((s) => (
            <button key={s.id} className="star-row" onClick={() => onOpen(s)}>
              <div className="row-top">
                <b>{s.fromName}</b>
                <span className="muted small">
                  {s.chatTitle} · {fmtDayOrTime(s.createdMs)}
                </span>
              </div>
              <div dir="auto">
                {s.type === 'image' ? t('photo') : s.type === 'audio' ? t('voiceMsg') : s.text}
              </div>
            </button>
          ))}
        </div>
        <button className="ghost" onClick={onClose}>
          {t('close')}
        </button>
      </div>
    </div>
  );
}
