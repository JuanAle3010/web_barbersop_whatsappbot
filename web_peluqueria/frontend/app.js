const HORA_INICIO = "10:00";
const HORA_FIN = "21:00";
const INTERVALO_MIN = 20;

let citas = [];
let selectedDate = todayStr();
let calendar = null;

document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  startClock();
  await loadCitas();
  setupCalendar();
  renderHuecos(selectedDate);

  document.getElementById("btn-ver").addEventListener("click", () => {
    goToTab("tab-citas");
    renderHuecos(selectedDate);
  });

  document.getElementById("btn-hoy").addEventListener("click", () => {
    selectedDate = todayStr();
    renderHuecos(selectedDate);
    if (calendar) calendar.gotoDate(selectedDate);
    goToTab("tab-citas");
  });
});

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function toLabel(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d)
    .toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function setupTabs() {
  document.querySelectorAll(".tab-button").forEach(btn => {
    btn.addEventListener("click", () => goToTab(btn.dataset.tab));
  });
}

function goToTab(id) {
  document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
  document.querySelector(`.tab-button[data-tab="${id}"]`)?.classList.add("active");
  document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2300);
}

function startClock() {
  const clockEl = document.getElementById("clock");
  setInterval(() => {
    clockEl.textContent = new Date().toLocaleTimeString([], {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  }, 1000);
}

async function loadCitas() {
  const res = await fetch("/api/appointments", { cache: "no-store" });
  citas = res.ok ? await res.json() : [];
}

async function guardarCita(cita) {
  const res = await fetch("/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cita)
  });
  if (res.ok) {
    showToast("Cita guardada");
    return true;
  } else if (res.status === 409) {
    const data = await res.json();
    showToast(data.message || "Hueco ocupado");
    return false;
  }
  showToast("Error guardando cita");
  return false;
}

function esLaborable(dateStr) {
  const d = new Date(dateStr).getDay();
  return d >= 1 && d <= 5;
}

function generarHuecos(fecha) {
  if (!esLaborable(fecha)) return [];
  const start = new Date(`${fecha}T${HORA_INICIO}:00`);
  const end = new Date(`${fecha}T${HORA_FIN}:00`);
  const slots = [];
  let curr = new Date(start);
  while (curr <= end) {
    slots.push(`${String(curr.getHours()).padStart(2,"0")}:${String(curr.getMinutes()).padStart(2,"0")}`);
    curr.setMinutes(curr.getMinutes() + INTERVALO_MIN);
  }
  return slots;
}

function renderHuecos(fecha) {
  selectedDate = fecha;
  document.getElementById("selectedDateLabel").textContent = toLabel(fecha);

  const cont = document.getElementById("lista-citas");
  cont.innerHTML = "";

  const huecos = generarHuecos(fecha);
  if (!huecos.length) {
    cont.innerHTML = `<p>No hay huecos disponibles este día.</p>`;
    return;
  }

  huecos.forEach(hora => {
    const existente = citas.find(c => c.fecha === fecha && c.hora === hora);
    const card = document.createElement("div");
    const horaDiv = document.createElement("div");
    horaDiv.className = "slot-time";
    horaDiv.textContent = hora;

    if (existente) {
      card.className = "slot ocupado";
      const datos = document.createElement("div");
      datos.textContent = `${existente.nombre} (${existente.telefono})`;
      card.append(horaDiv, datos);
    } else {
      card.className = "slot disponible";
      const btn = document.createElement("button");
      btn.textContent = "Reservar";
      btn.addEventListener("click", async () => {
        const nombre = prompt("Nombre del cliente:");
        if (!nombre) return;
        const tel = prompt("Teléfono:");
        if (!tel) return;
        const nueva = { fecha, hora, nombre, telefono: tel, estado: "Pendiente" };
        if (await guardarCita(nueva)) {
          await loadCitas();
          renderHuecos(fecha);
          if (calendar) calendar.refetchEvents();
        }
      });
      card.append(horaDiv, btn);
    }

    cont.appendChild(card);
  });
}

function setupCalendar() {
  const calendarEl = document.getElementById("calendar");
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    height: 540,
    locale: "es",
    firstDay: 1,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,listWeek"
    },
    dateClick: (info) => {
      renderHuecos(info.dateStr);
      goToTab("tab-citas");
    },
    events: (fetchInfo, successCallback) => {
      const events = citas.map(c => ({
        title: c.nombre || "Ocupado",
        start: `${c.fecha}T${c.hora}:00`,
        allDay: false
      }));
      successCallback(events);
    }
  });
  calendar.render();
}






