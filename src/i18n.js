import { createContext, useContext } from 'react';

export const LANGS = [
  { code: 'en', name: 'English' },
  { code: 'bn', name: 'বাংলা (Bangla)' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
  { code: 'ur', name: 'اردو (Urdu)' },
  { code: 'ar', name: 'العربية (Arabic)' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Bahasa Melayu' },
  { code: 'zh-CN', name: '中文 (Chinese)' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'ko', name: '한국어 (Korean)' },
];

export const langName = (code = '') => {
  const found = LANGS.find((l) => l.code === code || l.code.split('-')[0] === code.split('-')[0]);
  return (found ? found.name : code).split(' (')[0];
};

export const detectLang = () => {
  const n = (typeof navigator !== 'undefined' && navigator.language) || 'en';
  const base = n.split('-')[0];
  if (base === 'zh') return 'zh-CN';
  return LANGS.some((l) => l.code === base) ? base : 'en';
};

const en = {
  tagline: 'Messages and calls, all in one place',
  yourName: 'Your name',
  email: 'Email',
  password: 'Password (min 6 characters)',
  language: 'Language',
  login: 'Log in',
  signup: 'Create account',
  wait: 'Please wait…',
  haveAcc: 'Already have an account? Log in',
  newHere: 'New here? Create an account',
  errEmail: 'That email address is not valid.',
  errPass: 'Password must be at least 6 characters.',
  errExists: 'An account with this email already exists. Log in instead.',
  errCred: 'Wrong email or password.',
  errDisabled: 'Email/Password sign-in is not enabled in Firebase.',
  errGeneric: 'Something went wrong. Please try again.',
  errName: 'Please enter your name.',

  chats: 'Chats',
  calls: 'Calls',
  search: 'Search or start a new chat',
  noUsers:
    'No one else has joined yet. Create another account on a different device or browser and it will show up here.',
  noResults: 'No one found.',
  sayHi: 'Say hi 👋',
  photo: '📷 Photo',
  voiceMsg: '🎤 Voice message',
  deleted: 'This message was deleted',
  newGroup: 'New group',
  settings: 'Settings',
  logout: 'Log out',
  online: 'online',
  lastSeen: 'last seen {time}',
  typing: 'typing…',
  typingName: '{name} is typing…',
  you: 'You',
  group: 'Group',
  members: '{n} members',
  loadFail: 'Could not load the user list ({code}). Make sure the Firestore rules are deployed.',

  typeMsg: 'Type a message',
  noMsgs: 'No messages yet. Say hello 👋',
  voiceCall: 'Voice call',
  videoCall: 'Video call',
  delete: 'Delete',
  back: 'Back',
  send: 'Send',
  attach: 'Photo',
  emoji: 'Emoji',
  record: 'Voice message',
  recording: 'Recording…',
  cancel: 'Cancel',
  sendFail: 'Could not send. Check your connection.',
  translatedFrom: 'Translated from {lang}',
  showOriginal: 'Show original',
  showTranslation: 'Show translation',
  translate: 'Translate',
  translating: 'Translating…',
  translateFail: 'Could not translate',
  tooBig: 'That recording is too large.',
  micDenied: 'Could not use the microphone. Please allow permission.',
  imgFail: 'Could not load that image.',

  incomingVoice: 'Voice call',
  incomingVideo: 'Video call',
  incomingSub: 'is calling you…',
  calling: 'Calling…',
  declined: '{name} declined the call.',
  noAnswer: '{name} did not answer.',
  permErr: 'Microphone/camera permission was denied. Please allow it.',
  callFail: 'The call could not be started.',
  missed: 'Missed',
  outgoing: 'Outgoing',
  incomingLbl: 'Incoming',
  cancelledLbl: 'No answer',
  declinedLbl: 'Declined',
  noCalls: 'No calls yet.',
  mute: 'Mute',
  camera: 'Camera',
  endCall: 'End call',
  accept: 'Accept',
  reject: 'Decline',

  about: 'About',
  aboutPh: 'Hey there! I am using ChatCall',
  autoTr: 'Translate messages automatically',
  autoTrHint: 'Messages in other languages appear in your language.',
  save: 'Save',
  saved: 'Saved ✓',
  close: 'Close',
  yourProfile: 'Your profile',

  groupName: 'Group name',
  pickMembers: 'Choose members',
  create: 'Create group',
  groupNeed: 'Enter a name and choose at least one member.',
};

const bn = {
  tagline: 'মেসেজ আর কল, সব এক জায়গায়',
  yourName: 'আপনার নাম',
  email: 'ইমেইল',
  password: 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)',
  language: 'ভাষা',
  login: 'লগইন',
  signup: 'অ্যাকাউন্ট খুলুন',
  wait: 'অপেক্ষা করুন…',
  haveAcc: 'আগে থেকেই অ্যাকাউন্ট আছে? লগইন করুন',
  newHere: 'নতুন? অ্যাকাউন্ট খুলুন',
  errEmail: 'ইমেইলটি সঠিক নয়।',
  errPass: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।',
  errExists: 'এই ইমেইলে আগেই অ্যাকাউন্ট আছে। লগইন করুন।',
  errCred: 'ইমেইল বা পাসওয়ার্ড ভুল।',
  errDisabled: 'Firebase-এ Email/Password সাইন-ইন চালু করা নেই।',
  errGeneric: 'কিছু একটা ভুল হয়েছে, আবার চেষ্টা করুন।',
  errName: 'আপনার নাম লিখুন।',

  chats: 'চ্যাট',
  calls: 'কল',
  search: 'খুঁজুন বা নতুন চ্যাট শুরু করুন',
  noUsers:
    'আর কেউ এখনও যোগ দেয়নি। অন্য ডিভাইস বা ব্রাউজারে আরেকটি অ্যাকাউন্ট খুললে এখানে দেখা যাবে।',
  noResults: 'কাউকে পাওয়া যায়নি।',
  sayHi: 'হ্যালো বলুন 👋',
  photo: '📷 ছবি',
  voiceMsg: '🎤 ভয়েস মেসেজ',
  deleted: 'এই মেসেজটি মুছে ফেলা হয়েছে',
  newGroup: 'নতুন গ্রুপ',
  settings: 'সেটিংস',
  logout: 'লগআউট',
  online: 'অনলাইন',
  lastSeen: 'শেষ দেখা {time}',
  typing: 'লিখছে…',
  typingName: '{name} লিখছে…',
  you: 'আপনি',
  group: 'গ্রুপ',
  members: '{n} জন সদস্য',
  loadFail: 'ইউজার লিস্ট লোড হয়নি ({code})। Firestore rules deploy করা আছে কিনা দেখুন।',

  typeMsg: 'মেসেজ লিখুন',
  noMsgs: 'এখনও কোনো মেসেজ নেই। হ্যালো বলুন 👋',
  voiceCall: 'ভয়েস কল',
  videoCall: 'ভিডিও কল',
  delete: 'মুছুন',
  back: 'পিছনে',
  send: 'পাঠান',
  attach: 'ছবি',
  emoji: 'ইমোজি',
  record: 'ভয়েস মেসেজ',
  recording: 'রেকর্ড হচ্ছে…',
  cancel: 'বাতিল',
  sendFail: 'পাঠানো যায়নি। ইন্টারনেট চেক করুন।',
  translatedFrom: '{lang} থেকে অনুবাদ করা',
  showOriginal: 'মূল লেখা দেখুন',
  showTranslation: 'অনুবাদ দেখুন',
  translate: 'অনুবাদ করুন',
  translating: 'অনুবাদ হচ্ছে…',
  translateFail: 'অনুবাদ করা যায়নি',
  tooBig: 'রেকর্ডিংটি অনেক বড়।',
  micDenied: 'মাইক্রোফোন ব্যবহার করা যায়নি। অনুমতি দিন।',
  imgFail: 'ছবিটি লোড করা যায়নি।',

  incomingVoice: 'ভয়েস কল',
  incomingVideo: 'ভিডিও কল',
  incomingSub: 'আপনাকে কল করছে…',
  calling: 'কল হচ্ছে…',
  declined: '{name} কল কেটে দিয়েছে।',
  noAnswer: '{name} কল ধরেনি।',
  permErr: 'মাইক/ক্যামেরার অনুমতি দেওয়া হয়নি। অনুমতি দিন।',
  callFail: 'কল শুরু করা যায়নি।',
  missed: 'মিসড',
  outgoing: 'আউটগোয়িং',
  incomingLbl: 'ইনকামিং',
  cancelledLbl: 'ধরেনি',
  declinedLbl: 'কেটে দিয়েছে',
  noCalls: 'এখনও কোনো কল নেই।',
  mute: 'মিউট',
  camera: 'ক্যামেরা',
  endCall: 'কল শেষ',
  accept: 'ধরুন',
  reject: 'কাটুন',

  about: 'সম্পর্কে',
  aboutPh: 'আমি ChatCall ব্যবহার করছি',
  autoTr: 'স্বয়ংক্রিয়ভাবে মেসেজ অনুবাদ করুন',
  autoTrHint: 'অন্য ভাষার মেসেজ আপনার ভাষায় দেখানো হবে।',
  save: 'সেভ',
  saved: 'সেভ হয়েছে ✓',
  close: 'বন্ধ',
  yourProfile: 'আপনার প্রোফাইল',

  groupName: 'গ্রুপের নাম',
  pickMembers: 'সদস্য বাছুন',
  create: 'গ্রুপ খুলুন',
  groupNeed: 'নাম লিখুন এবং অন্তত একজন সদস্য বাছুন।',
};

const STR = { en, bn };

export const makeT = (lang) => {
  const dict = STR[lang] || STR.en;
  return (key, vars) => {
    let s = dict[key] ?? STR.en[key] ?? key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        s = s.split(`{${k}}`).join(vars[k]);
      });
    }
    return s;
  };
};

export const LangCtx = createContext({ lang: 'en', t: makeT('en') });
export const useT = () => useContext(LangCtx);
