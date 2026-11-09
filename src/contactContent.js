// Valores estáticos de la sección Contacto en esta preview.
// Más adelante, el administrador podrá reemplazar este objeto mediante su fuente de datos.
export const DEFAULT_CONTACT_CONTENT = {
  name: "Maxikiosko Blanqui",
  direccion: "Joaquín V. González 341 (sur)",
  direccionExtra: "Barrio Tulum · Desamparados · San Juan",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Maxikiosko+Blanqui+Desamparados+San+Juan+Argentina",
  telefono: {
    display: "264 546173",
    dial: "264546173",
  },
  horarios: {
    kiosco: [
      { dias: "Lunes a viernes", periodos: ["09:00–15:00", "18:00–01:00"] },
      { dias: "Sábado", periodos: ["11:00–15:00", "18:00–01:00"] },
      { dias: "Domingo", periodos: ["12:00–15:00", "18:00–01:00"] },
    ],
    paqueteria: [
      { dias: "Lunes a viernes", periodos: ["09:00–13:00", "18:00–23:30"] },
      { dias: "Sábados y domingos", periodos: ["18:00–20:00"] },
    ],
    feriados: "Atención normal según el día que corresponda.",
  },
};
