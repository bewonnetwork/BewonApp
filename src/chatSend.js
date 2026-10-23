import { addDoc, collection, doc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { chatIdFor } from './utils.js';

// Direct chat-e ekta text message pathay (Broadcast-er jonno)
export async function sendDirectText(me, peerUid, body) {
  const chatRef = doc(db, 'chats', chatIdFor(me.uid, peerUid));
  await setDoc(chatRef, { members: [me.uid, peerUid], isGroup: false }, { merge: true });
  await addDoc(collection(chatRef, 'messages'), {
    from: me.uid,
    fromName: me.name,
    lang: me.lang,
    type: 'text',
    text: body,
    createdAt: serverTimestamp(),
  });
  await setDoc(
    chatRef,
    {
      lastMessage: body.slice(0, 120),
      lastType: 'text',
      lastLang: me.lang,
      lastFrom: me.uid,
      updatedAt: serverTimestamp(),
      unread: { [peerUid]: increment(1) },
      typing: { [me.uid]: 0 },
      lastRead: { [me.uid]: serverTimestamp() },
    },
    { merge: true }
  );
}
