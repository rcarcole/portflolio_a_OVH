/* ==========================================================================
   La compra — lista compartida
   Los datos viven en el servidor (api.php). Cada producto lleva su fecha de
   cambio, así que si los dos editáis a la vez no se pisa nada.
   Si te quedas sin cobertura sigue funcionando y sube los cambios al volver.
   ========================================================================== */

const API = 'api.php';
const CACHE_ITEMS = 'merc_v1_items';     // última copia vista (para abrir sin conexión)
const CACHE_QUEUE = 'merc_v1_queue';     // cambios propios aún sin subir
const POLL_MS = 8000;

const $ = id => document.getElementById(id);

/* ---------- estado ---------- */
let items = readCache(CACHE_ITEMS, {});
let queue = readCache(CACHE_QUEUE, {});
let me = '';
let offline = false;

function readCache(key, fallback){
  try{
    const v = localStorage.getItem(key);
    return v == null ? fallback : (JSON.parse(v) || fallback);
  }catch(e){ return fallback; }
}
function writeCache(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
}

/* ---------- utilidades ---------- */
const now = () => Date.now();

function newId(){
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'i' + now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// "Plátano" y "platano" son el mismo producto
function normalize(s){
  return (s || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function ago(ts){
  if(!ts) return '';
  const s = Math.floor((now() - ts) / 1000);
  if (s < 60) return 'ahora';
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  return new Date(ts).toLocaleDateString('es-ES', { day:'numeric', month:'short' });
}

let toastTimer = null;
function toast(msg){
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- cambios locales ---------- */
function touch(id, patch){
  const prev = items[id] || { name:'', qty:0, note:'', deleted:false };
  const next = Object.assign({}, prev, patch, {
    updatedAt: now(),
    updatedBy: me || prev.updatedBy || ''
  });
  items[id] = next;
  queue[id] = next;            // pendiente de subir
  writeCache(CACHE_ITEMS, items);
  writeCache(CACHE_QUEUE, queue);
  render();
  pushSoon();
}

function findByName(name){
  const key = normalize(name);
  for (const id in items){
    const it = items[id];
    if (!it.deleted && normalize(it.name) === key) return id;
  }
  return null;
}

function addItem(rawName){
  const name = (rawName || '').trim().replace(/\s+/g, ' ');
  if (!name) return;

  const existing = findByName(name);
  if (existing){
    const it = items[existing];
    const qty = (Number(it.qty) || 0) + 1;
    touch(existing, { qty });
    toast(qty === 1 ? `${it.name}: vuelve a la lista` : `${it.name}: ahora ${qty}`);
    return;
  }
  touch(newId(), { name, qty:1, deleted:false });
}

const setQty     = (id, qty) => touch(id, { qty: Math.max(0, Math.min(999, qty)) });
const removeItem = id => touch(id, { deleted:true });

/* ---------- pintar ---------- */
function visible(){
  return Object.keys(items)
    .filter(id => items[id] && !items[id].deleted && items[id].name)
    .map(id => Object.assign({ id }, items[id]));
}

function render(){
  const all     = visible();
  const missing = all.filter(i => Number(i.qty) === 0)
                     .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const stock   = all.filter(i => Number(i.qty) > 0)
                     .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  /* --- los que faltan (arriba del todo) --- */
  const wrap = $('missing-wrap');
  const mList = $('missing-list');
  mList.innerHTML = '';
  if (missing.length){
    wrap.hidden = false;
    $('missing-count').textContent = missing.length;
    missing.forEach(it => {
      const li = document.createElement('li');
      li.className = 'miss';

      const name = document.createElement('span');
      name.className = 'miss-name';
      name.textContent = it.name;
      if (it.updatedBy){
        const meta = document.createElement('span');
        meta.className = 'miss-meta';
        meta.textContent = `${it.updatedBy} · ${ago(it.updatedAt)}`;
        name.appendChild(meta);
      }

      const back = document.createElement('button');
      back.className = 'btn-back';
      back.type = 'button';
      back.textContent = 'Comprado';
      back.title = 'Vuelve a la lista con cantidad 1';
      back.onclick = () => { setQty(it.id, 1); toast(`${it.name}: repuesto`); };

      const del = document.createElement('button');
      del.className = 'btn-icon';
      del.type = 'button';
      del.textContent = '✕';
      del.setAttribute('aria-label', `Quitar ${it.name} de la lista`);
      del.onclick = () => { removeItem(it.id); toast(`${it.name}: fuera de la lista`); };

      li.append(name, back, del);
      mList.appendChild(li);
    });
  } else {
    wrap.hidden = true;
  }

  /* --- el resto --- */
  const list = $('list');
  list.innerHTML = '';
  stock.forEach(it => {
    const li = document.createElement('li');
    li.className = 'row';

    const main = document.createElement('div');
    main.className = 'row-main';
    const nm = document.createElement('span');
    nm.className = 'row-name';
    nm.textContent = it.name;
    main.appendChild(nm);
    if (it.updatedBy){
      const meta = document.createElement('span');
      meta.className = 'row-meta';
      meta.textContent = `${it.updatedBy} · ${ago(it.updatedAt)}`;
      main.appendChild(meta);
    }

    const actions = document.createElement('div');
    actions.className = 'row-actions';

    const stepper = document.createElement('div');
    stepper.className = 'stepper';

    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.setAttribute('aria-label', `Quitar una unidad de ${it.name}`);
    minus.onclick = () => {
      const q = Number(it.qty) - 1;
      setQty(it.id, q);
      if (q === 0) toast(`${it.name}: pasa a los que faltan`);
    };

    const qty = document.createElement('span');
    qty.className = 'qty';
    qty.textContent = it.qty;

    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.setAttribute('aria-label', `Añadir una unidad de ${it.name}`);
    plus.onclick = () => setQty(it.id, Number(it.qty) + 1);

    stepper.append(minus, qty, plus);

    const mark = document.createElement('button');
    mark.className = 'btn-icon';
    mark.type = 'button';
    mark.textContent = '0';
    mark.title = 'Se ha acabado';
    mark.setAttribute('aria-label', `${it.name} se ha acabado`);
    mark.onclick = () => { setQty(it.id, 0); toast(`${it.name}: pasa a los que faltan`); };

    const del = document.createElement('button');
    del.className = 'btn-icon';
    del.type = 'button';
    del.textContent = '✕';
    del.setAttribute('aria-label', `Quitar ${it.name} de la lista`);
    del.onclick = () => { removeItem(it.id); toast(`${it.name}: fuera de la lista`); };

    actions.append(stepper, mark, del);
    li.append(main, actions);
    list.appendChild(li);
  });

  $('empty').hidden = (stock.length > 0 || missing.length > 0);

  /* --- contadores --- */
  $('counts').innerHTML = missing.length
    ? `<strong>${missing.length} ${missing.length === 1 ? 'falta' : 'faltan'}</strong> · ${stock.length} en la lista`
    : `${stock.length} en la lista`;

  showSync();
}

function showSync(){
  const el = $('sync');
  const pending = Object.keys(queue).length;
  if (offline){
    el.textContent = pending ? `sin conexión · ${pending} por guardar` : 'sin conexión';
    el.className = 'sync warn';
  } else {
    el.textContent = pending ? 'guardando…' : 'guardado';
    el.className = 'sync';
  }
}

/* ---------- sincronización ---------- */
function mergeServer(serverItems){
  if (!serverItems || typeof serverItems !== 'object') return;
  for (const id in serverItems){
    const remote = serverItems[id];
    if (!remote || typeof remote !== 'object') continue;
    const local = items[id];
    // gana el cambio más reciente de ese producto concreto
    if (!local || (Number(local.updatedAt) || 0) <= (Number(remote.updatedAt) || 0)){
      items[id] = remote;
    }
  }
  writeCache(CACHE_ITEMS, items);
}

let pushTimer = null, pushing = false, pushAgain = false;

function pushSoon(){
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 400);
}

function push(){
  if (pushing){ pushAgain = true; return; }
  const payload = Object.assign({}, queue);
  if (!Object.keys(payload).length) return;

  pushing = true;
  showSync();

  fetch(API, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ items: payload })
  })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('http ' + r.status)))
    .then(d => {
      offline = false;
      if (d && d.user) setMe(d.user);
      // quitamos de la cola lo que el servidor ya tiene
      for (const id in payload){
        const sent = payload[id];
        const saved = d && d.items ? d.items[id] : null;
        if (queue[id] && queue[id].updatedAt === sent.updatedAt &&
            saved && (Number(saved.updatedAt) || 0) >= sent.updatedAt){
          delete queue[id];
        }
      }
      writeCache(CACHE_QUEUE, queue);
      mergeServer(d && d.items);
      render();
    })
    .catch(() => { offline = true; showSync(); })
    .finally(() => {
      pushing = false;
      if (pushAgain){ pushAgain = false; push(); }
    });
}

