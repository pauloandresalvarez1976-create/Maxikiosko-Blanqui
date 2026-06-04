const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const { getFirestore } = require("firebase-admin/firestore");
const corsLib = require("cors")({ origin: true });

initializeApp();

exports.sendPushNotification = onRequest(async (req, res) => {
  corsLib(req, res, async () => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const { title, body, secret } = req.body;

    if (secret !== "blanqui2025") return res.status(403).send("Forbidden");
    if (!title || !body) return res.status(400).send("Faltan title o body");

    try {
      const db = getFirestore();
      const snap = await db.doc("store/maxikioskoblanqui").get();
      const data = snap.data() || {};

      const tokens = new Set();

      const fcmTokens = data.fcmTokens || {};
      Object.values(fcmTokens).forEach(t => { if (t) tokens.add(t); });

      const customers = data.customers || {};
      Object.values(customers).forEach(c => { if (c?.fcmToken) tokens.add(c.fcmToken); });

      const tokenList = [...tokens];
      if (tokenList.length === 0) return res.status(200).json({ ok: true, enviados: 0, total: 0 });

      let enviados = 0;
      for (let i = 0; i < tokenList.length; i += 500) {
        const chunk = tokenList.slice(i, i + 500);
        const result = await getMessaging().sendEachForMulticast({
          tokens: chunk,
          notification: { title, body },
          webpush: {
            notification: { icon: "/logo192.png", badge: "/logo192.png" },
            fcmOptions: { link: "/" }
          }
        });
        enviados += result.successCount;
      }

      res.status(200).json({ ok: true, enviados, total: tokenList.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });
});
