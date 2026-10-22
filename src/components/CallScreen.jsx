import { useEffect, useRef, useState } from 'react';

function StreamVideo({ stream, muted, className }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null;
  }, [stream]);
  return <video ref={ref} className={className} autoPlay playsInline muted={muted} />;
}

export function IncomingCall({ call, onAccept, onReject }) {
  return (
    <div className="overlay incoming">
      <div className="call-card">
        <div className="avatar big">{call.callerName?.slice(0, 1).toUpperCase()}</div>
        <h2>{call.callerName}</h2>
        <p className="muted">
          {call.type === 'video' ? 'Video call' : 'Voice call'} asche...
        </p>
        <div className="call-actions">
          <button className="round red" onClick={onReject} title="Kete daw">
            ✖
          </button>
          <button className="round green" onClick={onAccept} title="Dhoro">
            📞
          </button>
        </div>
      </div>
    </div>
  );
}

export function CallScreen({ active, localStream, remoteStream, onEnd, onToggleMic, onToggleCam }) {
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [secs, setSecs] = useState(0);
  const isVideo = active.type === 'video';

  useEffect(() => {
    if (active.status !== 'connected') {
      setSecs(0);
      return undefined;
    }
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [active.status]);

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  return (
    <div className="overlay in-call">
      {/* Remote stream audio-o ekhane baje; audio call-e video-ta lukano thake */}
      <StreamVideo
        stream={remoteStream}
        className={isVideo ? 'remote-video' : 'hidden-media'}
      />

      {!isVideo && (
        <div className="audio-center">
          <div className="avatar big">{active.peerName?.slice(0, 1).toUpperCase()}</div>
        </div>
      )}

      <div className="call-top">
        <h2>{active.peerName}</h2>
        <p>{active.status === 'calling' ? 'Ring hocche...' : `${mm}:${ss}`}</p>
      </div>

      {isVideo && <StreamVideo stream={localStream} muted className="local-video" />}

      <div className="call-actions bottom">
        <button
          className={`round ${muted ? 'active' : ''}`}
          onClick={() => setMuted(onToggleMic())}
          title="Mic"
        >
          {muted ? '🔇' : '🎤'}
        </button>
        {isVideo && (
          <button
            className={`round ${camOff ? 'active' : ''}`}
            onClick={() => setCamOff(onToggleCam())}
            title="Camera"
          >
            {camOff ? '🚫' : '📷'}
          </button>
        )}
        <button className="round red" onClick={onEnd} title="Call shesh">
          ✖
        </button>
      </div>
    </div>
  );
}
