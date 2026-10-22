import { useMemo, useState } from 'react';
import { useT } from '../i18n.js';

const PORTALS = [
  { group: 'Global', items: [
    { name: 'BBC News', url: 'https://www.bbc.com/news' },
    { name: 'Reuters', url: 'https://www.reuters.com' },
    { name: 'Associated Press', url: 'https://apnews.com' },
    { name: 'Al Jazeera', url: 'https://www.aljazeera.com' },
    { name: 'CNN', url: 'https://edition.cnn.com' },
    { name: 'The Guardian', url: 'https://www.theguardian.com/international' },
    { name: 'The New York Times', url: 'https://www.nytimes.com' },
    { name: 'DW (Deutsche Welle)', url: 'https://www.dw.com' },
    { name: 'France 24', url: 'https://www.france24.com' },
    { name: 'Bloomberg', url: 'https://www.bloomberg.com' },
  ] },
  { group: 'Bangladesh', items: [
    { name: 'BBC Bangla', url: 'https://www.bbc.com/bengali' },
    { name: 'Prothom Alo', url: 'https://www.prothomalo.com' },
    { name: 'The Daily Star', url: 'https://www.thedailystar.net' },
    { name: 'Dhaka Tribune', url: 'https://www.dhakatribune.com' },
    { name: 'bdnews24', url: 'https://bdnews24.com' },
  ] },
  { group: 'Crypto / Finance', items: [
    { name: 'CoinDesk', url: 'https://www.coindesk.com' },
    { name: 'Cointelegraph', url: 'https://cointelegraph.com' },
    { name: 'CoinMarketCap', url: 'https://coinmarketcap.com' },
    { name: 'TradingView News', url: 'https://www.tradingview.com/news/' },
  ] },
];

export default function News({ lang }) {
  const { t } = useT();
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    return PORTALS.map((g) => ({
      ...g,
      items: g.items.filter((i) => !s || i.name.toLowerCase().includes(s)),
    })).filter((g) => g.items.length);
  }, [q]);

  // Google Translate diye pura website nijer bhasha-y pora
  const translated = (url) =>
    `https://translate.google.com/translate?sl=auto&tl=${encodeURIComponent(lang)}&u=${encodeURIComponent(url)}`;

  return (
    <div className="panel">
      <h3>📰 {t('newsHint')}</h3>
      <input placeholder={t('search')} value={q} dir="auto" onChange={(e) => setQ(e.target.value)} />
      {groups.map((g) => (
        <div key={g.group}>
          <div className="group-title">{g.group}</div>
          {g.items.map((i) => (
            <div key={i.url} className="news-row">
              <a href={i.url} target="_blank" rel="noopener noreferrer" className="news-link">
                {i.name}
              </a>
              <a
                href={translated(i.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="news-tr"
                title={t('readInLang')}
              >
                🌐 {t('readInLang')}
              </a>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
