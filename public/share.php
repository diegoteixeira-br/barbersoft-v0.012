<?php
$slug = isset($_GET['slug']) ? $_GET['slug'] : '';

if (empty($slug)) {
    header('Location: /blog');
    exit;
}

$slug = preg_replace('/[^a-zA-Z0-9\-_]/', '', $slug);

// Detect crawlers in PHP directly — redirect real users immediately
$userAgent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
$isCrawler = preg_match('/facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|telegrambot|slackbot|discordbot|bot|crawler|spider|preview/i', $userAgent);

if (!$isCrawler) {
    // Real user — redirect straight to the blog post, no need to call edge function
    header('Location: /blog/' . $slug);
    exit;
}

// Crawler — fetch OG metadata HTML from Edge Function
$apiUrl = 'https://lgrugpsyewvinlkgmeve.supabase.co/functions/v1/blog-share?slug=' . urlencode($slug);

$html = false;

// Try file_get_contents
$context = stream_context_create([
    'http' => [
        'timeout' => 10,
        'follow_location' => 0,
        'header' => "Accept: text/html\r\nUser-Agent: " . $userAgent . "\r\n"
    ]
]);
$html = @file_get_contents($apiUrl, false, $context);

// Fallback to cURL
if ($html === false && function_exists('curl_init')) {
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: text/html']);
    curl_setopt($ch, CURLOPT_USERAGENT, $userAgent);
    $html = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        $html = false;
    }
}

if ($html === false || strlen(trim($html)) === 0) {
    // Fallback: redirect to blog post
    header('Location: /blog/' . $slug);
    exit;
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: public, max-age=3600');
echo $html;
