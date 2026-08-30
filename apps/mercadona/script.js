/* ==========================================================================
   La compra — lista compartida
   Los datos viven en el servidor (api.php). Cada producto lleva su fecha de
   cambio, así que si los dos editáis a la vez no se pisa nada.
   Si te quedas sin cobertura sigue funcionando y sube los cambios al volver.
   ========================================================================== */

const API = "api.php";
const CACHE_ITEMS = "merc_v1_items"; // última copia vista (para abrir sin conexión)
const CACHE_QUEUE = "merc_v1_queue"; // cambios propios aún sin subir
const POLL_MS = 8000;

const $ = (id) => document.getElementById(id);

/* ---------- estado ---------- */
let items = readCache(CACHE_ITEMS, {});
let queue = readCache(CACHE_QUEUE, {});
let me = "";
let offline = false;

function readCache(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v) || fallback;
  } catch (e) {
    return fallback;
  }
}
function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

/* ---------- utilidades ---------- */
const now = () => Date.now();

function newId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "i" + now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// "Plátano" y "platano" son el mismo producto
function normalize(s) {
  return (s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function ago(ts) {
  if (!ts) return "";
  const s = Math.floor((now() - ts) / 1000);
  if (s < 60) return "ahora";
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  return new Date(ts).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

let toastTimer = null;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

/* ---------- cambios locales ---------- */
function touch(id, patch) {
  const prev = items[id] || { name: "", qty: 0, note: "", deleted: false };
  const next = Object.assign({}, prev, patch, {
    updatedAt: now(),
    updatedBy: me || prev.updatedBy || "",
  });
  items[id] = next;
  queue[id] = next; // pendiente de subir
  writeCache(CACHE_ITEMS, items);
  writeCache(CACHE_QUEUE, queue);
  render();
  pushSoon();
}

function findByName(name) {
  const key = normalize(name);
  for (const id in items) {
    const it = items[id];
    if (!it.deleted && normalize(it.name) === key) return id;
  }
  return null;
}

function addItem(rawName) {
  const name = (rawName || "").trim().replace(/\s+/g, " ");
  if (!name) return;

  const existing = findByName(name);
  if (existing) {
    const it = items[existing];
    const qty = (Number(it.qty) || 0) + 1;
    touch(existing, { qty });
    toast(
      qty === 1 ? `${it.name}: vuelve a la lista` : `${it.name}: ahora ${qty}`,
    );
    return;
  }
  touch(newId(), { name, qty: 1, deleted: false });
}

const removeItem = (id) => touch(id, { deleted: true });

/* "want" = cuántas unidades comprar cuando se acabe.
   Recordamos la cantidad más alta que llegó a tener: si tenías 4 yogures y
   los vas gastando de uno en uno, al acabarse hay que comprar 4, no 1.
   Se puede ajustar a mano desde el bloque "Falta". */
function setQty(id, qty) {
  const q = Math.max(0, Math.min(999, qty));
  const prev = items[id] || {};
  const prevQty = Number(prev.qty) || 0;
  const prevWant = Number(prev.want) || 0;

  const want =
    q > 0
      ? Math.max(prevWant, q) // sube el listón
      : prevWant > 0
        ? prevWant
        : prevQty > 0
          ? prevQty
          : 1;

  touch(id, { qty: q, want });
}

// cambia solo cuántas unidades hay que comprar
const setWant = (id, want) =>
  touch(id, { want: Math.max(1, Math.min(999, want)) });

// "Comprado": vuelve a la lista con las unidades que tocaba comprar
function restock(id) {
  const it = items[id] || {};
  setQty(id, Math.max(1, Number(it.want) || 1));
}

/* ---------- renombrar un producto ---------- */
// Mientras se escribe no se repinta la lista: si entrara una actualización
// del servidor a media edición, se perdería lo tecleado.
let editingId = null;
let renderPending = false;

function startEdit(id, holder) {
  if (editingId) return;
  const it = items[id];
  if (!it) return;

  editingId = id;
  const original = it.name;

  const input = document.createElement("input");
  input.className = "name-edit";
  input.type = "text";
  input.value = original;
  input.setAttribute("aria-label", `Nombre de ${original}`);
  input.autocomplete = "off";
  input.enterKeyHint = "done";

  holder.replaceChildren(input);
  input.focus();
  input.select();

  let done = false;

  const finish = (save) => {
    if (done) return;
    done = true;
    editingId = null;

    const value = save ? input.value.trim().replace(/\s+/g, " ") : "";

    if (!save || !value || value === original) {
      if (save && !value) toast("El nombre no puede quedar vacío");
      redraw();
      return;
    }

    // no dejamos dos productos con el mismo nombre
    const clash = findByName(value);
    if (clash && clash !== id) {
      toast(`Ya tienes "${items[clash].name}" en la lista`);
      redraw();
      return;
    }

    touch(id, { name: value }); // touch ya repinta
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      input.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      done = true;
      editingId = null;
      redraw();
    }
  });
  input.addEventListener("blur", () => finish(true));
}

function redraw() {
  renderPending = false;
  render();
}

// Etiqueta de nombre que se puede tocar para renombrar
function nameLabel(it, className, withMeta) {
  const holder = document.createElement("span");
  holder.className = className;

  const label = document.createElement("span");
  label.className = "name-text";
  label.textContent = it.name;
  label.tabIndex = 0;
  label.setAttribute("role", "button");
  label.title = "Tocar para cambiar el nombre";
  label.setAttribute("aria-label", `Cambiar el nombre de ${it.name}`);

  const open = (e) => {
    e.stopPropagation();
    startEdit(it.id, holder);
  };
  label.addEventListener("click", open);
  label.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open(e);
    }
  });

  holder.appendChild(label);

  if (withMeta && it.updatedBy) {
    const meta = document.createElement("span");
    meta.className = withMeta;
    meta.textContent = `${it.updatedBy} · ${ago(it.updatedAt)}`;
    holder.appendChild(meta);
  }
  return holder;
}