function pull(){
  return fetch(API, { cache:'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('http ' + r.status)))
    .then(d => {
      offline = false;
      if (d && d.user) setMe(d.user);
      mergeServer(d && d.items);
      render();
      if (Object.keys(queue).length) push();   // reintenta lo que quedó pendiente
    })
    .catch(() => { offline = true; showSync(); });
}

function setMe(user){
  if (me === user) return;
  me = user;
  $('who').textContent = user;
}

/* ---------- interacción ---------- */
const input = $('add-input');

$('add-btn').onclick = () => {
  addItem(input.value);
  input.value = '';
  input.focus();
};

input.addEventListener('keydown', e => {
  if (e.key === 'Enter'){
    e.preventDefault();
    addItem(input.value);
    input.value = '';
  }
});

$('clear-missing').onclick = () => {
  const missing = visible().filter(i => Number(i.qty) === 0);
  if (!missing.length){ toast('No falta nada'); return; }
  if (!confirm(`Se quitarán de la lista ${missing.length} producto(s) que faltan. ¿Seguir?`)) return;
  missing.forEach(i => removeItem(i.id));
  toast('Lista limpia');
};

// al volver a la app, refresca por si el otro ha tocado algo
document.addEventListener('visibilitychange', () => { if (!document.hidden) pull(); });
window.addEventListener('online', () => { offline = false; pull(); });
window.addEventListener('offline', () => { offline = true; showSync(); });

/* ---------- arranque ---------- */
render();
pull();
setInterval(() => { if (!document.hidden) pull(); }, POLL_MS);
