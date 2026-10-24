import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar.jsx';
import Icon from './Icon.jsx';
import RoomChat from './RoomChat.jsx';
import { useT } from '../i18n.js';
import { startRing, stopRing } from '../sound.js';
import { fmtDur } from '../utils.js';
import { screenShareSupported } from '../media.js';
import { WEB_URL } from '../config.js';
import { hasAudioRoute, resetAudio, setSpeaker } from '../audioRoute.js';
import { startRecorder } from '../recorder.js';
import { sendDirectText } from '../chatSend.js';

// Remote awaj ekta alada <audio> element-e baje (video element-er upor nirbhor kore na)
function RemoteAudio({ stream }) {
  const ref = useRef(null);
  useEffect(() => {
    const a = ref.current;
    if (!a) return undefined;
    a.srcObject = stream || null;
    const tryPlay = () => a.play && a.play().catch(() => {});
    tryPlay();
    document.addEventListener('click', tryPlay);
    document.addEventListener('touchend', tryPlay);
    return () => {
      document.removeEventListener('click', tryPlay);
      document.removeEventListener('touchend', tryPlay);
    };
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline />;
}


function useAudioAndRec(rootRef, streamsFn) {
  const [speaker, setSpk] = useState(true);
  const [rec, setRec] = useState(false);
  const stopRef = useRef(null);
  useEffect(() => {
    setSpeaker(speaker);
  }, [speaker]);
  useEffect(
    () => () => {
      resetAudio();
      if (stopRef.current) stopRef.current();
    },
    []
  );
  const toggleRec = () => {
    if (rec) {
      const st = stopRef.current;
      stopRef.current = null;
      setRec(false);
      if (st) st();
      return;
    }
    try {
      stopRef.current = startRecorder(rootRef.current, streamsFn());
      setRec(true);
    } catch (e) {
      /* ignore */
    }
  };
  return { speaker, toggleSpeaker: () => setSpk((v) => !v), rec, toggleRec };
}

function StreamVideo({ stream, muted, className, onClick }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null;
  }, [stream]);
  useEffect(() => {
    const v = ref.current;
    if (!v || !stream) return undefined;
    const tryPlay = () => v.play && v.play().catch(() => {});
    tryPlay();
    // Autoplay block hole je kono tap-e abar chalu hobe
    document.addEventListener('click', tryPlay);
    document.addEventListener('touchend', tryPlay);
    return () => {
      document.removeEventListener('click', tryPlay);
      document.removeEventListener('touchend', tryPlay);
    };
  }, [stream]);
  return <video ref={ref} className={className} autoPlay playsInline muted={muted} onClick={onClick} />;
}

// Video track-e sotti chobi ashche kina (nai hole avatar dekhai)
function useVideoActive(stream, local, camOff) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!stream) {
      setActive(false);
      return undefined;
    }
    const tracks = stream.getVideoTracks();
    const compute = () => {
      const t = stream.getVideoTracks()[0];
      setActive(!!t && t.readyState === 'live' && (local ? !camOff : !t.muted));
    };
    compute();
    tracks.forEach((t) => {
      t.addEventListener('mute', compute);
      t.addEventListener('unmute', compute);
      t.addEventListener('ended', compute);
    });
    return () => {
      tracks.forEach((t) => {
        t.removeEventListener('mute', compute);
        t.removeEventListener('unmute', compute);
        t.removeEventListener('ended', compute);
      });
    };
  }, [stream, local, camOff]);
  return active;
}