/* ---------- pintar ---------- */
function visible() {
  return Object.keys(items)
    .filter((id) => items[id] && !items[id].deleted && items[id].name)
    .map((id) => Object.assign({ id }, items[id]));
}

function render() {
  // si se está escribiendo un nombre, esperamos a terminar
  if (editingId) {
    renderPending = true;
    return;
  }

  const all = visible();
  const missing = all
    .filter((i) => Number(i.qty) === 0)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const stock = all
    .filter((i) => Number(i.qty) > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  /* --- los que faltan (arriba del todo) --- */
  const wrap = $("missing-wrap");
  const mList = $("missing-list");
  mList.innerHTML = "";
  if (missing.length) {
    wrap.hidden = false;
    $("missing-count").textContent = missing.length;
    missing.forEach((it) => {
      const li = document.createElement("li");
      li.className = "miss";

      const name = nameLabel(it, "miss-name", "miss-meta");

      // cuántas unidades hay que comprar
      const buy = Math.max(1, Number(it.want) || 1);

      const stepper = document.createElement("div");
      stepper.className = "stepper stepper-miss";

      const less = document.createElement("button");
      less.type = "button";
      less.textContent = "−";
      less.setAttribute(
        "aria-label",
        buy <= 1
          ? `Ya no hace falta comprar ${it.name}`
          : `Comprar una unidad menos de ${it.name}`,
      );
      // bajar de 1 a 0 = ya no hay que comprarlo: vuelve a la lista
      less.onclick = () => {
        if (buy <= 1) {
          restock(it.id);
          toast(`${it.name}: vuelve a la lista`);
        } else {
          setWant(it.id, buy - 1);
        }
      };

      const num = document.createElement("span");
      num.className = "qty";
      num.textContent = buy;

      const more = document.createElement("button");
      more.type = "button";
      more.textContent = "+";
      more.setAttribute("aria-label", `Comprar una unidad más de ${it.name}`);
      more.onclick = () => setWant(it.id, buy + 1);

      stepper.append(less, num, more);

      const back = document.createElement("button");
      back.className = "btn-back";
      back.type = "button";
      back.textContent = "Comprado";
      back.title = `Vuelve a la lista con ${buy} unidad(es)`;
      back.onclick = () => {
        restock(it.id);
        toast(`${it.name}: repuesto (${buy})`);
      };

      li.append(name, stepper, back);
      mList.appendChild(li);
    });
  } else {
    wrap.hidden = true;
  }

  /* --- el resto --- */
  const list = $("list");
  list.innerHTML = "";
  stock.forEach((it) => {
    const li = document.createElement("li");
    li.className = "row";

    const main = document.createElement("div");
    main.className = "row-main";
    main.appendChild(nameLabel(it, "row-name", "row-meta"));

    const actions = document.createElement("div");
    actions.className = "row-actions";

    const stepper = document.createElement("div");
    stepper.className = "stepper";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";
    minus.setAttribute("aria-label", `Quitar una unidad de ${it.name}`);
    minus.onclick = () => {
      const q = Number(it.qty) - 1;
      setQty(it.id, q);
      if (q === 0) toast(`${it.name}: pasa a los que faltan`);
    };

    const qty = document.createElement("span");
    qty.className = "qty";
    qty.textContent = it.qty;

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.setAttribute("aria-label", `Añadir una unidad de ${it.name}`);
    plus.onclick = () => setQty(it.id, Number(it.qty) + 1);

    stepper.append(minus, qty, plus);

    const mark = document.createElement("button");
    mark.className = "btn-icon";
    mark.type = "button";
    mark.textContent = "0";
    mark.title = "Se ha acabado";
    mark.setAttribute("aria-label", `${it.name} se ha acabado`);
    mark.onclick = () => {
      setQty(it.id, 0);
      toast(`${it.name}: pasa a los que faltan`);
    };

    const del = document.createElement("button");
    del.className = "btn-icon";
    del.type = "button";
    del.textContent = "✕";
    del.setAttribute("aria-label", `Quitar ${it.name} de la lista`);
    del.onclick = () => {
      removeItem(it.id);
      toast(`${it.name}: fuera de la lista`);
    };

    actions.append(stepper, mark, del);
    li.append(main, actions);
    list.appendChild(li);
  });

  $("empty").hidden = stock.length > 0 || missing.length > 0;
  renderPending = false;

  /* --- contadores --- */
  $("counts").innerHTML = missing.length
    ? `<strong>${missing.length} ${missing.length === 1 ? "falta" : "faltan"}</strong> · ${stock.length} en la lista`
    : `${stock.length} en la lista`;

  showSync();
}

function showSync() {
  const el = $("sync");
  const pending = Object.keys(queue).length;
  if (offline) {
    el.textContent = pending
      ? `sin conexión · ${pending} por guardar`
      : "sin conexión";
    el.className = "sync warn";
  } else {
    el.textContent = pending ? "guardando…" : "guardado";
    el.className = "sync";
  }
}

/* ---------- sincronización ---------- */
function mergeServer(serverItems) {
  if (!serverItems || typeof serverItems !== "object") return;
  for (const id in serverItems) {
    const remote = serverItems[id];
    if (!remote || typeof remote !== "object") continue;
    const local = items[id];
    // gana el cambio más reciente de ese producto concreto
    if (
      !local ||
      (Number(local.updatedAt) || 0) <= (Number(remote.updatedAt) || 0)
    ) {
      items[id] = remote;
    }
  }
  writeCache(CACHE_ITEMS, items);
}

let pushTimer = null,
  pushing = false,
  pushAgain = false;

function pushSoon() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 400);
}

