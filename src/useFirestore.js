import { db } from "./firebase";
import {
  doc,
  setDoc,
  updateDoc,
  deleteField,
  onSnapshot,
  getDoc,
} from "firebase/firestore";

// Claves que se sincronizan con Firebase (las más importantes)
const FIREBASE_KEYS = [
  "orders",
  "products",
  "customers",
  "chats",
  "horarios",
  "banners",
  "contactBanner",
  "contactInfo",
  "whatsappConfig",
  "adBanner",
  "loyaltyEnabled",
  "loyaltyMode",
  "cashbackConfig",
  "freeShippingEnabled",
  "freeShippingThreshold",
  "deliveryETA",
  "efectivoEnabled",
  "mensajeDelDia",
  "lowStockThreshold",
  "vacaciones",
  "mantenimiento",
  "ordersResetAt",
  "adminEmail",
  "transferenciaConfig",
  "fcmTokens",
  "mpAccessToken",
];

// ID fijo del documento de la tienda en Firestore
const STORE_ID = "maxikioskoblanqui";

// Guardar un dato en Firestore
export async function saveToFirestore(key, value) {
  if (!FIREBASE_KEYS.includes(key)) return;
  try {
    await setDoc(
      doc(db, "store", STORE_ID),
      { [key]: value },
      { merge: true }
    );
  } catch (e) {
    console.warn("Firebase write error:", e);
  }
}

// Leer todos los datos de Firestore una vez
export async function loadFromFirestore() {
  try {
    const snap = await getDoc(doc(db, "store", STORE_ID));
    if (snap.exists()) return snap.data();
    return null;
  } catch (e) {
    console.warn("Firebase read error:", e);
    return null;
  }
}

// Suscribirse a cambios en tiempo real
export function subscribeToFirestore(callback) {
  return onSnapshot(
    doc(db, "store", STORE_ID),
    (snap) => {
      if (snap.exists()) callback(snap.data());
    },
    (error) => console.warn("Firebase snapshot error:", error)
  );
}

// Eliminar un cliente específico de Firestore usando dot notation
export async function deleteCustomerFromFirestore(customerKey) {
  try {
    await updateDoc(
      doc(db, "store", STORE_ID),
      { [`customers.${customerKey}`]: deleteField() }
    );
  } catch (e) {
    console.warn("Firebase delete customer error:", e);
  }
}

export { FIREBASE_KEYS };
