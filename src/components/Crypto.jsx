import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { useT } from '../i18n.js';

const PRICES =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&price_change_percentage=24h';
const RPC = 'https://ethereum-rpc.publicnode.com';

// Read-only DeFi dashboard: live price + Ethereum wallet balance (kono private key lage na, kichu pathano jay na)
export default function Crypto({ onClose }) {
  const { t } = useT();
  const [coins, setCoins] = useState(null);
  const [err, setErr] = useState('');
  const [addr, setAddr] = useState(() => {
    try {
      return localStorage.getItem('bc_wallet') || '';
    } catch (e) {
      return '';
    }
  });
  const [bal, setBal] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch(PRICES)
      .then((r) => r.json())
      .then((d) => alive && Array.isArray(d) && setCoins(d))
      .catch(() => alive && setErr(t('priceFail')));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lookup = async () => {
    setBal(null);
    setErr('');
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr.trim())) {
      setErr(t('badAddr'));
      return;
    }
    try {
      localStorage.setItem('bc_wallet', addr.trim());
    } catch (e) {
      /* ignore */
    }
    try {
      const r = await fetch(RPC, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [addr.trim(), 'latest'] }),
      });
      const j = await r.json();
      setBal(Number(BigInt(j.result)) / 1e18);
    } catch (e) {
      setErr(t('priceFail'));
    }
  };

  const eth = coins && coins.find((c) => c.id === 'ethereum');

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="h-icon">
          <Icon n="swap" size={20} /> {t('crypto')}
        </h2>
        <label className="field-label">{t('walletAddr')}</label>
        <input placeholder="0x..." value={addr} onChange={(e) => setAddr(e.target.value)} />
        <button className="primary" onClick={lookup}>
          {t('lookup')}
        </button>
        {bal != null && (
          <div className="ok">
            {bal.toFixed(5)} ETH{eth ? ` ≈ $${(bal * eth.current_price).toFixed(2)}` : ''}
          </div>
        )}
        {err && <div className="error">{err}</div>}
        <div className="muted small">{t('cryptoNote')}</div>
        <div className="coin-list">
          {!coins && !err && <div className="empty">…</div>}
          {coins &&
            coins.map((c) => (
              <div key={c.id} className="coin-row">
                <img src={c.image} alt="" width="24" height="24" />
                <div className="grow">
                  <b>{c.symbol.toUpperCase()}</b> <span className="muted small">{c.name}</span>
                </div>
                <div className="right">
                  <div>${c.current_price.toLocaleString()}</div>
                  <div className={`small ${c.price_change_percentage_24h >= 0 ? 'ok' : 'bad'}`}>
                    {(c.price_change_percentage_24h || 0).toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
        </div>
        <button className="ghost" onClick={onClose}>
          {t('close')}
        </button>
      </div>
    </div>
  );
}
