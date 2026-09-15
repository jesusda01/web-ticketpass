const API_BASE = "http://127.0.0.1:8000";

let eventosData = [];
let personaSeleccionada = null;

document.addEventListener("DOMContentLoaded", () => {
  cargarEventos();

  document.getElementById("btn-buscar-dni").addEventListener("click", buscarPersona);
  document.getElementById("select-evento").addEventListener("change", calcularTotal);
  document.getElementById("cantidad").addEventListener("input", calcularTotal);
  document.getElementById("purchase-form").addEventListener("submit", procesarCompra);
  document.getElementById("btn-cerrar-modal").addEventListener("click", () => {
    document.getElementById("modal-ticket").classList.add("hidden");
  });
});

// 1. Cargar catálogo de eventos desde la API
async function cargarEventos() {
  try {
    const res = await fetch(`${API_BASE}/eventos`);
    eventosData = await res.json();

    const grid = document.getElementById("events-grid");
    const select = document.getElementById("select-evento");

    grid.innerHTML = "";
    select.innerHTML = '<option value="">-- Elige un evento --</option>';

    eventosData.forEach(ev => {
      // Tarjeta en catálogo
      const card = document.createElement("div");
      card.className = "event-card";
      card.innerHTML = `
        <img src="${ev.banner_url}" alt="${ev.titulo}">
        <div class="event-card-body">
          <h4>${ev.titulo}</h4>
          <p>${ev.descripcion || ev.lugar || ''}</p>
          <div class="precio">S/ ${ev.precio.toFixed(2)}</div>
        </div>
      `;
      grid.appendChild(card);

      // Opción en Select
      const opt = document.createElement("option");
      opt.value = ev.id;
      opt.textContent = `${ev.titulo} - S/ ${ev.precio.toFixed(2)}`;
      select.appendChild(opt);
    });
  } catch (err) {
    document.getElementById("events-grid").innerHTML = "<p>Error al conectar con la API de eventos.</p>";
  }
}

// 2. Autocompletar datos por DNI (Mock RENIEC)
async function buscarPersona() {
  const dni = document.getElementById("dni").value.trim();
  const inputNombre = document.getElementById("comprador-nombre");

  if (dni.length !== 8) {
    alert("El DNI debe tener exactamente 8 dígitos.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/persona/${dni}`);
    if (!res.ok) {
      alert("DNI no encontrado en la base de datos.");
      inputNombre.value = "";
      personaSeleccionada = null;
      return;
    }

    const data = await res.json();
    console.log("Respuesta de la API de persona:", data); // Para inspeccionar la estructura real

    // Extraer persona si viene dentro de un objeto 'comprador' o directamente en la raíz
    personaSeleccionada = data.comprador || data;

    // Obtener el nombre soportando 'nombre', 'nombres', 'apellido' o 'apellidos'
    const nombre = personaSeleccionada.nombres || personaSeleccionada.nombre || "";
    const apellido = personaSeleccionada.apellidos || personaSeleccionada.apellido || "";

    const nombreCompleto = `${nombre} ${apellido}`.trim();
    inputNombre.value = nombreCompleto || "Nombre no disponible";

  } catch (err) {
    console.error(err);
    alert("Error al conectar con la API para validar el DNI.");
  }
}

// 3. Re-calcular precio total en vivo
function calcularTotal() {
  const evId = parseInt(document.getElementById("select-evento").value);
  const cant = parseInt(document.getElementById("cantidad").value) || 0;
  const ev = eventosData.find(e => e.id === evId);

  const total = ev ? ev.precio * cant : 0;
  document.getElementById("total-precio").textContent = total.toFixed(2);
}

// 4. Enviar compra a la API POST /comprar
async function procesarCompra(e) {
  e.preventDefault();

  const dni = document.getElementById("dni").value.trim();
  const id_evento = parseInt(document.getElementById("select-evento").value);
  const correo = document.getElementById("correo").value.trim();
  const cantidad = parseInt(document.getElementById("cantidad").value);

  if (!personaSeleccionada || personaSeleccionada.dni !== dni) {
    alert("Por favor verifica el DNI primero.");
    return;
  }

  const payload = { dni_comprador: dni, id_evento, correo, cantidad };

  try {
    const res = await fetch(`${API_BASE}/comprar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Error procesando compra.");

    const data = await res.json();

    // Mostrar modal con ticket generado
    document.getElementById("ticket-codigo").textContent = data.codigo_ticket;
    document.getElementById("ticket-evento").textContent = document.getElementById("select-evento").selectedOptions[0].text;
    document.getElementById("ticket-comprador").textContent = `${personaSeleccionada.nombres} ${personaSeleccionada.apellidos}`;
    document.getElementById("ticket-monto").textContent = data.monto_total.toFixed(2);
    document.getElementById("modal-ticket").classList.remove("hidden");

    // Limpiar formulario
    document.getElementById("purchase-form").reset();
    document.getElementById("total-precio").textContent = "0.00";
    personaSeleccionada = null;

  } catch (err) {
    alert("Hubo un problema al emitir la entrada.");
  }
}