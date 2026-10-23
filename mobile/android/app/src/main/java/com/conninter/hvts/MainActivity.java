package com.conninter.hvts;

import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/**
 * Capacitor shell: phone Back walks WebView history.
 * Live marketing homepage {@code https://www.conninter.com/} is rewritten to Welcome
 * {@code /app/}. Local Capacitor pages ({@code localhost} splash/onboarding) are never rewritten.
 * Hospital gate QR codes (conninter://gate/<branchId>, com.conninter.hvts://gate/<branchId>,
 * and https://www.conninter.com/gate/<branchId>) open directly in the in-app gate view.
 */
public class MainActivity extends BridgeActivity {

    private static final String LIVE_WELCOME = "https://www.conninter.com/app/";

    private static String liveWelcomeUrl() {
        return LIVE_WELCOME + "?native=1&_cb=" + System.currentTimeMillis();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                goBackOrBackground();
            }
        });

        WebView webView = bridgeWebView();
        if (webView != null && getBridge() != null) {
            webView.clearCache(true);
            webView.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
            webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    Uri url = request.getUrl();
                    if (isLiveMarketingHome(url)) {
                        view.loadUrl(liveWelcomeUrl());
                        return true;
                    }
                    return super.shouldOverrideUrlLoading(view, request);
                }

                @Override
                public void onPageStarted(WebView view, String url, Bitmap favicon) {
                    if (isLiveMarketingHome(url)) {
                        view.stopLoading();
                        view.loadUrl(liveWelcomeUrl());
                        return;
                    }
                    super.onPageStarted(view, url, favicon);
                }
            });
        }

        handleDeepLinkIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLinkIntent(intent);
    }

    private void handleDeepLinkIntent(Intent intent) {
        if (intent == null) return;
        Uri uri = intent.getData();
        if (uri == null) return;

        String targetUrl = resolveDeepLinkUrl(uri);
        if (targetUrl != null) {
            WebView webView = bridgeWebView();
            if (webView != null) {
                webView.post(() -> webView.loadUrl(targetUrl));
            }
        }
    }

    /**
     * Resolves an incoming QR deep link (intent, custom scheme, or https) into the
     * full in-app URL with ?native=1 so the gate screen loads directly inside the shell.
     */
    private String resolveDeepLinkUrl(Uri uri) {
        if (uri == null) return null;
        String scheme = uri.getScheme();
        if (scheme == null) return null;
        scheme = scheme.toLowerCase();

        // 1. Custom URL scheme: conninter://gate/<branchId> or com.conninter.hvts://gate/<branchId>
        if ("conninter".equals(scheme) || "com.conninter.hvts".equals(scheme)) {
            String host = uri.getHost();
            if ("gate".equalsIgnoreCase(host)) {
                String path = uri.getPath();
                if (path != null && !path.isEmpty()) {
                    String branchId = path.startsWith("/") ? path.substring(1) : path;
                    if (!branchId.isEmpty()) {
                        return "https://www.conninter.com/gate/" + branchId + "/?native=1&_cb=" + System.currentTimeMillis();
                    }
                }
            } else if (host != null && !host.isEmpty()) {
                String path = uri.getPath() != null ? uri.getPath() : "";
                return "https://www.conninter.com/" + host + path + "?native=1&_cb=" + System.currentTimeMillis();
            }
        }

        // 2. HTTPS/HTTP App Links: https://www.conninter.com/gate/<branchId>/
        if ("https".equals(scheme) || "http".equals(scheme)) {
            String host = uri.getHost();
            if (host != null) {
                String h = host.toLowerCase();
                if (h.startsWith("www.")) h = h.substring(4);
                if ("conninter.com".equals(h) || h.endsWith(".vercel.app")) {
                    String path = uri.getPath();
                    if (path != null && path.startsWith("/gate")) {
                        Uri.Builder builder = uri.buildUpon().scheme("https").authority("www.conninter.com");
                        if (uri.getQueryParameter("native") == null) {
                            builder.appendQueryParameter("native", "1");
                        }
                        builder.appendQueryParameter("_cb", String.valueOf(System.currentTimeMillis()));
                        return builder.build().toString();
                    }
                }
            }
        }
        return null;
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN) {
            int keyCode = event.getKeyCode();
            if (keyCode == KeyEvent.KEYCODE_FORWARD || keyCode == KeyEvent.KEYCODE_MEDIA_NEXT) {
                WebView webView = bridgeWebView();
                if (webView != null && webView.canGoForward()) {
                    webView.goForward();
                    return true;
                }
            }
        }
        return super.dispatchKeyEvent(event);
    }

    private void goBackOrBackground() {
        WebView webView = bridgeWebView();
        if (webView != null) {
            // Welcome `/app/` is the in-app home — never walk back to marketing `/`.
            if (isLiveAppHome(webView.getUrl())) {
                moveTaskToBack(true);
                return;
            }
            if (webView.canGoBack()) {
                webView.goBack();
                return;
            }
        }
        moveTaskToBack(true);
    }

    /** Live Welcome screen (role chooser) — treated as the mobile app home. */
    private static boolean isLiveAppHome(String url) {
        if (url == null || url.isEmpty()) return false;
        try {
            Uri uri = Uri.parse(url);
            String host = uri.getHost();
            if (host == null) return false;
            String h = host.toLowerCase();
            if (h.startsWith("www.")) {
                h = h.substring(4);
            }
            if (!h.equals("conninter.com") && !h.endsWith(".vercel.app")) {
                return false;
            }
            String path = uri.getPath();
            if (path == null || path.isEmpty()) {
                return false;
            }
            while (path.length() > 1 && path.endsWith("/")) {
                path = path.substring(0, path.length() - 1);
            }
            return path.equals("/app");
        } catch (Exception ignored) {
            return false;
        }
    }

    private WebView bridgeWebView() {
        return getBridge() != null ? getBridge().getWebView() : null;
    }

    /** Only the live Conninter marketing site — never Capacitor localhost shell pages. */
    private static boolean isLiveMarketingHome(Uri uri) {
        if (uri == null) return false;
        String host = uri.getHost();
        if (host == null) return false;
        String h = host.toLowerCase();
        if (h.startsWith("www.")) {
            h = h.substring(4);
        }
        // Local splash / onboarding (capacitor androidScheme) must load as-is.
        if (h.equals("localhost") || h.equals("127.0.0.1") || h.endsWith(".local")) {
            return false;
        }
        if (!h.equals("conninter.com") && !h.endsWith(".vercel.app")) {
            return false;
        }
        String path = uri.getPath();
        if (path == null || path.isEmpty()) {
            path = "/";
        }
        while (path.length() > 1 && path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        return path.equals("/") || path.isEmpty();
    }

    private static boolean isLiveMarketingHome(String url) {
        if (url == null || url.isEmpty()) return false;
        try {
            return isLiveMarketingHome(Uri.parse(url));
        } catch (Exception ignored) {
            return false;
        }
    }
}
