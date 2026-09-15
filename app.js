const API_URL = "http://localhost:8000"; // Cambiar por la IP pública al desplegar en EC2

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("lista-eventos")) {
        cargarCatalogo();
    } else if (document.getElementById("detalle-evento")) {
        cargarDetalle();
    }
});

// 1. Cargar catálogo en index.html
async function cargarCatalogo() {
    try {
        const res = await fetch(`${API_URL}/eventos`);
        const eventos = await res.json();
        const contenedor = document.getElementById("lista-eventos");

        contenedor.innerHTML = eventos.map(e => `
            <div class="card-evento" onclick="irADetalle(${e.id})">
                <img src="${e.banner_url}" alt="${e.titulo}">
                <div class="card-body">
                    <span class="badge">${e.categoria}</span>
                    <h3>${e.titulo}</h3>
                    <p>📍 ${e.lugar}</p>
                    <p>📅 ${e.fecha}</p>
                    <p class="precio">Desde S/ ${e.precio.toFixed(2)}</p>
                </div>
            </div>
        `).join("");
    } catch (err) {
        console.error("Error al cargar eventos:", err);
    }
}

function irADetalle(id) {
    window.location.href = `detalle.html?id=${id}`;
}

// 2. Cargar vista detallada y formulario de compra en detalle.html
async function cargarDetalle() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        window.location.href = "index.html";
        return;
    }

    try {
        const res = await fetch(`${API_URL}/eventos/${id}`);
        if (!res.ok) throw new Error("Evento no encontrado");
        
        const evento = await res.json();
        const contenedor = document.getElementById("detalle-evento");

        contenedor.innerHTML = `
            <div class="detalle-col">
                <img src="${evento.banner_url}" alt="${evento.titulo}" class="banner-detalle">
                <h2>${evento.titulo}</h2>
                <p><strong>Categoría:</strong> ${evento.categoria}</p>
                <p><strong>Lugar:</strong> ${evento.lugar}</p>
                <p><strong>Fecha y Hora:</strong> ${evento.fecha}</p>
                <p class="precio-destacado">Precio unitario: S/ ${evento.precio.toFixed(2)}</p>
            </div>

            <div class="detalle-col form-col">
                <h3>Comprar Entradas</h3>
                <form id="form-compra" onsubmit="procesarCompra(event, ${evento.id}, ${evento.precio})">
                    <label>DNI Comprador:</label>
                    <div class="input-inline">
                        <input type="text" id="dni" maxlength="8" required placeholder="Ingresa tu DNI">
                        <button type="button" onclick="buscarDNI()">Validar</button>
                    </div>

                    <label>Nombre Completo:</label>
                    <input type="text" id="nombre-comprador" readonly placeholder="Validación automática">

                    <label>Correo Electrónico:</label>
                    <input type="email" id="correo" required placeholder="tu@correo.com">

                    <label>Cantidad:</label>
                    <input type="number" id="cantidad" min="1" max="10" value="1" onchange="actualizarTotal(${evento.precio})" required>

                    <div class="resumen-total">
                        <strong>Total a pagar: S/ <span id="total-pagar">${evento.precio.toFixed(2)}</span></strong>
                    </div>

                    <button type="submit" class="btn-comprar">Confirmar Compra</button>
                </form>
            </div>
        `;
    } catch (err) {
        document.getElementById("detalle-evento").innerHTML = `<p>Error al cargar el detalle del evento.</p>`;
    }
}

function actualizarTotal(precioUnitario) {
    const cant = parseInt(document.getElementById("cantidad").value) || 1;
    document.getElementById("total-pagar").textContent = (cant * precioUnitario).toFixed(2);
}

async function buscarDNI() {
    const dni = document.getElementById("dni").value;
    const inputNombre = document.getElementById("nombre-comprador");

    if (dni.length !== 8) {
        alert("El DNI debe tener 8 dígitos.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/persona/${dni}`);
        if (!res.ok) throw new Error("DNI no encontrado");
        const data = await res.json();
        inputNombre.value = `${data.nombres} ${data.apellido_paterno} ${data.apellido_materno}`;
    } catch (err) {
        alert("DNI no encontrado en el padrón.");
        inputNombre.value = "";
    }
}

async function procesarCompra(e, idEvento, precioUnitario) {
    e.preventDefault();
    const dni = document.getElementById("dni").value;
    const correo = document.getElementById("correo").value;
    const cantidad = parseInt(document.getElementById("cantidad").value);

    try {
        const res = await fetch(`${API_URL}/comprar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                dni_comprador: dni,
                id_evento: idEvento,
                correo: correo,
                cantidad: cantidad
            })
        });

        if (!res.ok) throw new Error("Error procesando la orden");

        const orden = await res.json();
        mostrarModalExito(orden.codigo_ticket, orden.monto_total);
    } catch (err) {
        alert("Hubo un error al registrar tu compra.");
    }
}

function mostrarModalExito(codigo, monto) {
    document.getElementById("modal-codigo").textContent = codigo;
    document.getElementById("modal-monto").textContent = Number(monto).toFixed(2);
    document.getElementById("modal-confirmacion").classList.remove("hidden");
}

function cerrarModalEIrAInicio() {
    document.getElementById("modal-confirmacion").classList.add("hidden");
    window.location.href = "index.html";
}