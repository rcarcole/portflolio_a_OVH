<?php
/* ==========================================================================
Almacén compartido de la lista de la compra.

Guarda un JSON en el servidor para que Robert y Zhara vean y editen LA MISMA
lista desde cualquier móvil u ordenador.

A diferencia de un guardado normal (donde el último en escribir pisa todo lo
del otro), aquí se fusiona ITEM A ITEM: cada producto lleva su propia marca de
tiempo y gana la versión más reciente de ese producto concreto. Así, si los dos
estáis en el súper tocando la lista a la vez, no se pierde nada.

La contraseña la pide Apache (Basic Auth sobre /apps), así que a este script
solo se llega ya identificado. Por eso aquí no hace falta ningún token.
========================================================================== */
declare(strict_types=1);

$DATA_FILE = __DIR__ . '/mercadona-data.json';

const MAX_ITEMS      = 600;        // tope de productos guardados
const MAX_BODY       = 1000000;    // ~1 MB por petición
const TOMBSTONE_DAYS = 45;         // cuánto se recuerda un borrado

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

/* ---------- quién ha entrado (lo dice Apache tras el login) ---------- */
function currentUser(): string
{
    foreach (['PHP_AUTH_USER', 'REMOTE_USER', 'REDIRECT_REMOTE_USER'] as $key) {
        if (!empty($_SERVER[$key])) {
            $u = preg_replace('/[^A-Za-z0-9_.\-]/', '', (string) $_SERVER[$key]);
            if ($u !== '') return substr($u, 0, 20);
        }
    }
    return '';
}

/* Corta texto sin romper las tildes ni la "ñ".
   Usa mbstring si el hosting la tiene y, si no, un método equivalente. */
function cut(string $s, int $len): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($s, 0, $len, 'UTF-8');
    }
    if (preg_match('/^.{0,' . $len . '}/us', $s, $m)) {
        return $m[0];
    }
    return substr($s, 0, $len);
}

/* ---------- limpieza de lo que llega del navegador ---------- */
function cleanItem(array $in): ?array
{
    $name = trim((string) ($in['name'] ?? ''));
    if ($name === '') return null;

    $qty = (int) ($in['qty'] ?? 0);
    if ($qty < 0)   $qty = 0;
    if ($qty > 999) $qty = 999;

    // cuántas unidades hay que comprar cuando el producto falta
    $want = (int) ($in['want'] ?? 0);
    if ($want < 0)   $want = 0;
    if ($want > 999) $want = 999;

    $updatedAt = (int) ($in['updatedAt'] ?? 0);
    if ($updatedAt <= 0) $updatedAt = (int) round(microtime(true) * 1000);

    return [
        'name'      => cut($name, 80),
        'qty'       => $qty,
        'want'      => $want,
        'note'      => cut(trim((string) ($in['note'] ?? '')), 120),
        'deleted'   => !empty($in['deleted']),
        'updatedAt' => $updatedAt,
        'updatedBy' => cut(preg_replace('/[^A-Za-z0-9_.\- ]/', '', (string) ($in['updatedBy'] ?? '')), 20),
    ];
}

function cleanId(string $id): ?string
{
    $id = preg_replace('/[^A-Za-z0-9_\-]/', '', $id);
    return ($id === '' || strlen($id) > 40) ? null : $id;
}

function readStore(string $raw): array
{
    $d = json_decode($raw, true);
    if (!is_array($d) || !isset($d['items']) || !is_array($d['items'])) {
        return ['items' => []];
    }
    return ['items' => $d['items']];
}

/* ---------- LEER: devuelve la lista entera ---------- */
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $store = is_file($DATA_FILE)
        ? readStore((string) file_get_contents($DATA_FILE))
        : ['items' => []];

    echo json_encode([
        'items' => (object) $store['items'],
        'user'  => currentUser(),
        'now'   => (int) round(microtime(true) * 1000),
    ]);
    exit;
}

/* ---------- GUARDAR: fusiona los cambios recibidos ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > MAX_BODY) {
        http_response_code(413);
        echo json_encode(['error' => 'size']);
        exit;
    }

    $body = json_decode($raw, true);
    if (!is_array($body) || !isset($body['items']) || !is_array($body['items'])) {
        http_response_code(400);
        echo json_encode(['error' => 'json']);
        exit;
    }

    $user = currentUser();

    // Abrimos con bloqueo: mientras fusionamos, nadie más escribe.
    $fh = @fopen($DATA_FILE, 'c+');
    if ($fh === false) {
        http_response_code(500);
        echo json_encode(['error' => 'open', 'hint' => 'La carpeta necesita permisos de escritura para PHP.']);
        exit;
    }
    if (!flock($fh, LOCK_EX)) {
        fclose($fh);
        http_response_code(500);
        echo json_encode(['error' => 'lock']);
        exit;
    }

    $store = readStore((string) stream_get_contents($fh));
    $items = $store['items'];

    // Fusión: para cada producto, gana la versión con fecha más reciente.
    foreach ($body['items'] as $rawId => $rawItem) {
        if (!is_array($rawItem)) continue;
        $id = cleanId((string) $rawId);
        if ($id === null) continue;

        $item = cleanItem($rawItem);
        if ($item === null) continue;

        if ($item['updatedBy'] === '' && $user !== '') {
            $item['updatedBy'] = $user;
        }

        $old = $items[$id] ?? null;
        if (!is_array($old) || (int) ($old['updatedAt'] ?? 0) <= $item['updatedAt']) {
            $items[$id] = $item;
        }
    }

    // Olvidar borrados antiguos para que el fichero no crezca sin fin.
    $limit = (int) round(microtime(true) * 1000) - (TOMBSTONE_DAYS * 86400000);
    foreach ($items as $id => $it) {
        if (!empty($it['deleted']) && (int) ($it['updatedAt'] ?? 0) < $limit) {
            unset($items[$id]);
        }
    }

    // Tope de seguridad: si se desmadra, conservamos los más recientes.
    if (count($items) > MAX_ITEMS) {
        uasort($items, fn($a, $b) => (int) ($b['updatedAt'] ?? 0) <=> (int) ($a['updatedAt'] ?? 0));
        $items = array_slice($items, 0, MAX_ITEMS, true);
    }

    $out = json_encode(['items' => (object) $items], JSON_UNESCAPED_UNICODE);
    if ($out === false) {
        flock($fh, LOCK_UN);
        fclose($fh);
        http_response_code(500);
        echo json_encode(['error' => 'encode']);
        exit;
    }

    ftruncate($fh, 0);
    rewind($fh);
    $written = fwrite($fh, $out);
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);

    if ($written === false) {
        http_response_code(500);
        echo json_encode(['error' => 'write', 'hint' => 'La carpeta necesita permisos de escritura para PHP.']);
        exit;
    }

    // Devolvemos la lista ya fusionada para que el móvil se ponga al día al instante.
    echo json_encode([
        'items' => json_decode($out, true)['items'] ?: (object) [],
        'user'  => $user,
        'now'   => (int) round(microtime(true) * 1000),
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method']);
