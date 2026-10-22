import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db, configMissing } from './firebase';
import Login from './components/Login.jsx';
import Sidebar from './components/Sidebar.jsx';
import ChatWindow from './components/ChatWindow.jsx';
import Settings from './components/Settings.jsx';
import NewGroup from './components/NewGroup.jsx';
import { CallScreen, IncomingCall } from './components/CallScreen.jsx';
import { useCall } from './useCall.js';
import { LangCtx, detectLang, makeT } from './i18n.js';
import { chatIdFor, tsMs } from './utils.js';
import { ding } from './sound.js';

const readLS = (k) => {
  try {
    return localStorage.getItem(k);
  } catch (e) {
    return null;
  }
};

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = ekhono check hocche
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersError, setUsersError] = useState('');
  const [chats, setChats] = useState([]);
  const [sel, setSel] = useState(null); // {type:'direct', uid} | {type:'group', id}
  const [showSettings, setShowSettings] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [prefLang, setPrefLang] = useState(() => readLS('cc_lang') || detectLang());

  const ensured = useRef(null);
  const seenChats = useRef(null);
  const selRef = useRef(null);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);

  const lang = (profile && profile.lang) || prefLang;
  const t = useMemo(() => makeT(lang), [lang]);
  const langValue = useMemo(() => ({ lang, t }), [lang, t]);

  // Nijer profile
  useEffect(() => {
    setProfile(null);
    setProfileLoaded(false);
    if (!user) return undefined;
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        setProfile(snap.exists() ? snap.data() : null);
        setProfileLoaded(true);
      },
      () => setProfileLoaded(true)
    );
  }, [user]);

  // Profile na thakle (notun account ba purono account) toiri kore
  useEffect(() => {
    if (!user || !profileLoaded) return;
    if (profile && profile.uid && profile.name && profile.lang) return;
    if (ensured.current === user.uid) return;
    ensured.current = user.uid;
    const pendingName = readLS('cc_pending_name');
    setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        email: (user.email || '').toLowerCase(),
        name:
          (profile && profile.name) ||
          pendingName ||
          user.displayName ||
          (user.email || '').split('@')[0],
        lang: (profile && profile.lang) || readLS('cc_lang') || detectLang(),
        autoTranslate: profile && profile.autoTranslate !== undefined ? profile.autoTranslate : true,
        lastSeenMs: Date.now(),
      },
      { merge: true }
    ).catch((e) => console.warn('profile create failed', e));
  }, [user, profile, profileLoaded]);

  const me = useMemo(() => {
    if (!user) return null;
    return {
      uid: user.uid,
      email: user.email,
      name: (profile && profile.name) || user.displayName || (user.email || '').split('@')[0],
      lang,
      autoTranslate: profile ? profile.autoTranslate !== false : true,
      about: (profile && profile.about) || '',
    };
  }, [user, profile, lang]);

  // Online presence
  useEffect(() => {
    if (!user) return undefined;
    const ping = () => {
      if (document.visibilityState === 'visible') {
        updateDoc(doc(db, 'users', user.uid), { lastSeenMs: Date.now() }).catch(() => {});
      }
    };
    ping();
    const id = setInterval(ping, 60000);
    document.addEventListener('visibilitychange', ping);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', ping);
    };
  }, [user]);

  // Sob user
  useEffect(() => {
    if (!user) {
      setUsers([]);
      return undefined;
    }
    return onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setUsersError('');
        setUsers(snap.docs.map((d) => d.data()).filter((u) => u.uid && u.name));
      },
      (err) => setUsersError(err.code || 'error')
    );
  }, [user]);

  // Amar sob chat (direct + group)
  useEffect(() => {
    seenChats.current = null;
    if (!user) {
      setChats([]);
      return undefined;
    }
    const q = query(collection(db, 'chats'), where('members', 'array-contains', user.uid));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setChats(list);

        // Notun message ashle sound
        const prev = seenChats.current;
        const nowMap = {};
        list.forEach((c) => {
          nowMap[c.id] = tsMs(c.updatedAt);
        });
        if (prev) {
          const s = selRef.current;
          list.forEach((c) => {
            const was = prev[c.id] || 0;
            const isOpen = s && (s.chatId === c.id) && document.visibilityState === 'visible';
            if (nowMap[c.id] > was && c.lastFrom && c.lastFrom !== user.uid && !isOpen) ding();
          });
        }
        seenChats.current = nowMap;
      },
      () => {}
    );
  }, [user]);

  const usersMap = useMemo(() => {
    const m = {};
    users.forEach((u) => {
      m[u.uid] = u;
    });
    return m;
  }, [users]);

  const chatsById = useMemo(() => {
    const m = {};
    chats.forEach((c) => {
      m[c.id] = c;
    });
    return m;
  }, [chats]);

  const call = useCall(me, t);

  // Ekhon kon chat khola
  let chatProps = null;
  if (me && sel) {
    if (sel.type === 'direct' && usersMap[sel.uid]) {
      const chatId = chatIdFor(me.uid, sel.uid);
      chatProps = { chatId, peer: usersMap[sel.uid], chat: chatsById[chatId] };
    } else if (sel.type === 'group' && chatsById[sel.id]) {
      chatProps = { chatId: sel.id, group: chatsById[sel.id], chat: chatsById[sel.id] };
    }
  }
  selRef.current = chatProps ? { chatId: chatProps.chatId } : null;

  if (configMissing) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <h1>Firebase config missing</h1>
          <p className="sub">
            Rename <code>.env.example</code> to <code>.env</code>, fill in the Firebase values and
            run <code>npm run dev</code> again.
          </p>
        </div>
      </div>
    );
  }

  if (user === undefined) return <div className="splash">💬</div>;

  if (!user) {
    return (
      <LangCtx.Provider value={langValue}>
        <Login
          lang={prefLang}
          onLang={(l) => {
            setPrefLang(l);
            try {
              localStorage.setItem('cc_lang', l);
            } catch (e) {
              /* ignore */
            }
          }}
        />
      </LangCtx.Provider>
    );
  }

  return (
    <LangCtx.Provider value={langValue}>
      <div className={`app ${chatProps ? 'chat-open' : ''}`}>
        <Sidebar
          me={me}
          users={users}
          usersMap={usersMap}
          chats={chats}
          chatsById={chatsById}
          loadError={usersError}
          selectedKey={chatProps ? chatProps.chatId : null}
          onSelect={setSel}
          onCall={call.startCall}
          callBusy={!!call.active}
          onSettings={() => setShowSettings(true)}
          onNewGroup={() => setShowGroup(true)}
        />

        {chatProps ? (
          <ChatWindow
            key={chatProps.chatId}
            me={me}
            chatId={chatProps.chatId}
            peer={chatProps.peer}
            group={chatProps.group}
            chat={chatProps.chat}
            usersMap={usersMap}
            onBack={() => setSel(null)}
            onCall={call.startCall}
            callBusy={!!call.active}
          />
        ) : (
          <section className="chat placeholder">
            <div>
              <div className="logo">💬</div>
              <h2>ChatCall</h2>
              <p className="muted">{t('tagline')}</p>
            </div>
          </section>
        )}

        {showSettings && <Settings me={me} onClose={() => setShowSettings(false)} />}
        {showGroup && (
          <NewGroup
            me={me}
            users={users.filter((u) => u.uid !== me.uid)}
            onClose={() => setShowGroup(false)}
            onCreated={(id) => {
              setShowGroup(false);
              setSel({ type: 'group', id });
            }}
          />
        )}

        {call.incoming && !call.active && (
          <IncomingCall call={call.incoming} onAccept={call.acceptCall} onReject={call.rejectCall} />
        )}

        {call.active && (
          <CallScreen
            active={call.active}
            localStream={call.localStream}
            remoteStream={call.remoteStream}
            onEnd={call.endCall}
            onToggleMic={call.toggleMic}
            onToggleCam={call.toggleCam}
          />
        )}

        {call.error && (
          <div className="toast" onClick={call.clearError}>
            {t(call.error.key, { name: call.error.name })}
          </div>
        )}
      </div>
    </LangCtx.Provider>
  );
}
