# ChatCall: WhatsApp-er moto message + call app

React + Vite + Firebase. Capacitor diye Android APK, GitHub Actions diye APK build hoy.

## Ki ki ache
- Account kholar shomoy **language choose** (English, Bangla, Hindi, Urdu, Arabic, Spanish, French, German, Portuguese, Russian, Turkish, Indonesian, Malay, Chinese, Japanese, Korean). App-er menu English ba Bangla-te ashe, onno language choose korle menu English-e thake kintu **message translate** hoy.
- **Auto translate:** keu onno language-e message pathale tumi tomar language-e dekhbe. "Show original" chepe mul lekha dekha jay. Settings theke off kora jay.
- Text chat, **chobi**, **voice message**, emoji
- Read tick (✓ sent, ✓✓ blue = read), typing, online / last seen, unread count
- **Group chat** (new group button), message delete
- **Voice call** ar **video call** (1-to-1), call history, ringtone
- Notun message-er sound (app khola thakle)

## Ki ki NEI
1. App bondho thakle notification/call ashbe na (push notification: Firebase-er paid plan + server lagbe)
2. Group call
3. Video/PDF/file pathano (shudhu chobi ar voice)
4. Boro chobi: chobi chhoto kore (~1024px) rakha hoy
5. Free TURN server best-effort; kichu mobile network-e call connect nao hote pare
6. Translation free service diye hoy, tai kokhono limit/slow hote pare

## Firebase-e ja chalu thakte hobe
- Authentication > Email/Password enabled
- Firestore Database created
- Rules deploy: `npx firebase-tools deploy --only firestore:rules`
