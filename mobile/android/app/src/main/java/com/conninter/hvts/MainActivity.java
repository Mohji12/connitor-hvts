package com.conninter.hvts;

import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/**
 * Capacitor shell: phone Back walks WebView history.
 * Live marketing homepage {@code https://www.conninter.com/} is rewritten to Welcome
 * {@code /app/}. Local Capacitor pages ({@code localhost} splash/onboarding) are never rewritten.
 */
public class MainActivity extends BridgeActivity {

    private static final String LIVE_WELCOME = "https://www.conninter.com/app/";

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
            webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    Uri url = request.getUrl();
                    if (isLiveMarketingHome(url)) {
                        view.loadUrl(LIVE_WELCOME);
                        return true;
                    }
                    return super.shouldOverrideUrlLoading(view, request);
                }

                @Override
                public void onPageStarted(WebView view, String url, Bitmap favicon) {
                    if (isLiveMarketingHome(url)) {
                        view.stopLoading();
                        view.loadUrl(LIVE_WELCOME);
                        return;
                    }
                    super.onPageStarted(view, url, favicon);
                }
            });
        }
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
