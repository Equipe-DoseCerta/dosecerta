// src/services/firebase.ts
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import messaging from '@react-native-firebase/messaging';
import { getCrashlytics, setCrashlyticsCollectionEnabled, sendUnsentReports } from '@react-native-firebase/crashlytics';


console.log('🔥 [firebase.ts] Iniciando Firebase Nativo...');


const crashlyticsInstance = getCrashlytics();

setCrashlyticsCollectionEnabled(crashlyticsInstance, true);
sendUnsentReports(crashlyticsInstance);

export const db = firestore();
export const storageRef = storage();
export const messagingRef = messaging();
export const crashlyticsRef = crashlyticsInstance;

console.log('✅ Firebase Nativo inicializado com sucesso!');
export default { db, storageRef, messagingRef, crashlyticsRef };