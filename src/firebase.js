import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBuskgBAZpl_B1MpmuTysth2ItuIN7d4yw",
  authDomain: "maxikioskoblanqui-2395d.firebaseapp.com",
  projectId: "maxikioskoblanqui-2395d",
  storageBucket: "maxikioskoblanqui-2395d.firebasestorage.app",
  messagingSenderId: "74437157596",
  appId: "1:74437157596:web:06ad3c16da2350e5ccca19",
};

export const publicFirebaseConfig = Object.freeze({
  apiKey: firebaseConfig.apiKey,
  projectId: firebaseConfig.projectId,
});

const app = initializeApp(firebaseConfig);
const appCheckSiteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;

if (appCheckSiteKey && typeof window !== "undefined") {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const functions = getFunctions(app, "southamerica-east1");
