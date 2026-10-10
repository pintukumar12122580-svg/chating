<?php
/**
 * Play game — Single-file PHP API
 * Works on localhost (XAMPP/WAMP) and any PHP hosting (InfinityFree etc.)
 */

// ── CORS & Headers ────────────────────────────────────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Paths ─────────────────────────────────────────────────────────────────────
define('BASE',    __DIR__);
define('DATA_DIR', BASE . '/data');
define('APK_DIR',  BASE . '/apk');
define('ICON_DIR', BASE . '/uploads/icons');
define('SS_DIR',   BASE . '/uploads/screenshots');
define('DB_FILE',  DATA_DIR . '/data.json');

// Create folders if missing
foreach ([DATA_DIR, APK_DIR, ICON_DIR, SS_DIR] as $dir) {
    if (!is_dir($dir)) mkdir($dir, 0755, true);
}

// ── Data helpers ──────────────────────────────────────────────────────────────
function readDB() {
    if (!file_exists(DB_FILE)) { writeDB(defaultDB()); return defaultDB(); }
    $raw = file_get_contents(DB_FILE);
    $d   = json_decode($raw, true);
    return $d ?: defaultDB();
}

function writeDB($d) {
    file_put_contents(DB_FILE, json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function defaultDB() {
    return [
        'appInfo' => [
            'appName'         => 'Play game',
            'developerName'   => 'Knight Studios',
            'description'     => 'An epic medieval strategy and action game. Command your knights, conquer kingdoms, and rise to glory in this immersive fantasy world. Featuring rich graphics, smooth gameplay, and unlimited adventure.',
            'version'         => '1.0.0',
            'size'            => '45 MB',
            'ageRating'       => '3+',
            'category'        => 'Games',
            'containsAds'     => false,
            'inAppPurchases'  => false,
            'iconFile'        => null,
            'apkFileName'     => null,
            'apkUrl'          => null,
            'apkUploadedAt'   => null,
            'apkFileSizeBytes'=> null,
            'downloadCount'   => 5000,
        ],
        'reviews' => [
            ['id'=>1,'userName'=>'Rahul Sharma','rating'=>5,'comment'=>'Amazing game! Graphics are stunning. Must play!','createdAt'=>'2025-03-22T10:00:00Z'],
            ['id'=>2,'userName'=>'Priya Verma', 'rating'=>4,'comment'=>'Really good medieval game. Love the knight characters!','createdAt'=>'2025-03-20T10:00:00Z'],
            ['id'=>3,'userName'=>'Amit Patel',  'rating'=>5,'comment'=>'Best game I played this year! Epic battles.','createdAt'=>'2025-03-18T10:00:00Z'],
        ],
        'screenshots' => [],
        'nextId' => 4,
    ];
}

function jsonOut($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function bodyJson() {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

// ── Router ────────────────────────────────────────────────────────────────────
$action = $_GET['action'] ?? '';

switch ($action) {

// ── GET data ──────────────────────────────────────────────────────────────────
case 'get_data':
    jsonOut(readDB());

// ── Update app info ───────────────────────────────────────────────────────────
case 'update_info':
    $body = bodyJson();
    $d    = readDB();
    $allowed = ['appName','developerName','description','version','size',
                'ageRating','category','containsAds','inAppPurchases'];
    foreach ($allowed as $k) {
        if (array_key_exists($k, $body)) $d['appInfo'][$k] = $body[$k];
    }
    writeDB($d);
    jsonOut(['ok' => true]);

// ── Upload APK ────────────────────────────────────────────────────────────────
case 'upload_apk':
    if (empty($_FILES['apk']) || $_FILES['apk']['error'] !== UPLOAD_ERR_OK) {
        $errCode = $_FILES['apk']['error'] ?? 'no file';
        $errMsg  = [
            UPLOAD_ERR_INI_SIZE   => 'File too large (server limit). Try a smaller APK or use "APK by URL" option.',
            UPLOAD_ERR_FORM_SIZE  => 'File too large (form limit). Use "APK by URL" option for big files.',
            UPLOAD_ERR_PARTIAL    => 'Upload incomplete. Try again.',
            UPLOAD_ERR_NO_FILE    => 'No file received.',
        ];
        jsonOut(['error' => $errMsg[$errCode] ?? 'Upload failed (code '.$errCode.')'], 400);
    }
    $origName = basename($_FILES['apk']['name']);
    $safeName = preg_replace('/[^a-zA-Z0-9._\-]/', '_', $origName);
    $dest     = APK_DIR . '/' . $safeName;
    if (!move_uploaded_file($_FILES['apk']['tmp_name'], $dest)) {
        jsonOut(['error' => 'Could not save file. Check folder permissions.'], 500);
    }
    $d = readDB();
    $d['appInfo']['apkFileName']      = $safeName;
    $d['appInfo']['apkUrl']           = null; // clear any external URL
    $d['appInfo']['apkUploadedAt']    = date('c');
    $d['appInfo']['apkFileSizeBytes'] = filesize($dest);
    writeDB($d);
    jsonOut(['ok' => true, 'fileName' => $safeName, 'sizeBytes' => filesize($dest)]);

// ── Set APK by external URL ───────────────────────────────────────────────────
case 'set_apk_url':
    $body = bodyJson();
    if (empty($body['url'])) jsonOut(['error' => 'url required'], 400);
    $url  = trim($body['url']);
    if (!filter_var($url, FILTER_VALIDATE_URL)) jsonOut(['error' => 'Invalid URL'], 400);
    $d = readDB();
    // Delete old local APK file if it exists
    if (!empty($d['appInfo']['apkFileName'])) {
        $oldFile = APK_DIR . '/' . $d['appInfo']['apkFileName'];
        if (file_exists($oldFile)) unlink($oldFile);
    }
    $d['appInfo']['apkFileName']      = null;
    $d['appInfo']['apkUrl']           = $url;
    $d['appInfo']['apkUploadedAt']    = date('c');
    $d['appInfo']['apkFileSizeBytes'] = null;
    writeDB($d);
    jsonOut(['ok' => true, 'url' => $url]);

// ── Delete APK ────────────────────────────────────────────────────────────────
case 'delete_apk':
    $d = readDB();
    // Delete local file if it exists
    if (!empty($d['appInfo']['apkFileName'])) {
        $fp = APK_DIR . '/' . $d['appInfo']['apkFileName'];
        if (file_exists($fp)) unlink($fp);
    }
    $d['appInfo']['apkFileName']      = null;
    $d['appInfo']['apkUrl']           = null;
    $d['appInfo']['apkUploadedAt']    = null;
    $d['appInfo']['apkFileSizeBytes'] = null;
    writeDB($d);
    jsonOut(['ok' => true]);

// ── Count download (called by frontend for external URL, no redirect) ─────────
case 'count_download':
    $d = readDB();
    $d['appInfo']['downloadCount'] = ($d['appInfo']['downloadCount'] ?? 0) + 1;
    writeDB($d);
    jsonOut(['ok' => true]);

// ── Download APK ──────────────────────────────────────────────────────────────
case 'download_apk':
    $d = readDB();
    // External URL — proxy download (user stays on our page, no redirect)
    if (!empty($d['appInfo']['apkUrl'])) {
        $d['appInfo']['downloadCount'] = ($d['appInfo']['downloadCount'] ?? 0) + 1;
        writeDB($d);
        $url   = $d['appInfo']['apkUrl'];
        $fname = 'game.apk';
        header('Content-Type: application/vnd.android.package-archive');
        header('Content-Disposition: attachment; filename="' . $fname . '"');
        header('Cache-Control: no-cache');
        header('X-Accel-Buffering: no');
        if (function_exists('curl_init')) {
            // Stream via cURL (follows redirects automatically)
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_MAXREDIRS      => 10,
                CURLOPT_RETURNTRANSFER => false,
                CURLOPT_HEADER         => false,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                CURLOPT_BUFFERSIZE     => 128 * 1024,
            ]);
            curl_exec($ch);
            curl_close($ch);
        } else {
            // Fallback: file_get_contents (for servers without cURL)
            $ctx = stream_context_create(['http' => [
                'follow_location' => true,
                'user_agent'      => 'Mozilla/5.0',
            ]]);
            readfile($url, false, $ctx);
        }
        exit;
    }
    // Local file
    if (!$d['appInfo']['apkFileName']) { http_response_code(404); echo 'No APK'; exit; }
    $fp = APK_DIR . '/' . $d['appInfo']['apkFileName'];
    if (!file_exists($fp)) { http_response_code(404); echo 'File missing'; exit; }
    $d['appInfo']['downloadCount'] = ($d['appInfo']['downloadCount'] ?? 0) + 1;
    writeDB($d);
    header('Content-Type: application/vnd.android.package-archive');
    header('Content-Disposition: attachment; filename="' . $d['appInfo']['apkFileName'] . '"');
    header('Content-Length: ' . filesize($fp));
    header('Cache-Control: no-cache');
    readfile($fp);
    exit;

// ── Upload icon ───────────────────────────────────────────────────────────────
case 'upload_icon':
    if (empty($_FILES['icon']) || $_FILES['icon']['error'] !== UPLOAD_ERR_OK) {
        jsonOut(['error' => 'No icon file received'], 400);
    }
    $ext  = strtolower(pathinfo($_FILES['icon']['name'], PATHINFO_EXTENSION));
    $allowed = ['jpg','jpeg','png','webp','gif'];
    if (!in_array($ext, $allowed)) jsonOut(['error' => 'Invalid image type'], 400);
    $name = 'icon.' . $ext;
    if (!move_uploaded_file($_FILES['icon']['tmp_name'], ICON_DIR . '/' . $name)) {
        jsonOut(['error' => 'Could not save icon'], 500);
    }
    $d = readDB();
    $d['appInfo']['iconFile'] = 'uploads/icons/' . $name . '?v=' . time();
    writeDB($d);
    jsonOut(['ok' => true, 'iconUrl' => $d['appInfo']['iconFile']]);

// ── Upload screenshot ─────────────────────────────────────────────────────────
case 'upload_screenshot':
    if (empty($_FILES['screenshot']) || $_FILES['screenshot']['error'] !== UPLOAD_ERR_OK) {
        jsonOut(['error' => 'No screenshot file received'], 400);
    }
    $ext  = strtolower(pathinfo($_FILES['screenshot']['name'], PATHINFO_EXTENSION));
    $name = 'ss-' . time() . '-' . rand(100,999) . '.' . $ext;
    if (!move_uploaded_file($_FILES['screenshot']['tmp_name'], SS_DIR . '/' . $name)) {
        jsonOut(['error' => 'Could not save screenshot'], 500);
    }
    $d  = readDB();
    $ss = ['id' => $d['nextId']++, 'url' => 'uploads/screenshots/' . $name, 'caption' => null, 'createdAt' => date('c')];
    $d['screenshots'][] = $ss;
    writeDB($d);
    jsonOut($ss, 201);

// ── Add screenshot by URL ─────────────────────────────────────────────────────
case 'add_screenshot_url':
    $body = bodyJson();
    if (empty($body['url'])) jsonOut(['error' => 'url required'], 400);
    $d  = readDB();
    $ss = ['id' => $d['nextId']++, 'url' => $body['url'], 'caption' => $body['caption'] ?? null, 'createdAt' => date('c')];
    $d['screenshots'][] = $ss;
    writeDB($d);
    jsonOut($ss, 201);

// ── Add review ────────────────────────────────────────────────────────────────
case 'add_review':
    $body = bodyJson();
    if (empty($body['userName']) || empty($body['rating']) || empty($body['comment'])) {
        jsonOut(['error' => 'Missing fields'], 400);
    }
    $d = readDB();
    $r = ['id' => $d['nextId']++, 'userName' => $body['userName'], 'rating' => (int)$body['rating'], 'comment' => $body['comment'], 'createdAt' => date('c')];
    array_unshift($d['reviews'], $r);
    writeDB($d);
    jsonOut($r, 201);

// ── Delete review ─────────────────────────────────────────────────────────────
case 'delete_review':
    $body = bodyJson();
    $id   = (int)($body['id'] ?? 0);
    $d    = readDB();
    $d['reviews'] = array_values(array_filter($d['reviews'], fn($r) => $r['id'] !== $id));
    writeDB($d);
    jsonOut(['ok' => true]);

// ── Delete screenshot ─────────────────────────────────────────────────────────
case 'delete_screenshot':
    $body = bodyJson();
    $id   = (int)($body['id'] ?? 0);
    $d    = readDB();
    foreach ($d['screenshots'] as $ss) {
        if ($ss['id'] === $id && !empty($ss['url']) && strpos($ss['url'], 'http') !== 0) {
            $fp = BASE . '/' . $ss['url'];
            if (file_exists($fp)) unlink($fp);
        }
    }
    $d['screenshots'] = array_values(array_filter($d['screenshots'], fn($s) => $s['id'] !== $id));
    writeDB($d);
    jsonOut(['ok' => true]);

// ── Default ───────────────────────────────────────────────────────────────────
default:
    jsonOut(['error' => 'Unknown action'], 404);
}
