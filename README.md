# ChatCall: message + voice/video call app

React + Vite + Firebase diye banano. WhatsApp-er moto: account, user list, realtime chat, voice call, video call.
Pore ei web app-ta Capacitor diye Android APK kora jay.

---

## PART 1: Web app chalano (computer-e)

### Step 1: Firebase project toiri
1. https://console.firebase.google.com e jao, tomar project khulo (ba notun project banao).
2. **Build > Authentication > Get started > Sign-in method > Email/Password** enable koro.
3. **Build > Firestore Database > Create database** (production mode choose koro).
4. **Project settings (gear icon) > Your apps > Web (`</>`)** e click kore app register koro.
   Ekta `firebaseConfig` dekhabe. Oi value-gulo lagbe.

### Step 2: Firestore rules boshano
1. Firestore Database > **Rules** tab.
2. Ei project-er `firestore.rules` file-er pura content copy kore boshao > **Publish**.

### Step 3: .env file banano
1. `.env.example` file-ta copy kore nam daw `.env`.
2. Firebase-er value-gulo boshao (`VITE_FIREBASE_API_KEY=...` ei vabe).

### Step 4: Chalao
```bash
npm install
npm run dev
```
Browser-e `http://localhost:5173` khulo. Duita alada browser/device theke duita account khule test koro.

> Call test: camera/mic shudhu `localhost` ba `https` e kaj kore. Tai phone theke test korte hole app deploy koro (Firebase Hosting) ba APK banao.

### Step 5: Online deploy (optional, Firebase Hosting)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting     # public folder: dist, single-page app: Yes
npm run build
firebase deploy
```

---

## PART 2: Android APK banano

Lagbe: **Android Studio** (https://developer.android.com/studio) install kora thakte hobe.

### Step 1: Android project toiri (shudhu ekbar)
```bash
npm run build
npx cap add android
```

### Step 2: Camera/mic permission
`android/app/src/main/AndroidManifest.xml` file-e `<application>` tag-er **age** ei line-gulo boshao:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### Step 3: Code Android-e pathano
Jokhon-i code change korbe:
```bash
npm run android:sync
```

### Step 4: APK build
```bash
npm run android:open
```
Android Studio khulbe. Tarpor: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
Build shesh hole "locate" link-e APK file pabe. Oita phone-e pathiye install koro.

---

## Ki ki ache
- Email/password diye sign up ar login
- Sob user-er list, search, last message
- Realtime text message
- Voice call ar video call (WebRTC), incoming call screen, mute, camera off, call timer
- Phone-e ekta screen kore dekhay (WhatsApp-er moto)

## Ki ki NEI (pore korte hobe)
1. **App bondho thakle incoming call asbe na.** Er jonno push notification (Firebase Cloud Messaging) lagbe. App khola thakle call thik kaj kore.
2. **TURN server nai.** Ekhon shudhu STUN ache. Beshirbhag network-e kaj kore, kintu kichu mobile data/strict wifi-te call connect nao hote pare. Production-e TURN server lagbe.
3. Chobi/file/voice message pathano
4. Message read tick (✓✓), online/typing status
5. Group chat
6. Notification sound/ringtone
7. App icon (Android-er jonno PNG icon) ar play store setup

Ei jinis-gulo bolle ekta ekta kore add kore debo.
