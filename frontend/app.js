// --- Config y estado ---
const HORA_INICIO = "10:00";
const HORA_FIN = "21:00";
const INTERVALO_MIN = 20;

let citas = [];
let stylists = [];
let selectedStylist = null;

let selectedDate = todayStr();
let calendar = null;

let citaEditando = null; // 👈 nuevo para edición

// --- Inicio ---
document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  startClock();

  await loadStylists();
  await loadCitas();

  setupStylistSelect();
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

// --- Utilidades ---
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

  // 👇 Recalcular tamaños si volvemos al calendario
  if (id === "tab-calendario" && calendar) {
    calendar.updateSize();
  }
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

// --- Datos ---
async function loadStylists() {
  try {
    const res = await fetch("/api/stylists", { cache: "no-store" });
    stylists = res.ok ? await res.json() : [];
    selectedStylist = stylists[0] || null;
  } catch {
    stylists = [];
    selectedStylist = null;
  }
}

function setupStylistSelect() {
  const sel = document.getElementById("stylistSelect");
  sel.innerHTML = "";

  if (!stylists.length) {
    const opt = document.createElement("option");
    opt.textContent = "Sin peluqueros";
    sel.appendChild(opt);
    sel.disabled = true;
    return;
  }

  stylists.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    if (name === selectedStylist) opt.selected = true;
    sel.appendChild(opt);
  });

  sel.disabled = false;
  sel.addEventListener("change", () => {
    selectedStylist = sel.value;
    renderHuecos(selectedDate);
    if (calendar) {
      calendar.refetchEvents();  // refrescar contadores como eventos
      calendar.rerenderDates();  // refrescar colores de celdas
    }
  });
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
    showToast(data.detail || "Hueco ocupado");
    return false;
  }
  showToast("Error guardando cita");
  return false;
}

// --- Funciones de edición ---
function editarCita(cita) {
  citaEditando = cita;
  const modal = document.getElementById("modal-editar");
  modal.style.display = ""; // reset por si estaba oculto manualmente
  document.getElementById("editNombre").value = cita.nombre;
  document.getElementById("editTelefono").value = cita.telefono;
  modal.classList.add("visible");
}


function cerrarModalEdicion() {
  const modal = document.getElementById("modal-editar");
  modal.classList.remove("visible");
  modal.style.display = ""; // vuelve al valor por defecto del CSS
  citaEditando = null;
}