export function IncomingCall({ call, onAccept, onReject }) {
  const { t } = useT();

  useEffect(() => {
    startRing();
    return () => stopRing();
  }, []);

  return (
    <div className="overlay incoming">
      <div className="call-card">
        <Avatar name={call.callerName} size={110} />
        <h2>{call.callerName}</h2>
        <p className="muted">
          {call.type === 'video' ? t('incomingVideo') : t('incomingVoice')} ·{' '}
          {t('incomingSub')}
        </p>
        <div className="call-actions">
          <button className="round red" onClick={onReject} title={t('reject')}>
            <Icon n="phone" size={26} />
          </button>
          <button className="round green" onClick={onAccept} title={t('accept')}>
            <Icon n="phone" size={26} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function IncomingRoomCall({ chat, onJoin, onDismiss }) {
  const { t } = useT();

  useEffect(() => {
    startRing();
    return () => stopRing();
  }, []);

  return (
    <div className="overlay incoming">
      <div className="call-card">
        <Avatar name={chat.name} group size={110} />
        <h2>{chat.name}</h2>
        <p className="muted">
          
          {t('groupCallSub', { name: chat.activeCall.startedByName || '' })}
        </p>
        <div className="call-actions">
          <button className="round red" onClick={onDismiss} title={t('reject')}>
            <Icon n="phone" size={26} />
          </button>
          <button className="round green" onClick={onJoin} title={t('joinCall')}>
            <Icon n="phone" size={26} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Captions({ live }) {
  const { t } = useT();
  const boxRef = useRef(null);
  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [live.lines.length]);
  return (
    <div className="captions" ref={boxRef}>
      {live.micState === 'unsupported' && <div className="cap-note">{t('liveNoMic')}</div>}
      {live.micState === 'denied' && <div className="cap-note">{t('liveDenied')}</div>}
      {live.lines.map((l) => (
        <div key={l.id} className={`cap ${l.mine ? 'mine' : 'theirs'}`} dir="auto">
          {l.text}
        </div>
      ))}
    </div>
  );
}

export function CallScreen({
  active,
  localStream,
  remoteStream,
  netState,
  onEnd,
  onToggleMic,
  onToggleCam,
  onSwitchCam,
  onShare,
  sharing,
  live,
}) {
  const { t } = useT();
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [swapped, setSwapped] = useState(false);
  const rootRef = useRef(null);
  const ar = useAudioAndRec(rootRef, () => [localStream, remoteStream]);
  const [secs, setSecs] = useState(0);
  const isVideo = active.type === 'video';
  const remoteVideo = useVideoActive(remoteStream, false, false);

  useEffect(() => {
    if (active.status !== 'connected') {
      setSecs(0);
      return undefined;
    }
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active.status]);

  return (
    <div className="overlay in-call" ref={rootRef}>
      {/* Remote audio ekhane baje; chobi na thakle video lukano thake */}
      <RemoteAudio stream={remoteStream} />
      <StreamVideo
        stream={remoteStream}
        muted
        className={isVideo && remoteVideo ? (swapped ? 'local-video' : 'remote-video') : 'hidden-media'}
        onClick={() => setSwapped((v) => !v)}
      />

      {!(isVideo && remoteVideo) && (
        <div className="audio-center">
          <Avatar name={active.peerName} size={120} />
        </div>
      )}

      <div className="call-top">
        <h2>{active.peerName}</h2>
        <p>{active.status === 'calling' ? t('calling') : fmtDur(secs)}</p>
        {active.status !== 'calling' && (netState === 'failed' || netState === 'disconnected') && (
          <p className="bad">{t('callNet')}</p>
        )}
        {active.status !== 'calling' && (netState === 'new' || netState === 'checking') && (
          <p className="muted">{t('callConnecting')}</p>
        )}
      </div>

      {isVideo && (
        <StreamVideo
          stream={localStream}
          muted
          className={swapped ? 'remote-video mirror' : 'local-video'}
          onClick={() => setSwapped((v) => !v)}
        />
      )}

      {live && live.on && <Captions live={live} />}

      <div className="call-actions bottom wrap">
        <button
          className={`round sm ${muted ? 'active' : ''}`}
          onClick={() => setMuted(onToggleMic())}
          title={t('mute')}
        >
          <Icon n={muted ? 'mute' : 'mic'} size={20} />
        </button>
        {isVideo && (
          <>
            <button
              className={`round sm ${camOff ? 'active' : ''}`}
              onClick={() => setCamOff(onToggleCam())}
              title={t('camera')}
            >
              <Icon n="video" size={20} />
            </button>
            <button className="round sm" onClick={onSwitchCam} title={t('switchCam')}>
              <Icon n="swap" size={20} />
            </button>
            {screenShareSupported() && (
              <button
                className={`round sm ${sharing ? 'active' : ''}`}
                onClick={onShare}
                title={sharing ? t('stopShare') : t('shareScreen')}
              >
                <Icon n="camera" size={20} />
              </button>
            )}
          </>
        )}
        {live && (
          <>
            <button
              className={`round sm ${live.on ? 'active' : ''}`}
              onClick={live.toggle}
              title={t('liveTr')}
            >
              <Icon n="globe" size={20} />
            </button>
            {live.on && (
              <button
                className={`round sm ${live.speak ? 'active' : ''}`}
                onClick={live.toggleSpeak}
                title={t('speakTr')}
              >
                <Icon n="volume" size={20} />
              </button>
            )}
          </>
        )}
        {hasAudioRoute && (
          <button className={`round sm ${ar.speaker ? 'active' : ''}`} onClick={ar.toggleSpeaker} title={t('speaker')}>
            <Icon n="volume" size={20} />
          </button>
        )}
        <button className={`round sm ${ar.rec ? 'active rec-on' : ''}`} onClick={ar.toggleRec} title={t('record2')}>
          <Icon n="rec" size={20} />
        </button>
        <button className="round sm red" onClick={onEnd} title={t('endCall')}>
          <Icon n="phone" size={22} />
        </button>
      </div>
    </div>
  );
}

function Tile({ uid, name, photo, stream, local, camOff, state, onClick, spot, now }) {
  const active = useVideoActive(stream, local, camOff);
  const react = state && state.react && now - state.react.ms < 4000 ? state.react.e : '';
  return (
    <div className={`tile ${spot ? 'spot' : ''}`} onClick={onClick}>
      <StreamVideo stream={stream} muted={!!local} className={active ? 'tile-video' : 'hidden-media'} />
      {!active && (
        <div className="tile-avatar">
          <Avatar name={name} photo={photo} size={72} />
        </div>
      )}
      {react && <div className="tile-react">{react}</div>}
      <div className="tile-name">
        {state && state.mic === false && <Icon n="mute" size={13} />}
        {state && state.hand && <span className="hand">✋</span>}
        {local ? `${name} (You)` : name}
      </div>
    </div>
  );
}

const fmtElapsed = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${m}:${sec}` : `${m}:${sec}`;
};

export function RoomScreen({
  me,
  room,
  localStream,
  streams,
  participants,
  meta,
  usersMap,
  sharing,
  onLeave,
  onToggleMic,
  onToggleCam,
  onSwitchCam,
  onShare,
  onState,
  onMuteAll,
  onLock,
  onEndAll,
  users = [],
}) {
  const { t } = useT();
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [copied, setCopied] = useState(false);
  const [panel, setPanel] = useState(''); // '' | people | chat
  const [more, setMore] = useState(false);
  const [spot, setSpot] = useState(null);
  const [fit, setFit] = useState(false);
  const [invite, setInvite] = useState(false);
  const [sentTo, setSentTo] = useState({});
  const rootRef = useRef(null);
  const ar = useAudioAndRec(rootRef, () => [localStream, ...Object.values(streams)]);
  const [now, setNow] = useState(Date.now());
  const [start] = useState(Date.now());
  const isVideo = room.type === 'video';
  const remoteIds = Object.keys(streams);
  const stateOf = (uid) => participants.find((p) => p.uid === uid) || {};
  const nameOf = (uid) =>
    (usersMap[uid] && usersMap[uid].name) || stateOf(uid).name || '…';
  const total = remoteIds.length + 1;
  const hostId = (meta && (meta.createdBy || meta.startedBy)) || '';
  const isHost = hostId === me.uid;
  const myHand = !!stateOf(me.uid).hand;
  const link = room.code ? `${WEB_URL}/?meet=${room.code}` : '';

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const copyLink = () => {
    try {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      /* ignore */
    }
  };
  const inviteUser = async (u) => {
    setSentTo((m) => ({ ...m, [u.uid]: 'sending' }));
    try {
      await sendDirectText(me, u.uid, `${room.title}\n${t('meetingId')}: ${room.code || ''}\n${link}`);
      setSentTo((m) => ({ ...m, [u.uid]: 'sent' }));
    } catch (e) {
      setSentTo((m) => ({ ...m, [u.uid]: '' }));
    }
  };
  const shareLink = () => {
    if (navigator.share) navigator.share({ title: room.title, url: link }).catch(() => {});
    else copyLink();
  };

  return (
    <div className={`overlay room ${fit ? 'fit' : ''}`} ref={rootRef}>
      <div className="room-top">
        <div className="grow">
          <div className="name ellipsis" style={{ color: '#fff' }}>{room.title}</div>
          <div className="small">
            {fmtElapsed(now - start)} · {t('inCall', { n: Math.max(participants.length, total) })}
          </div>
        </div>
        {ar.rec && <span className="rec-badge">● REC</span>}
        {room.code && (
          <button className="pill" onClick={shareLink}>
            {copied ? t('copied') : room.code}
          </button>
        )}
      </div>

      <div className="room-main">
        <div className={`grid g${Math.min(total, 6)} ${spot ? 'has-spot' : ''}`}>
          <Tile
            uid={me.uid}
            name={me.name}
            photo={me.photo}
            stream={localStream}
            local
            camOff={camOff}
            state={stateOf(me.uid)}
            now={now}
            spot={spot === me.uid}
            onClick={() => setSpot(spot === me.uid ? null : me.uid)}
          />
          {remoteIds.map((uid) => (
            <Tile
              key={uid}
              uid={uid}
              name={nameOf(uid)}
              photo={usersMap[uid] && usersMap[uid].photo}
              stream={streams[uid]}
              state={stateOf(uid)}
              now={now}
              spot={spot === uid}
              onClick={() => setSpot(spot === uid ? null : uid)}
            />
          ))}
        </div>

        {panel === 'people' && (
          <div className="room-panel">
            <div className="rp-head">
              <b className="grow">{t('participants')} ({participants.length})</b>
              <button className="icon-btn light" onClick={() => setPanel('')}>
                <Icon n="close" size={18} />
              </button>
            </div>
            <div className="rp-body">
              {participants.map((p) => (
                <div key={p.uid} className="rp-person">
                  <Avatar name={nameOf(p.uid)} photo={usersMap[p.uid] && usersMap[p.uid].photo} size={32} />
                  <span className="grow ellipsis">
                    {nameOf(p.uid)}
                    {p.uid === me.uid ? ` (${t('you')})` : ''}
                    {p.uid === hostId ? ` · ${t('host')}` : ''}
                  </span>
                  {p.hand && <span className="hand">✋</span>}
                  <Icon n={p.mic === false ? 'mute' : 'mic'} size={16} />
                  <Icon n="video" size={16} color={p.cam === false ? '#e57373' : undefined} />
                </div>
              ))}
              {isHost && (
                <button className="ghost rp-btn" onClick={onMuteAll}>
                  {t('muteAll')}
                </button>
              )}
              {room.code && (
                <button className="ghost rp-btn" onClick={copyLink}>
                  {copied ? t('copied') : t('copyLink')}
                </button>
              )}
            </div>
          </div>
        )}
        {panel === 'chat' && <RoomChat me={me} base={room.base} onClose={() => setPanel('')} />}
      </div>

      {invite && (
        <div className="modal-back" onClick={() => setInvite(false)}>
          <div className="modal light" onClick={(e) => e.stopPropagation()}>
            <h2>{t('invitePeople')}</h2>
            {!room.code && <div className="muted small">{t('inviteGroupNote')}</div>}
            <div className="pick-list" style={{ color: '#111b21' }}>
              {users.map((u) => (
                <div key={u.uid} className="pick-row">
                  <Avatar name={u.name} photo={u.photo} size={32} />
                  <span className="grow">{u.name}</span>
                  <button className="ghost" disabled={!room.code || !!sentTo[u.uid]} onClick={() => inviteUser(u)}>
                    {sentTo[u.uid] === 'sent' ? t('sent') : t('invite')}
                  </button>
                </div>
              ))}
            </div>
            <button className="ghost" onClick={() => setInvite(false)}>{t('close')}</button>
          </div>
        </div>
      )}

      {more && (
        <div className="room-more">
          <button onClick={() => { setMore(false); onState({ hand: !myHand }); }}>
            <span className="hand">✋</span> {myHand ? t('lowerHand') : t('raiseHand')}
          </button>
          {isVideo && (
            <button onClick={() => { setMore(false); onSwitchCam(); }}>
              <Icon n="swap" size={18} /> {t('switchCam')}
            </button>
          )}
          {room.code && (
            <button onClick={() => { setMore(false); copyLink(); }}>
              <Icon n="copy" size={18} /> {t('copyLink')}
            </button>
          )}
          <button onClick={() => { setMore(false); ar.toggleRec(); }}>
            <Icon n="rec" size={18} color={ar.rec ? '#ea4335' : undefined} /> {ar.rec ? t('stopRec') : t('record2')}
          </button>
          {hasAudioRoute && (
            <button onClick={() => { setMore(false); ar.toggleSpeaker(); }}>
              <Icon n="volume" size={18} /> {ar.speaker ? t('earpiece') : t('speaker')}
            </button>
          )}
          <button onClick={() => { setMore(false); setInvite(true); }}>
            <Icon n="people" size={18} /> {t('invitePeople')}
          </button>
          <button onClick={() => { setMore(false); setFit((v) => !v); }}>
            <Icon n="video" size={18} /> {fit ? t('fillScreen') : t('fitScreen')}
          </button>
          <div className="react-row">
            {['👍', '👏', '❤️', '😂', '😮', '🎉'].map((e) => (
              <button key={e} onClick={() => { setMore(false); onState({ react: { e, ms: Date.now() } }); }}>{e}</button>
            ))}
          </div>
          {isHost && (
            <>
              <button onClick={() => { setMore(false); onLock(!(meta && meta.locked)); }}>
                <Icon n="lock" size={18} /> {meta && meta.locked ? t('unlockMeeting') : t('lockMeeting')}
              </button>
              <button onClick={() => { setMore(false); onMuteAll(); }}>
                <Icon n="mute" size={18} /> {t('muteAll')}
              </button>
              <button className="danger" onClick={() => { setMore(false); onEndAll(); }}>
                <Icon n="close" size={18} /> {t('endForAll')}
              </button>
            </>
          )}
        </div>
      )}

      <div className="call-actions bottom wrap">
        <button
          className={`round sm ${muted ? 'active' : ''}`}
          onClick={() => setMuted(onToggleMic())}
          title={t('mute')}
        >
          <Icon n={muted ? 'mute' : 'mic'} size={20} />
        </button>
        {isVideo && (
          <button
            className={`round sm ${camOff ? 'active' : ''}`}
            onClick={() => setCamOff(onToggleCam())}
            title={t('camera')}
          >
            <Icon n="video" size={20} />
          </button>
        )}
        {screenShareSupported() && (
          <button
            className={`round sm ${sharing ? 'active' : ''}`}
            onClick={onShare}
            title={sharing ? t('stopShare') : t('shareScreen')}
          >
            <Icon n="swap" size={20} />
          </button>
        )}
        <button className={`round sm ${panel === 'people' ? 'active' : ''}`} onClick={() => setPanel(panel === 'people' ? '' : 'people')} title={t('participants')}>
          <Icon n="people" size={20} />
        </button>
        <button className={`round sm ${panel === 'chat' ? 'active' : ''}`} onClick={() => setPanel(panel === 'chat' ? '' : 'chat')} title={t('meetChat')}>
          <Icon n="chat" size={20} />
        </button>
        <button className={`round sm ${myHand ? 'active' : ''}`} onClick={() => setMore((v) => !v)} title="More">
          <Icon n="more" size={20} />
        </button>
        <button className="round sm red" onClick={onLeave} title={t('endCall')}>
          <Icon n="phone" size={20} />
        </button>
      </div>
    </div>
  );
}
