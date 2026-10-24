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
    { name: 'Washington Post', url: 'https://www.washingtonpost.com' },
    { name: 'DW (Deutsche Welle)', url: 'https://www.dw.com' },
    { name: 'France 24', url: 'https://www.france24.com' },
    { name: 'Sky News', url: 'https://news.sky.com' },
    { name: 'NBC News', url: 'https://www.nbcnews.com' },
    { name: 'ABC News', url: 'https://abcnews.go.com' },
    { name: 'CBS News', url: 'https://www.cbsnews.com' },
    { name: 'NPR', url: 'https://www.npr.org' },
    { name: 'Euronews', url: 'https://www.euronews.com' },
    { name: 'RT', url: 'https://www.rt.com' },
    { name: 'CGTN', url: 'https://www.cgtn.com' },
    { name: 'NHK World', url: 'https://www3.nhk.or.jp/nhkworld' },
    { name: 'Voice of America', url: 'https://www.voanews.com' },
    { name: 'TRT World', url: 'https://www.trtworld.com' },
    { name: 'The Economist', url: 'https://www.economist.com' },
    { name: 'Time', url: 'https://time.com' },
    { name: 'The Independent', url: 'https://www.independent.co.uk' },
  ] },
  { group: 'Bangladesh', items: [
    { name: 'BBC Bangla', url: 'https://www.bbc.com/bengali' },
    { name: 'Prothom Alo', url: 'https://www.prothomalo.com' },
    { name: 'The Daily Star', url: 'https://www.thedailystar.net' },
    { name: 'Dhaka Tribune', url: 'https://www.dhakatribune.com' },
    { name: 'bdnews24', url: 'https://bdnews24.com' },
    { name: 'Kaler Kantho', url: 'https://www.kalerkantho.com' },
    { name: 'Jugantor', url: 'https://www.jugantor.com' },
    { name: 'Samakal', url: 'https://samakal.com' },
    { name: 'Ittefaq', url: 'https://www.ittefaq.com.bd' },
    { name: 'Jai Jai Din', url: 'https://www.jaijaidinbd.com' },
    { name: 'Bangladesh Pratidin', url: 'https://www.bd-pratidin.com' },
    { name: 'Daily Naya Diganta', url: 'https://www.dailynayadiganta.com' },
    { name: 'Daily Inqilab', url: 'https://www.dailyinqilab.com' },
    { name: 'The Business Standard', url: 'https://www.tbsnews.net' },
    { name: 'New Age', url: 'https://www.newagebd.net' },
    { name: 'Financial Express BD', url: 'https://thefinancialexpress.com.bd' },
    { name: 'Jagonews24', url: 'https://www.jagonews24.com' },
    { name: 'Somoy TV', url: 'https://www.somoynews.tv' },
    { name: 'Jamuna TV', url: 'https://jamunatv.com' },
    { name: 'Channel 24', url: 'https://www.channel24bd.tv' },
    { name: 'Ekattor TV', url: 'https://ekattor.tv' },
    { name: 'Daily Sun', url: 'https://www.daily-sun.com' },
    { name: 'Bangla Tribune', url: 'https://www.banglatribune.com' },
    { name: 'Dhaka Post', url: 'https://www.dhakapost.com' },
    { name: 'Daily Manab Zamin', url: 'https://mzamin.com' },
    { name: 'NTV BD', url: 'https://www.ntvbd.com' },
  ] },
  { group: 'India', items: [
    { name: 'Times of India', url: 'https://timesofindia.indiatimes.com' },
    { name: 'The Hindu', url: 'https://www.thehindu.com' },
    { name: 'NDTV', url: 'https://www.ndtv.com' },
    { name: 'Hindustan Times', url: 'https://www.hindustantimes.com' },
    { name: 'Indian Express', url: 'https://indianexpress.com' },
    { name: 'India Today', url: 'https://www.indiatoday.in' },
    { name: 'Anandabazar', url: 'https://www.anandabazar.com' },
    { name: 'Dainik Bhaskar', url: 'https://www.bhaskar.com' },
    { name: 'Aaj Tak', url: 'https://www.aajtak.in' },
    { name: 'The Wire', url: 'https://thewire.in' },
  ] },
  { group: 'Pakistan / South Asia', items: [
    { name: 'Dawn', url: 'https://www.dawn.com' },
    { name: 'Geo News', url: 'https://www.geo.tv' },
    { name: 'The Express Tribune', url: 'https://tribune.com.pk' },
    { name: 'Daily Mirror (Sri Lanka)', url: 'https://www.dailymirror.lk' },
    { name: 'Kathmandu Post', url: 'https://kathmandupost.com' },
    { name: 'Khaleej Times', url: 'https://www.khaleejtimes.com' },
    { name: 'Gulf News', url: 'https://gulfnews.com' },
    { name: 'Arab News', url: 'https://www.arabnews.com' },
    { name: 'Gulf Times', url: 'https://www.gulf-times.com' },
    { name: 'The National UAE', url: 'https://www.thenationalnews.com' },
  ] },
  { group: 'Asia / Pacific', items: [
    { name: 'South China Morning Post', url: 'https://www.scmp.com' },
    { name: 'Japan Times', url: 'https://www.japantimes.co.jp' },
    { name: 'Straits Times', url: 'https://www.straitstimes.com' },
    { name: 'The Korea Herald', url: 'https://www.koreaherald.com' },
    { name: 'Channel News Asia', url: 'https://www.channelnewsasia.com' },
    { name: 'ABC Australia', url: 'https://www.abc.net.au/news' },
    { name: 'NZ Herald', url: 'https://www.nzherald.co.nz' },
    { name: 'Bangkok Post', url: 'https://www.bangkokpost.com' },
    { name: 'Jakarta Post', url: 'https://www.thejakartapost.com' },
    { name: 'Malay Mail', url: 'https://www.malaymail.com' },
  ] },
  { group: 'Africa / Europe / Americas', items: [
    { name: 'Al Ahram', url: 'https://english.ahram.org.eg' },
    { name: 'News24 (South Africa)', url: 'https://www.news24.com' },
    { name: 'Daily Nation (Kenya)', url: 'https://nation.africa' },
    { name: 'Le Monde', url: 'https://www.lemonde.fr/en' },
    { name: 'El País', url: 'https://english.elpais.com' },
    { name: 'Der Spiegel', url: 'https://www.spiegel.de/international' },
    { name: 'The Globe and Mail', url: 'https://www.theglobeandmail.com' },
    { name: 'O Globo', url: 'https://oglobo.globo.com' },
    { name: 'Clarín', url: 'https://www.clarin.com' },
    { name: 'Meduza', url: 'https://meduza.io/en' },
  ] },
  { group: 'Tech / Science', items: [
    { name: 'TechCrunch', url: 'https://techcrunch.com' },
    { name: 'The Verge', url: 'https://www.theverge.com' },
    { name: 'Wired', url: 'https://www.wired.com' },
    { name: 'Ars Technica', url: 'https://arstechnica.com' },
    { name: 'BBC Technology', url: 'https://www.bbc.com/news/technology' },
    { name: 'Nature', url: 'https://www.nature.com/news' },
    { name: 'Science Daily', url: 'https://www.sciencedaily.com' },
    { name: 'Hacker News', url: 'https://news.ycombinator.com' },
  ] },
  { group: 'Crypto / Finance', items: [
    { name: 'CoinDesk', url: 'https://www.coindesk.com' },
    { name: 'Cointelegraph', url: 'https://cointelegraph.com' },
    { name: 'CoinMarketCap', url: 'https://coinmarketcap.com' },
    { name: 'TradingView News', url: 'https://www.tradingview.com/news/' },
    { name: 'Decrypt', url: 'https://decrypt.co' },
    { name: 'The Block', url: 'https://www.theblock.co' },
    { name: 'CryptoSlate', url: 'https://cryptoslate.com' },
    { name: 'Investing.com', url: 'https://www.investing.com/news' },
    { name: 'Financial Times', url: 'https://www.ft.com' },
    { name: 'Wall Street Journal', url: 'https://www.wsj.com' },
    { name: 'CNBC', url: 'https://www.cnbc.com' },
    { name: 'MarketWatch', url: 'https://www.marketwatch.com' },
  ] },
  { group: 'Sports', items: [
    { name: 'ESPN', url: 'https://www.espn.com' },
    { name: 'Cricinfo', url: 'https://www.espncricinfo.com' },
    { name: 'BBC Sport', url: 'https://www.bbc.com/sport' },
    { name: 'Sky Sports', url: 'https://www.skysports.com' },
    { name: 'Goal', url: 'https://www.goal.com' },
    { name: 'Cricbuzz', url: 'https://www.cricbuzz.com' },
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
      <h3>{t('newsHint')}</h3>
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
                {t('readInLang')}
              </a>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
