<?php
/* ==========================================================================
   Almacén compartido de "Mi biblioteca".
   Guarda y devuelve un JSON en el servidor, para que todos los dispositivos
   vean y editen lo mismo. Súbelo a la MISMA carpeta que index.html.
   ========================================================================== */
declare(strict_types=1);

// 1) Cambia este token por algo tuyo y pon EXACTAMENTE el mismo en script.js
$TOKEN = 'CAMBIA-ESTE-TOKEN-secreto';

// 2) Fichero donde se guardan los datos (se crea solo en el primer guardado)
$DATA_FILE = __DIR__ . '/library-data.json';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

/* ---- LEER ---- */
if ($method === 'GET') {
    if (is_file($DATA_FILE)) {
        readfile($DATA_FILE);
    } else {
        echo '{}'; // aún no hay nada guardado
    }
    exit;
}

/* ---- GUARDAR ---- */
if ($method === 'POST') {
    $sent = $_SERVER['HTTP_X_LIB_TOKEN'] ?? '';
    if (!hash_equals($TOKEN, $sent)) {
        http_response_code(403);
        echo json_encode(['error' => 'token']);
        exit;
    }

    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 4000000) { // límite ~4 MB
        http_response_code(413);
        echo json_encode(['error' => 'size']);
        exit;
    }

    // Validar que es JSON correcto antes de escribir
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        http_response_code(400);
        echo json_encode(['error' => 'json']);
        exit;
    }

    // Escritura atómica (escribe a temporal y renombra)
    $tmp = $DATA_FILE . '.tmp';
    if (file_put_contents($tmp, $raw, LOCK_EX) === false || !@rename($tmp, $DATA_FILE)) {
        http_response_code(500);
        echo json_encode(['error' => 'write', 'hint' => 'La carpeta necesita permisos de escritura para PHP.']);
        exit;
    }

    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method']);
