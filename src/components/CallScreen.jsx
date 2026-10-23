import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar.jsx';
import { useT } from '../i18n.js';
import { startRing, stopRing } from '../sound.js';
import { fmtDur } from '../utils.js';
import { screenShareSupported } from '../media.js';
import { WEB_URL } from '../config.js';

function StreamVideo({ stream, muted, className }) {
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
  return <video ref={ref} className={className} autoPlay playsInline muted={muted} />;
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
          {call.type === 'video' ? '🎥 ' + t('incomingVideo') : '📞 ' + t('incomingVoice')} ·{' '}
          {t('incomingSub')}
        </p>
        <div className="call-actions">
          <button className="round red" onClick={onReject} title={t('reject')}>
            ✖
          </button>
          <button className="round green" onClick={onAccept} title={t('accept')}>
            📞
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
          {chat.activeCall.type === 'video' ? '🎥 ' : '📞 '}
          {t('groupCallSub', { name: chat.activeCall.startedByName || '' })}
        </p>
        <div className="call-actions">
          <button className="round red" onClick={onDismiss} title={t('reject')}>
            ✖
          </button>
          <button className="round green" onClick={onJoin} title={t('joinCall')}>
            📞
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
    <div className="overlay in-call">
      {/* Remote audio ekhane baje; chobi na thakle video lukano thake */}
      <StreamVideo
        stream={remoteStream}
        className={isVideo && remoteVideo ? 'remote-video' : 'hidden-media'}
      />

      {!(isVideo && remoteVideo) && (
        <div className="audio-center">
          <Avatar name={active.peerName} size={120} />
        </div>
      )}

      <div className="call-top">
        <h2>{active.peerName}</h2>
        <p>{active.status === 'calling' ? t('calling') : fmtDur(secs)}</p>
      </div>

      {isVideo && <StreamVideo stream={localStream} muted className="local-video" />}

      {live && live.on && <Captions live={live} />}

      <div className="call-actions bottom wrap">
        <button
          className={`round sm ${muted ? 'active' : ''}`}
          onClick={() => setMuted(onToggleMic())}
          title={t('mute')}
        >
          {muted ? '🔇' : '🎤'}
        </button>
        {isVideo && (
          <>
            <button
              className={`round sm ${camOff ? 'active' : ''}`}
              onClick={() => setCamOff(onToggleCam())}
              title={t('camera')}
            >
              {camOff ? '🚫' : '📷'}
            </button>
            <button className="round sm" onClick={onSwitchCam} title={t('switchCam')}>
              🔄
            </button>
            {screenShareSupported() && (
              <button
                className={`round sm ${sharing ? 'active' : ''}`}
                onClick={onShare}
                title={sharing ? t('stopShare') : t('shareScreen')}
              >
                🖥
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
              🌐
            </button>
            {live.on && (
              <button
                className={`round sm ${live.speak ? 'active' : ''}`}
                onClick={live.toggleSpeak}
                title={t('speakTr')}
              >
                🔊
              </button>
            )}
          </>
        )}
        <button className="round sm red" onClick={onEnd} title={t('endCall')}>
          ✖
        </button>
      </div>
    </div>
  );
}

function Tile({ uid, name, photo, stream, local, camOff }) {
  const active = useVideoActive(stream, local, camOff);
  return (
    <div className="tile">
      <StreamVideo stream={stream} muted={!!local} className={active ? 'tile-video' : 'hidden-media'} />
      {!active && (
        <div className="tile-avatar">
          <Avatar name={name} photo={photo} size={72} />
        </div>
      )}
      <div className="tile-name">{local ? `${name} (You)` : name}</div>
    </div>
  );
}

export function RoomScreen({
  me,
  room,
  localStream,
  streams,
  participants,
  usersMap,
  sharing,
  onLeave,
  onToggleMic,
  onToggleCam,
  onSwitchCam,
  onShare,
}) {
  const { t } = useT();
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [copied, setCopied] = useState(false);
  const isVideo = room.type === 'video';
  const remoteIds = Object.keys(streams);
  const nameOf = (uid) =>
    (usersMap[uid] && usersMap[uid].name) || (participants.find((p) => p.uid === uid) || {}).name || '…';
  const total = remoteIds.length + 1;

  const copyLink = () => {
    const link = `${WEB_URL}/?meet=${room.code}`;
    try {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      /* ignore */
    }
  };

  return (
    <div className="overlay room">
      <div className="room-top">
        <div className="grow">
          <div className="name ellipsis">{room.title}</div>
          <div className="small">{t('inCall', { n: Math.max(participants.length, total) })}</div>
        </div>
        {room.code && (
          <button className="pill" onClick={copyLink}>
            {copied ? t('copied') : `🔗 ${room.code}`}
          </button>
        )}
      </div>

      <div className={`grid g${Math.min(total, 6)}`}>
        <Tile
          uid={me.uid}
          name={me.name}
          photo={me.photo}
          stream={localStream}
          local
          camOff={camOff}
        />
        {remoteIds.map((uid) => (
          <Tile
            key={uid}
            uid={uid}
            name={nameOf(uid)}
            photo={usersMap[uid] && usersMap[uid].photo}
            stream={streams[uid]}
          />
        ))}
      </div>

      <div className="call-actions bottom wrap">
        <button
          className={`round sm ${muted ? 'active' : ''}`}
          onClick={() => setMuted(onToggleMic())}
          title={t('mute')}
        >
          {muted ? '🔇' : '🎤'}
        </button>
        {isVideo && (
          <>
            <button
              className={`round sm ${camOff ? 'active' : ''}`}
              onClick={() => setCamOff(onToggleCam())}
              title={t('camera')}
            >
              {camOff ? '🚫' : '📷'}
            </button>
            <button className="round sm" onClick={onSwitchCam} title={t('switchCam')}>
              🔄
            </button>
          </>
        )}
        {screenShareSupported() && (
          <button
            className={`round sm ${sharing ? 'active' : ''}`}
            onClick={onShare}
            title={sharing ? t('stopShare') : t('shareScreen')}
          >
            🖥
          </button>
        )}
        <button className="round sm red" onClick={onLeave} title={t('endCall')}>
          ✖
        </button>
      </div>
    </div>
  );
}
