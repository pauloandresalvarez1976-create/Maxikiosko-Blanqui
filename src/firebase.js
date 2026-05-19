import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getStorage, ref, uploadString, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBuskgBAZpl_B1MpmuTysth2ItuIN7d4yw",
  authDomain: "maxikioskoblanqui-2395d.firebaseapp.com",
  projectId: "maxikioskoblanqui-2395d",
  storageBucket: "maxikioskoblanqui-2395d.firebasestorage.app",
  messagingSenderId: "74437157596",
  appId: "1:74437157596:web:06ad3c16da2350e5ccca19"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const messaging = getMessaging(app);
export const storage = getStorage(app);

// Subir foto de producto a Firebase Storage y devolver la URL
export async function uploadProductPhoto(productId, base64Data) {
  try {
    const storageRef = ref(storage, `products/${productId}.jpg`);
    await uploadString(storageRef, base64Data, "data_url");
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (e) {
    console.warn("Storage upload error:", e);
    return null;
  }
}

// Eliminar foto de producto de Firebase Storage
export async function deleteProductPhoto(productId) {
  try {
    const storageRef = ref(storage, `products/${productId}.jpg`);
    await deleteObject(storageRef);
  } catch (e) {
    // No pasa nada si no existe
  }
}

// Subir imagen/GIF del banner publicitario a Firebase Storage y devolver la URL
export async function uploadBannerImage(file) {
  try {
    const ext = file.name.split(".").pop() || "jpg";
    const storageRef = ref(storage, `banners/adBanner_${Date.now()}.${ext}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (e) {
    console.warn("Banner upload error:", e);
    return null;
  }
}

// Eliminar imagen del banner de Firebase Storage por URL
export async function deleteBannerImage(url) {
  try {
    if (!url || !url.startsWith("https://firebasestorage")) return;
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (e) {
    // No pasa nada si no existe
  }
}

// VAPID key para Web Push
const VAPID_KEY = "BOD1TqcTIDKd7qGXRwwucDxSqJJ2r0LUvW0vRDInL4gYe5qXknmj_dCY_3uYZkygzVyg_x2bBavLm2fBsvQ2svY";

// Solicitar permiso y obtener el token FCM del dispositivo
export async function requestFCMToken() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    return token;
  } catch (e) {
    console.warn("FCM token error:", e);
    return null;
  }
}

// Escuchar mensajes cuando la app está en primer plano
export function onForegroundMessage(callback) {
  return onMessage(messaging, callback);
}
