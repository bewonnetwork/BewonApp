// WebRTC server list. Nijer TURN thakle .env / GitHub workflow-e VITE_TURN_URL, VITE_TURN_USER, VITE_TURN_PASS dile oita-i age use hobe.
const own = import.meta.env.VITE_TURN_URL
  ? [
      {
        urls: import.meta.env.VITE_TURN_URL.split(','),
        username: import.meta.env.VITE_TURN_USER || '',
        credential: import.meta.env.VITE_TURN_PASS || '',
      },
    ]
  : [];

export const ICE_CONFIG = {
  iceServers: [
    ...own,
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
    {
      urls: [
        'turn:global.relay.metered.ca:80',
        'turn:global.relay.metered.ca:80?transport=tcp',
        'turn:global.relay.metered.ca:443',
        'turns:global.relay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};