function push() {
  if (pushing) {
    pushAgain = true;
    return;
  }
  const payload = Object.assign({}, queue);
  if (!Object.keys(payload).length) return;

  pushing = true;
  showSync();

  fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: payload }),
  })
    .then((r) =>
      r.ok ? r.json() : Promise.reject(new Error("http " + r.status)),
    )
    .then((d) => {
      offline = false;
      if (d && d.user) setMe(d.user);
      // quitamos de la cola lo que el servidor ya tiene
      for (const id in payload) {
        const sent = payload[id];
        const saved = d && d.items ? d.items[id] : null;
        if (
          queue[id] &&
          queue[id].updatedAt === sent.updatedAt &&
          saved &&
          (Number(saved.updatedAt) || 0) >= sent.updatedAt
        ) {
          delete queue[id];
        }
      }
      writeCache(CACHE_QUEUE, queue);
      mergeServer(d && d.items);
      render();
    })
    .catch(() => {
      offline = true;
      showSync();
    })
    .finally(() => {
      pushing = false;
      if (pushAgain) {
        pushAgain = false;
        push();
      }
    });
}

function pull() {
  return fetch(API, { cache: "no-store" })
    .then((r) =>
      r.ok ? r.json() : Promise.reject(new Error("http " + r.status)),
    )
    .then((d) => {
      offline = false;
      if (d && d.user) setMe(d.user);
      mergeServer(d && d.items);
      render();
      if (Object.keys(queue).length) push(); // reintenta lo que quedó pendiente
    })
    .catch(() => {
      offline = true;
      showSync();
    });
}

function setMe(user) {
  if (me === user) return;
  me = user;
  $("who").textContent = user;
}

/* ---------- interacción ---------- */
const input = $("add-input");

$("add-btn").onclick = () => {
  addItem(input.value);
  input.value = "";
  input.focus();
};

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addItem(input.value);
    input.value = "";
  }
});

$("clear-missing").onclick = () => {
  const missing = visible().filter((i) => Number(i.qty) === 0);
  if (!missing.length) {
    toast("No falta nada");
    return;
  }
  if (
    !confirm(
      `Se quitarán de la lista ${missing.length} producto(s) que faltan. ¿Seguir?`,
    )
  )
    return;
  missing.forEach((i) => removeItem(i.id));
  toast("Lista limpia");
};

// al volver a la app, refresca por si el otro ha tocado algo
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) pull();
});
window.addEventListener("online", () => {
  offline = false;
  pull();
});
window.addEventListener("offline", () => {
  offline = true;
  showSync();
});

/* ---------- arranque ---------- */
render();
pull();
setInterval(() => {
  if (!document.hidden) pull();
}, POLL_MS);
