import { useEffect, useState } from 'react';
import { useT } from '../i18n.js';
import Icon from './Icon.jsx';

const EMOJI = {
  '😀': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','💩','🤡','👻','👽','🤖'],
  '👍': ['👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐','🖖','👋','🤝','🙏','👏','🙌','👐','🤲','💪','🦾','✍️','🤳','💅','👀','👁','👅','👄','🧠','🫀','🦷','🦴'],
  '❤️': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉','☸️','✡️','🔯','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'],
  '🐶': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🐢','🐍','🦎','🐙','🦑','🦐','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🐘','🦏','🐪','🐫','🦒','🌵','🎄','🌲','🌳','🌴','🌱','🌿','☘️','🍀','🌹','🌺','🌸','🌼','🌻','🌞','🌝','🌙','⭐','🌟','✨','⚡','🔥','🌈','☀️','⛅','☁️','❄️','💧','🌊'],
  '🍕': ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥕','🌽','🌶','🥔','🍞','🥐','🧀','🍗','🍖','🌭','🍔','🍟','🍕','🥪','🌮','🌯','🍜','🍝','🍣','🍤','🍚','🍛','🍦','🍩','🍪','🎂','🍰','🍫','🍬','🍭','☕','🍵','🥤','🍺','🍷','🥂'],
  '⚽': ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥊','🥋','⛳','🎣','🎽','🎿','🏂','🏆','🥇','🥈','🥉','🎮','🎲','🎯','🎳','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🎻','🚗','🚕','🚌','🚑','🚒','✈️','🚀','🚁','🚲','🏠','🏢','🏥','🏫','🕌','⛪','🕍','🌍','🗺','💻','📱','📷','💡','💰','💳','🎁','🎈','🎉','🎊'],
};
const STICKERS = ['😂','🤣','😍','🥰','😘','😎','🤩','😭','😡','🥳','😴','🤗','👍','👏','🙏','💪','🔥','❤️','💔','🎉','🙈','😱','🤔','😅','😇','🤝','👌','✨','💯','🎂','🌹','☕'];

const GIPHY = 'dc6zaTOxFJmzC';

export default function MediaPanel({ onEmoji, onGif, onSticker }) {
  const { t } = useT();
  const [tab, setTab] = useState('emoji');
  const [cat, setCat] = useState('😀');
  const [q, setQ] = useState('');
  const [gifs, setGifs] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (tab !== 'gif') return undefined;
    let alive = true;
    const id = setTimeout(() => {
      const url = q.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY}&q=${encodeURIComponent(q)}&limit=24&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY}&limit=24&rating=g`;
      fetch(url)
        .then((r) => r.json())
        .then((j) => {
          if (!alive) return;
          setErr('');
          setGifs((j.data || []).map((g) => ({ id: g.id, url: g.images.fixed_height.url, small: g.images.fixed_height_small.url })));
        })
        .catch(() => alive && setErr(t('gifFail')));
    }, q ? 400 : 0);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [tab, q]);

  return (
    <div className="media-panel">
      <div className="mp-tabs">
        <button className={tab === 'emoji' ? 'on' : ''} onClick={() => setTab('emoji')}>
          <Icon n="smile" size={20} />
        </button>
        <button className={tab === 'gif' ? 'on' : ''} onClick={() => setTab('gif')}>
          <Icon n="gif" size={20} />
        </button>
        <button className={tab === 'sticker' ? 'on' : ''} onClick={() => setTab('sticker')}>
          <Icon n="sticker" size={20} />
        </button>
      </div>
      {tab === 'emoji' && (
        <>
          <div className="mp-cats">
            {Object.keys(EMOJI).map((c) => (
              <button key={c} className={c === cat ? 'on' : ''} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="mp-grid">
            {EMOJI[cat].map((e) => (
              <button key={e} onClick={() => onEmoji(e)}>
                {e}
              </button>
            ))}
          </div>
        </>
      )}
      {tab === 'sticker' && (
        <div className="mp-grid big">
          {STICKERS.map((e) => (
            <button key={e} onClick={() => onSticker(e)}>
              {e}
            </button>
          ))}
        </div>
      )}
      {tab === 'gif' && (
        <>
          <input className="mp-search" placeholder={t('searchGif')} value={q} onChange={(e) => setQ(e.target.value)} dir="auto" />
          {err && <div className="error">{err}</div>}
          <div className="mp-gifs">
            {(gifs || []).map((g) => (
              <button key={g.id} onClick={() => onGif(g.url)}>
                <img src={g.small} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
