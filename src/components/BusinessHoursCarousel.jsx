import { useEffect, useMemo, useState } from "react";

const TIME_ZONE = "America/Argentina/Buenos_Aires";
const WEEKDAY_INDEX = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};
const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const CLOCK_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIME_ZONE,
  weekday: "long",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function weekdayIndex(label) {
  const normalized = normalize(label);
  if (normalized.includes("lunes a viernes")) return [1, 2, 3, 4, 5];
  if (normalized.includes("sabados y domingos")) return [6, 0];
  if (normalized.includes("sabado")) return [6];
  if (normalized.includes("domingo")) return [0];
  const match = normalized.match(/^(domingo|lunes|martes|miercoles|jueves|viernes|sabado)$/);
  return match ? [WEEKDAY_INDEX[match[1]]] : [];
}

function minuteOfDay(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function scheduleIntervals(rows = []) {
  return rows.flatMap((row) => {
    const days = weekdayIndex(row.dias);
    return (row.periodos || []).flatMap((period) => {
      const match = String(period).match(/(\d{1,2}:\d{2})\s*[–—-]\s*(\d{1,2}:\d{2})/);
      if (!match) return [];
      const start = minuteOfDay(match[1]);
      const end = minuteOfDay(match[2]);
      if (start === null || end === null) return [];
      return days.map((day) => ({ day, start, end }));
    });
  });
}

function getArgentinaClock(date) {
  const parts = Object.fromEntries(CLOCK_FORMATTER.formatToParts(date).map(({ type, value }) => [type, value]));
  const day = WEEKDAY_INDEX[normalize(parts.weekday)];
  return { day, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}

function formatTime(minute) {
  const hours = Math.floor(minute / 60) % 24;
  const minutes = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function serviceStatus(intervals, day, minute) {
  const active = intervals.find((interval) => {
    if (interval.start < interval.end) {
      return interval.day === day && minute >= interval.start && minute < interval.end;
    }
    if (interval.start > interval.end) {
      const opensToday = interval.day === day && minute >= interval.start;
      const previousDay = (day + 6) % 7;
      const continuesFromYesterday = interval.day === previousDay && minute < interval.end;
      return opensToday || continuesFromYesterday;
    }
    return false;
  });

  if (active) {
    const closing = active.end;
    return { isOpen: true, detail: `Cierra a las ${formatTime(closing)}` };
  }

  const nextOpening = intervals
    .map((interval) => {
      const dayOffset = (interval.day - day + 7) % 7;
      const minutesUntil = dayOffset * 1440 + interval.start - minute;
      return minutesUntil > 0 ? { ...interval, dayOffset, minutesUntil } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.minutesUntil - b.minutesUntil)[0];

  if (!nextOpening) return { isOpen: false, detail: "Consultá los horarios de atención" };
  const when = nextOpening.dayOffset === 0
    ? "hoy"
    : nextOpening.dayOffset === 1
      ? "mañana"
      : WEEKDAY_NAMES[(day + nextOpening.dayOffset) % 7];
  return { isOpen: false, detail: `Vuelve a abrir ${when} a las ${formatTime(nextOpening.start)}` };
}

function serviceNotice(intervals, day, minute, isOpen) {
  if (isOpen) {
    const active = intervals.find((interval) => {
      if (interval.start < interval.end) {
        return interval.day === day && minute >= interval.start && minute < interval.end;
      }
      if (interval.start > interval.end) {
        const opensToday = interval.day === day && minute >= interval.start;
        const previousDay = (day + 6) % 7;
        const continuesFromYesterday = interval.day === previousDay && minute < interval.end;
        return opensToday || continuesFromYesterday;
      }
      return false;
    });
    if (!active) return null;

    const minutesUntilClose = active.start < active.end
      ? active.end - minute
      : active.day === day && minute >= active.start
        ? 1440 - minute + active.end
        : active.end - minute;
    return minutesUntilClose > 0 && minutesUntilClose <= 10
      ? { kind: "closing", label: "CIERRA PRONTO" }
      : null;
  }

  const nextOpening = intervals
    .map((interval) => {
      const dayOffset = (interval.day - day + 7) % 7;
      const minutesUntil = dayOffset * 1440 + interval.start - minute;
      return minutesUntil > 0 && minutesUntil <= 10 ? { minutesUntil } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.minutesUntil - b.minutesUntil)[0];

  return nextOpening ? { kind: "opening", label: "ABRE PRONTO" } : null;
}

function todayHours(rows, day) {
  const periods = rows
    .filter((row) => weekdayIndex(row.dias).includes(day))
    .flatMap((row) => row.periodos || []);
  return periods.length ? periods.join(" · ") : "Sin atención programada";
}

export default function BusinessHoursCarousel({ hours, logoSrc }) {
  const slides = useMemo(() => [
    { key: "kiosco", title: "Kiosco", label: "ATENCIÓN DEL LOCAL", rows: hours?.kiosco || [] },
    { key: "paqueteria", title: "Entrega y retiro de paquetes", label: "SERVICIO DE PAQUETERÍA", rows: hours?.paqueteria || [] },
  ].map((slide) => ({ ...slide, intervals: scheduleIntervals(slide.rows) })), [hours]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % slides.length), 7000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const slide = slides[activeIndex] || slides[0];
  const clock = getArgentinaClock(now);
  const status = serviceStatus(slide.intervals, clock.day, clock.minute);
  const cardState = status.isOpen ? "is-open" : "is-closed";
  const notice = serviceNotice(slide.intervals, clock.day, clock.minute, status.isOpen);

  return (
    <section className={`hub-spotlight-card business-hours-card ${cardState} is-${slide.key}`} aria-label="Estado y horarios de atención" aria-roledescription="carrusel">
      <div className="business-hours-logo"><img src={logoSrc} alt="Maxikiosko Blanqui, logo con caramelos" width="640" height="640" /></div>
      <span className="business-hours-promise"><i aria-hidden="true">✦</i> Todo más cerca</span>
      <div className="business-hours-carousel">
        <div className="business-hours-topline">
          <small>{slide.label}</small>
          <span className={`business-hours-status ${cardState}`}>
            <i aria-hidden="true" />{status.isOpen ? "ABIERTO AHORA" : "CERRADO AHORA"}
          </span>
        </div>
        <h2>{slide.title}</h2>
        <p className="business-hours-detail" aria-live="polite">{status.detail}</p>
        <div className="business-hours-today">
          <span>HORARIO DE HOY</span>
          <strong>{todayHours(slide.rows, clock.day)}</strong>
        </div>
        <div className="business-hours-pagination" role="group" aria-label="Elegir horario a mostrar">
          {slides.map((item, index) => (
            <button
              key={item.key}
              type="button"
              className={index === activeIndex ? "is-active" : ""}
              aria-label={`Mostrar horario de ${item.title}`}
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
            />
          ))}
          <span>{activeIndex + 1} / {slides.length}</span>
        </div>
      </div>
      <div
        className={`business-hours-notice ${notice ? `is-${notice.kind}` : "is-empty"}`}
        role={notice ? "status" : undefined}
        aria-live={notice ? "polite" : undefined}
        aria-atomic="true"
        aria-hidden={notice ? undefined : "true"}
        aria-label={notice ? `${notice.label}, dentro de los próximos diez minutos` : undefined}
      >
        <i aria-hidden="true" />
        <span>{notice?.label || "\u00a0"}</span>
      </div>
    </section>
  );
}
