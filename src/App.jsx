import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, configMissing } from './firebase';
import Login from './components/Login.jsx';
import Sidebar from './components/Sidebar.jsx';
import ChatWindow from './components/ChatWindow.jsx';
import Settings from './components/Settings.jsx';
import NewGroup from './components/NewGroup.jsx';
import Starred from './components/Starred.jsx';
import Broadcast from './components/Broadcast.jsx';
import PinModal from './components/PinModal.jsx';
import { useLock } from './lock.js';
import { APK_URL, IS_NATIVE, WEB_URL } from './config.js';
import { CallScreen, IncomingCall, IncomingRoomCall, RoomScreen } from './components/CallScreen.jsx';
import { useCall } from './useCall.js';
import { useRoom } from './useRoom.js';
import { useLiveTranslate } from './useLiveTranslate.js';
import { LangCtx, detectLang, makeT, sameLang } from './i18n.js';
import { chatIdFor, tsMs } from './utils.js';
import { ding } from './sound.js';

const readLS = (k) => {
  try {
    return localStorage.getItem(k);
  } catch (e) {
    return null;
  }
};

const meetParam = () => {
  try {
    return new URLSearchParams(window.location.search).get('meet') || '';
  } catch (e) {
    return '';
  }
};

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = ekhono check hocche
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersError, setUsersError] = useState('');
  const [chats, setChats] = useState([]);
  const [starredList, setStarredList] = useState([]);
  const [sel, setSel] = useState(null); // {type:'direct', uid} | {type:'group', id}
  const [showSettings, setShowSettings] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [showStarred, setShowStarred] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showLinked, setShowLinked] = useState(false);
  const [pin, setPin] = useState(null); // { mode, then }
  const [lockedView, setLockedView] = useState(false);
  const lock = useLock(user ? user.uid : 'anon');
  useEffect(() => {
    const h = () => document.visibilityState === 'hidden' && setLockedView(false);
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, []);
  const [dismissed, setDismissed] = useState({});
  const [tick, setTick] = useState(0);
  const [pendingMeet, setPendingMeet] = useState(meetParam());
  const [liveOn, setLiveOn] = useState(false);
  const [liveSpeak, setLiveSpeak] = useState(false);
  const [soundOn, setSoundOn] = useState(() => readLS('cc_sound') !== 'off');
  const [prefLang, setPrefLang] = useState(() => readLS('cc_lang') || detectLang());

  const ensured = useRef(null);
  const seenChats = useRef(null);
  const selRef = useRef(null);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

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
      photo: (profile && profile.photo) || '',
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

  // Starred messages
  useEffect(() => {
    if (!user) {
      setStarredList([]);
      return undefined;
    }
    return onSnapshot(
      collection(db, 'users', user.uid, 'starred'),
      (snap) => setStarredList(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
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
            const isOpen = s && s.chatId === c.id && document.visibilityState === 'visible';
            if (nowMap[c.id] > was && c.lastFrom && c.lastFrom !== user.uid && !isOpen && soundRef.current) ding();
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

  const starredIds = useMemo(() => new Set(starredList.map((s) => s.id)), [starredList]);

  const call = useCall(me, t);
  const room = useRoom(me);

  // Call-e live translate: bhasha alada hole auto chalu
  const callId = call.active ? call.active.id : null;
  const peerLang = call.active && usersMap[call.active.peerId] ? usersMap[call.active.peerId].lang : null;
  useEffect(() => {
    setLiveSpeak(false);
    setLiveOn(!!(callId && me && peerLang && !sameLang(peerLang, me.lang)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);
  const live = useLiveTranslate({ callId, enabled: !!callId && liveOn, speak: liveSpeak, me: me || {} });

  // ---- actions ----
  const onStar = async ({ chatId, chatTitle, m, on }) => {
    const ref = doc(db, 'users', me.uid, 'starred', `${chatId}_${m.id}`);
    try {
      if (on) {
        await setDoc(ref, {
          chatId,
          msgId: m.id,
          from: m.from,
          fromName: (usersMap[m.from] && usersMap[m.from].name) || m.fromName || '',
          type: m.type,
          text: m.text || m.fileName || '',
          chatTitle,
          createdMs: tsMs(m.createdAt) || Date.now(),
          starredMs: Date.now(),
        });
      } else {
        await deleteDoc(ref);
      }
    } catch (e) {
      /* ignore */
    }
  };

  const openStarred = (s) => {
    setShowStarred(false);
    const c = chatsById[s.chatId];
    if (c && c.isGroup) setSel({ type: 'group', id: c.id });
    else {
      const other = s.chatId.split('_').find((x) => x !== me.uid);
      if (other) setSel({ type: 'direct', uid: other });
    }
  };

  const readAll = () => {
    chats.forEach((c) => {
      if (((c.unread && c.unread[me.uid]) || 0) > 0) {
        updateDoc(doc(db, 'chats', c.id), {
          [`lastRead.${me.uid}`]: serverTimestamp(),
          [`unread.${me.uid}`]: 0,
        }).catch(() => {});
      }
    });
  };

  const startGroupCall = async (chat, type) => {
    if (call.active || room.room) return;
    const callRef = doc(collection(db, 'chats', chat.id, 'gcalls'));
    const chatRef = doc(db, 'chats', chat.id);
    try {
      await setDoc(callRef, { type, startedBy: me.uid, startedMs: Date.now() });
      await updateDoc(chatRef, {
        activeCall: {
          id: callRef.id,
          type,
          startedBy: me.uid,
          startedByName: me.name,
          startedMs: Date.now(),
        },
      });
    } catch (e) {
      console.warn(e);
      return;
    }
    room.join({
      kind: 'group',
      base: ['chats', chat.id, 'gcalls', callRef.id],
      title: chat.name,
      type,
      onEmpty: () => updateDoc(chatRef, { activeCall: null }),
    });
  };

  const joinGroupCall = (chat) => {
    if (call.active || room.room || !chat.activeCall) return;
    room.join({
      kind: 'group',
      base: ['chats', chat.id, 'gcalls', chat.activeCall.id],
      title: chat.name,
      type: chat.activeCall.type,
      onEmpty: () => updateDoc(doc(db, 'chats', chat.id), { activeCall: null }),
    });
  };

  const joinMeeting = async ({ code, title, type }) => {
    if (call.active || room.room) return;
    await room.join({ kind: 'meeting', base: ['meetings', code], title, type, code });
  };

  // Group call-er incoming ring (shuru hoyar 45s-er moddhe)
  const ringingChat =
    me && !call.active && !room.room && !call.incoming
      ? chats.find(
          (c) =>
            c.isGroup &&
            c.activeCall &&
            c.activeCall.startedBy !== me.uid &&
            Date.now() - (c.activeCall.startedMs || 0) < 45000 &&
            !dismissed[c.activeCall.id]
        )
      : null;
  void tick;

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

  if (user === undefined) {
    return (
      <div className="splash">
        <img src="/logo.png" alt="" width="96" height="96" />
      </div>
    );
  }

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

  const busy = !!call.active || !!room.room;
  const errorObj = call.error || room.error;

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
          callBusy={busy}
          onSettings={() => setShowSettings(true)}
          onNewGroup={() => setShowGroup(true)}
          onStarred={() => setShowStarred(true)}
          onReadAll={readAll}
          onJoinMeeting={joinMeeting}
          onBroadcast={() => setShowBroadcast(true)}
          onLinked={() => setShowLinked(true)}
          lockedIds={lock.ids}
          lockedView={lockedView}
          onOpenLocked={() => setPin({ mode: 'verify', then: () => setLockedView(true) })}
          onCloseLocked={() => setLockedView(false)}
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
            starredIds={starredIds}
            onStar={onStar}
            onBack={() => setSel(null)}
            onCall={call.startCall}
            callBusy={busy}
            onGroupCall={startGroupCall}
            onJoinRoom={joinGroupCall}
            locked={lock.ids.has(chatProps.chatId)}
            onToggleLock={() => {
              const id = chatProps.chatId;
              const doToggle = () => {
                const was = lock.ids.has(id);
                lock.toggle(id);
                if (!was) setSel(null);
              };
              if (lock.hasPin) doToggle();
              else setPin({ mode: 'set', then: doToggle });
            }}
          />
        ) : (
          <section className="chat placeholder">
            <div>
              <img className="logo-img" src="/logo.png" alt="BewonChat" />
              <h2>BewonChat</h2>
              <p className="muted">{t('tagline')}</p>
            </div>
          </section>
        )}

        {showSettings && (
          <Settings
            me={me}
            soundOn={soundOn}
            onSound={(v) => {
              setSoundOn(v);
              try {
                localStorage.setItem('cc_sound', v ? 'on' : 'off');
              } catch (e) {
                /* ignore */
              }
            }}
            onClose={() => setShowSettings(false)}
          />
        )}
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
        {showBroadcast && (
          <Broadcast me={me} users={users.filter((u) => u.uid !== me.uid)} onClose={() => setShowBroadcast(false)} />
        )}
        {pin && (
          <PinModal
            mode={pin.mode}
            lock={lock}
            onClose={() => setPin(null)}
            onDone={() => {
              const f = pin.then;
              setPin(null);
              if (f) f();
            }}
          />
        )}
        {showLinked && (
          <div className="modal-back" onClick={() => setShowLinked(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{t('linkedDevices')}</h2>
              <p className="muted">{t('linkedInfo')}</p>
              <a className="link" href={WEB_URL} target="_blank" rel="noopener noreferrer">
                {WEB_URL}
              </a>
              {!IS_NATIVE && (
              <a className="link" href={APK_URL} target="_blank" rel="noopener noreferrer">
                {t('downloadApp')}
              </a>
              )}
              <button className="ghost" onClick={() => setShowLinked(false)}>
                {t('close')}
              </button>
            </div>
          </div>
        )}
        {showStarred && (
          <Starred items={starredList} onOpen={openStarred} onClose={() => setShowStarred(false)} />
        )}

        {pendingMeet && !busy && (
          <div className="modal-back">
            <div className="modal">
              <h2>🎥 {t('joinMeetPrompt', { code: pendingMeet })}</h2>
              <div className="modal-actions">
                <button
                  className="primary"
                  onClick={() => {
                    const code = pendingMeet;
                    setPendingMeet('');
                    try {
                      window.history.replaceState({}, '', window.location.pathname);
                    } catch (e) {
                      /* ignore */
                    }
                    joinMeeting({ code, title: code, type: 'video' });
                  }}
                >
                  {t('join')}
                </button>
                <button
                  className="ghost"
                  onClick={() => {
                    setPendingMeet('');
                    try {
                      window.history.replaceState({}, '', window.location.pathname);
                    } catch (e) {
                      /* ignore */
                    }
                  }}
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {call.incoming && !call.active && !room.room && (
          <IncomingCall call={call.incoming} onAccept={call.acceptCall} onReject={call.rejectCall} />
        )}

        {ringingChat && (
          <IncomingRoomCall
            chat={ringingChat}
            onJoin={() => joinGroupCall(ringingChat)}
            onDismiss={() => setDismissed((d) => ({ ...d, [ringingChat.activeCall.id]: true }))}
          />
        )}

        {call.active && (
          <CallScreen
            active={call.active}
            localStream={call.localStream}
            remoteStream={call.remoteStream}
            onEnd={call.endCall}
            onToggleMic={call.toggleMic}
            onToggleCam={call.toggleCam}
            onSwitchCam={call.switchCamera}
            onShare={call.toggleShare}
            sharing={call.sharing}
            live={{
              on: liveOn,
              toggle: () => setLiveOn((v) => !v),
              speak: liveSpeak,
              toggleSpeak: () => setLiveSpeak((v) => !v),
              lines: live.lines,
              micState: live.micState,
            }}
          />
        )}

        {room.room && (
          <RoomScreen
            me={me}
            room={room.room}
            localStream={room.localStream}
            streams={room.streams}
            participants={room.participants}
            usersMap={usersMap}
            sharing={room.sharing}
            onLeave={room.leave}
            onToggleMic={room.toggleMic}
            onToggleCam={room.toggleCam}
            onSwitchCam={room.switchCamera}
            onShare={room.toggleShare}
          />
        )}

        {errorObj && (
          <div
            className="toast"
            onClick={() => {
              call.clearError();
              room.clearError();
            }}
          >
            {t(errorObj.key, { name: errorObj.name })}
          </div>
        )}
      </div>
    </LangCtx.Provider>
  );
}
