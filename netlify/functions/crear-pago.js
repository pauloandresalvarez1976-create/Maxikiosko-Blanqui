exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { items, orderId, clientName, mpAccessToken } = JSON.parse(event.body);
    const token = mpAccessToken || process.env.MP_ACCESS_TOKEN;

    const total = items.reduce((s, i) => s + i.price * i.qty, 0);

    const body = {
      items: [{
        id: "pedido",
        title: "Maxikiosko Blanqui",
        quantity: 1,
        unit_price: total,
        currency_id: "ARS",
      }],
      payer: { name: clientName || "Cliente" },
      external_reference: String(orderId),
      back_urls: {
        success: `${process.env.URL}/pago-exitoso`,
        failure: `${process.env.URL}/pago-fallido`,
        pending: `${process.env.URL}/pago-pendiente`,
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
      console.error("MP response:", JSON.stringify(data));
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Error al crear preferencia" }),
      };
    }
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
