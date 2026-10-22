# BewonChat

WhatsApp-er moto chat + call + meeting app. React + Vite + Firebase. Android APK banay Capacitor + GitHub Actions.

## APK download (permanent link)
https://github.com/bewonnetwork/BewonApp/releases/download/latest/BewonChat.apk
(GitHub-e code push korle Actions auto notun APK banay ar ei link update hoy.)

## Live web app
https://bewonapp-bf500.web.app

## Features
- Chat: text, chobi, voice message, emoji, reply, star, copy, delete, ✓✓ read tick, typing, online/last seen, unread count, profile photo
- 50 language. Account kholar shomoy language choose, Settings theke bodlano jay
- Auto translate: message, chat list preview, call caption, shob nijer bhasha-y
- Voice/video call (1-to-1), call history, ringtone
- Live translate in call: kotha bolle onno pash-e translate hoye caption (ar chaile awaj) ashe
- Group chat ar Group call (voice/video)
- Meeting (Meet/Zoom-er moto): code/link diye join, screen share, front/back camera switch
- News tab: global news portal link (+ nijer bhasha-y pora)
- Message kokhono auto-delete hoy na. Offline cache-o ache
- Chat list filter (All / Unread / Groups), Menu (New group, Starred, Mark all read, Settings)

## File guide (ki file ki kaj kore)
| File / folder | Kaj |
|---|---|
| `package.json`, `vite.config.js`, `index.html` | Project setup, build tool, main page |
| `.env` | Firebase config (secret na, kintu repo-te push hoy na) |
| `firebase.json`, `.firebaserc`, `firestore.rules` | Firebase deploy ar database-er nirapotta rules |
| `capacitor.config.json`, `android/` | Android app project (APK er jonno) |
| `android/app/bewon.keystore` | APK signing key (shob build-e ekoi, tai notun APK ager-tar upor install hoy) |
| `.github/workflows/apk.yml` | GitHub-e APK build + download link toiri |
| `public/logo.png`, `icon-*.png`, `manifest.json` | Tomar BEWON logo, app icon |
| `src/main.jsx`, `src/App.jsx` | App-er shuru, login/profile/chat list/call jora lagano |
| `src/firebase.js`, `src/config.js` | Firebase connection, website ar APK link |
| `src/i18n.js` | 50 language list + English/Bangla menu-er lekha |
| `src/translate.js` | Auto translate (Google free, na hole MyMemory), cache shoho |
| `src/useCall.js` | 1-to-1 voice/video call (WebRTC) |
| `src/useRoom.js` | Group call ar Meeting (mesh WebRTC) |
| `src/useLiveTranslate.js` | Call-e live speech to text + translate |
| `src/media.js` | Camera switch, screen share |
| `src/sound.js` | Message sound, ringtone |
| `src/utils.js` | Chobi chhoto kora, time format, chhoto helper |
| `src/components/Login.jsx` | Login / account khola (language choose) |
| `src/components/Sidebar.jsx` | Chat list, tab (Chats/Calls/Meet/News), menu |
| `src/components/ChatWindow.jsx`, `Message.jsx` | Chat screen, message bubble, voice/chobi pathano |
| `src/components/CallScreen.jsx` | Call screen, group call/meeting screen |
| `src/components/Meet.jsx`, `News.jsx`, `CallLog.jsx` | Meeting tab, News tab, Call history |
| `src/components/Settings.jsx`, `NewGroup.jsx`, `Starred.jsx`, `Avatar.jsx` | Settings, notun group, starred, profile chobi |
| `src/styles.css` | Shob design |

## Ki ki NEI
1. App bondho thakle notification/call ashbe na (Firebase paid plan + server lagbe)
2. Meeting/Group call mesh, tai ~6 jon porjonto. Boro meeting-er jonno alada media server lagbe
3. Screen share shudhu PC browser-e. Android APK-te Android-er restriction-e kaj kore na
4. Live translate-e nijer kotha capture shudhu Chrome/Edge (PC) e. APK-te onno pash-er caption dekha jay
5. Status/Updates, Communities, Broadcast, Linked devices, Locked chat, Parental controls
6. Blockchain/DeFi, MongoDB: ekhono nai
7. Video/PDF/file pathano nai (shudhu chobi ar voice)

## Firebase-e ja chalu thakte hobe
- Authentication > Email/Password enabled
- Firestore Database created
- Rules deploy: `npx firebase-tools deploy --only firestore:rules`
