import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, configMissing } from './firebase';
import Login from './components/Login.jsx';
import Sidebar from './components/Sidebar.jsx';
import ChatWindow from './components/ChatWindow.jsx';
import { CallScreen, IncomingCall } from './components/CallScreen.jsx';
import { useCall } from './useCall.js';

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = ekhono check hocche
  const [peer, setPeer] = useState(null);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);

  const me = useMemo(
    () =>
      user
        ? { uid: user.uid, name: user.displayName || user.email?.split('@')[0], email: user.email }
        : null,
    [user]
  );

  // Profile doc na thakle (jemon purono account) toiri kore daw
  useEffect(() => {
    if (me) {
      setDoc(
        doc(db, 'users', me.uid),
        { uid: me.uid, name: me.name, email: me.email?.toLowerCase(), lastSeen: serverTimestamp() },
        { merge: true }
      );
    }
  }, [me]);

  const call = useCall(me);

  if (configMissing) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <h1>Firebase config nai</h1>
          <p className="sub">
            <code>.env.example</code> file-er nam <code>.env</code> kore Firebase-er value-gulo
            boshao, tarpor abar <code>npm run dev</code> chalao.
          </p>
        </div>
      </div>
    );
  }

  if (user === undefined) return <div className="splash">💬</div>;
  if (!user) return <Login />;

  return (
    <div className={`app ${peer ? 'chat-open' : ''}`}>
      <Sidebar
        me={me}
        selectedUid={peer?.uid}
        onSelect={setPeer}
        onCall={call.startCall}
        callBusy={!!call.active}
      />

      {peer ? (
        <ChatWindow
          key={peer.uid}
          me={me}
          peer={peer}
          onBack={() => setPeer(null)}
          onCall={call.startCall}
          callBusy={!!call.active}
        />
      ) : (
        <section className="chat placeholder">
          <div>
            <div className="logo">💬</div>
            <h2>ChatCall</h2>
            <p className="muted">Baam theke kono bondhu bachho, message ba call koro.</p>
          </div>
        </section>
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
          {call.error}
        </div>
      )}
    </div>
  );
}