async function guardarEdicion() {
  if (!citaEditando) return;

  const nuevoNombre = document.getElementById("editNombre").value.trim();
  const nuevoTelefono = document.getElementById("editTelefono").value.trim();

  if (!nuevoNombre || !nuevoTelefono) {
    showToast("Nombre y teléfono son obligatorios");
    return;
  }

  const res = await fetch(`/api/appointments/${citaEditando.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre: nuevoNombre,
      telefono: nuevoTelefono
    })
  });

 if (res.ok) {
  showToast("Cita actualizada");
  cerrarModalEdicion(); // 👈 cerrar primero
  await loadCitas();
  renderHuecos(selectedDate);
  if (calendar) {
    calendar.refetchEvents();
    calendar.rerenderDates();
  }
  goToTab("tab-citas");
} else {
  showToast("Error al actualizar la cita");
}

}
// --- Huecos ---
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
    const existente = citas.find(
      c => c.fecha === fecha && c.hora === hora && c.peluquero === selectedStylist
    );

    const card = document.createElement("div");
    const horaDiv = document.createElement("div");
    horaDiv.className = "slot-time";
    horaDiv.textContent = hora;

    if (existente) {
      card.className = "slot ocupado";
      const datos = document.createElement("div");
      datos.textContent = `${existente.nombre} (${existente.telefono})`;

      const btnEditar = document.createElement("button");
      btnEditar.textContent = "✏️ Editar";
      btnEditar.addEventListener("click", () => editarCita(existente));

      card.append(horaDiv, datos, btnEditar);
    } else {
      card.className = "slot disponible";
      const btn = document.createElement("button");
      btn.textContent = `Reservar (${selectedStylist || "Peluquero"})`;
      btn.addEventListener("click", async () => {
        if (!selectedStylist) {
          showToast("Selecciona un peluquero antes de reservar");
          return;
        }
        const nombre = prompt("Nombre del cliente:");
        if (!nombre) return;
        const tel = prompt("Teléfono:");
        if (!tel) return;
        const nueva = {
          fecha,
          hora,
          nombre,
          telefono: tel,
          estado: "Pendiente",
          peluquero: selectedStylist
        };
        if (await guardarCita(nueva)) {
          await loadCitas();
          renderHuecos(fecha);
          if (calendar) {
            calendar.refetchEvents();
            calendar.rerenderDates();
          }
        }
      });
      card.append(horaDiv, btn);
    }

    cont.appendChild(card);
  });
}

// Siglas ("Jose Luis" -> "JL")
function getAcronym(name) {
  if (!name) return "";
  return name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase();
}

// --- Calendario ---
function setupCalendar() {
  let lastClickDate = null;
  let lastClickTime = 0;
  const doubleClickDelay = 400;

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

    events: function(fetchInfo, successCallback) {
      const out = [];
      let current = new Date(fetchInfo.start);
      const end = new Date(fetchInfo.end);

      while (current < end) {
        const dateStr = current.toISOString().split("T")[0];
        const huecos = generarHuecos(dateStr);

        if (huecos.length && stylists.length) {
          const totalSlots = huecos.length;
          const piezas = stylists.map(name => {
            const abre = getAcronym(name);
            const ocupadas = citas.filter(c => c.fecha === dateStr && c.peluquero === name).length;
            const disp = Math.max(totalSlots - ocupadas, 0);
            return `${abre}:${disp}`;
          });

          out.push({
            title: piezas.join(" / "),
            start: dateStr,
            allDay: true,
            display: "block",
            className: ["contador-evento"],
            extendedProps: { kind: "contador" }
          });
        }

        current.setDate(current.getDate() + 1);
      }

      successCallback(out);
    },

    eventContent: function(arg) {
      if (arg.event.extendedProps?.kind !== "contador") return true;
      const el = document.createElement("div");
      el.className = "contador-inner";
      el.textContent = arg.event.title;
      return { domNodes: [el] };
    },

    dayCellDidMount: function(info) {
      info.el.querySelectorAll(".mini-info").forEach(n => n.remove());

      const num = info.el.querySelector(".fc-daygrid-day-number");
      if (num) {
        num.style.position = "";
        num.style.top = "";
        num.style.left = "";
        num.style.transform = "";
        num.style.zIndex = "";
      }

      const dateStr = info.date.toISOString().split("T")[0];
      const dayOfWeek = info.date.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        info.el.style.backgroundColor = "rgba(239, 83, 80, 0.25)";
      } else {
        const huecos = generarHuecos(dateStr);
        const totalSlots = huecos.length;
        let ocupados;

        if (selectedStylist) {
          ocupados = citas.filter(c => c.fecha === dateStr && c.peluquero === selectedStylist).length;
        } else {
          const llenosPorEstilista = stylists.every(name => {
            const o = citas.filter(c => c.fecha === dateStr && c.peluquero === name).length;
            return totalSlots > 0 && o >= totalSlots;
          });
          ocupados = llenosPorEstilista ? totalSlots : 0;
        }

        if (totalSlots > 0 && ocupados >= totalSlots) {
          info.el.style.backgroundColor = "rgba(239, 83, 80, 0.25)";
        } else {
          info.el.style.backgroundColor = "";
        }
      }

      info.el.style.cursor = "pointer";
      info.el.style.pointerEvents = "auto";
    },

    datesSet: function() {
      document.querySelectorAll(".mini-info").forEach(n => n.remove());
    },

    dateClick: (info) => {
      const fecha = info.dateStr;
      const now = Date.now();

      if (lastClickDate === fecha && (now - lastClickTime) < doubleClickDelay) {
        const dayOfWeek = new Date(fecha).getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          alert("No se pueden reservar citas en sábados o domingos");
          return;
        }
        renderHuecos(fecha);
        goToTab("tab-citas");
      } else {
        lastClickDate = fecha;
        lastClickTime = now;
        showToast("Haz clic otra vez para confirmar el día");
      }
    }
  });

  calendar.render();
}














