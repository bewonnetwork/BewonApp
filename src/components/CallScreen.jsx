import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar.jsx';
import { useT } from '../i18n.js';
import { startRing, stopRing } from '../sound.js';
import { fmtDur } from '../utils.js';

function StreamVideo({ stream, muted, className }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null;
  }, [stream]);
  return <video ref={ref} className={className} autoPlay playsInline muted={muted} />;
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

export function CallScreen({ active, localStream, remoteStream, onEnd, onToggleMic, onToggleCam }) {
  const { t } = useT();
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [secs, setSecs] = useState(0);
  const isVideo = active.type === 'video';

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
      {/* Remote audio ekhane baje; audio call-e video lukano thake */}
      <StreamVideo stream={remoteStream} className={isVideo ? 'remote-video' : 'hidden-media'} />

      {!isVideo && (
        <div className="audio-center">
          <Avatar name={active.peerName} size={120} />
        </div>
      )}

      <div className="call-top">
        <h2>{active.peerName}</h2>
        <p>{active.status === 'calling' ? t('calling') : fmtDur(secs)}</p>
      </div>

      {isVideo && <StreamVideo stream={localStream} muted className="local-video" />}

      <div className="call-actions bottom">
        <button
          className={`round ${muted ? 'active' : ''}`}
          onClick={() => setMuted(onToggleMic())}
          title={t('mute')}
        >
          {muted ? '🔇' : '🎤'}
        </button>
        {isVideo && (
          <button
            className={`round ${camOff ? 'active' : ''}`}
            onClick={() => setCamOff(onToggleCam())}
            title={t('camera')}
          >
            {camOff ? '🚫' : '📷'}
          </button>
        )}
        <button className="round red" onClick={onEnd} title={t('endCall')}>
          ✖
        </button>
      </div>
    </div>
  );
}
