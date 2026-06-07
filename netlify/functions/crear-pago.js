exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { items, orderId, clientName, mpAccessToken } = JSON.parse(event.body);
    const token = mpAccessToken || process.env.MP_ACCESS_TOKEN;

    // Validar token
    if (!token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Token de MercadoPago no configurado" }),
      };
    }

    // Calcular total asegurando que precio y cantidad sean números válidos
    const total = items.reduce((s, i) => {
      const price = Number(i.price) || 0;
      const qty = Number(i.qty) || 1;
      return s + price * qty;
    }, 0);

    // Validar total
    if (!total || total <= 0) {
      console.error("Total inválido:", total, "items:", JSON.stringify(items));
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "El total del pedido no es válido" }),
      };
    }

    // Obtener URL base del sitio
    const siteUrl =
      process.env.URL ||
      process.env.DEPLOY_PRIME_URL ||
      `https://${event.headers.host}`;

    const body = {
      items: [{
        id: "pedido",
        title: "Maxikiosko Blanqui",
        quantity: 1,
        unit_price: Math.round(total), // MP requiere entero en ARS
        currency_id: "ARS",
      }],
      payer: { name: clientName || "Cliente" },
      external_reference: String(orderId),
      back_urls: {
        success: `${siteUrl}/pago-exitoso`,
        failure: `${siteUrl}/pago-fallido`,
        pending: `${siteUrl}/pago-pendiente`,
      },
      auto_return: "approved",
      statement_descriptor: "Maxikiosko Blanqui",
    };

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.init_point) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ init_point: data.init_point }),
      };
    } else {
      console.error("MP response error:", JSON.stringify(data));
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Error al crear preferencia en MercadoPago",
          detail: data.message || data.error || JSON.stringify(data),
        }),
      };
    }
  } catch (err) {
    console.error("Error en crear-pago:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
