<?php
/* Helper de un solo uso para activar la zona privada en OVH.
   Imprime la línea AuthUserFile con la ruta absoluta correcta del servidor.
   1) Sube todo a OVH.
   2) Visita https://TUDOMINIO/_path.php
   3) Copia la línea que imprime y pégala en apps/.htaccess sustituyendo
      la línea AuthUserFile "/home/CAMBIAME/apps/.htpasswd".
   4) BORRA este archivo (_path.php) cuando termines. */
header('Content-Type: text/plain; charset=utf-8');
echo 'AuthUserFile "' . __DIR__ . '/apps/.htpasswd"' . "\n";
