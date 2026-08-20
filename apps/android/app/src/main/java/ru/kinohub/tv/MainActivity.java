package ru.kinohub.tv;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public final class MainActivity extends Activity {
    private WebView webView;
    private Uri appOrigin;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );

        appOrigin = Uri.parse(BuildConfig.KinoHub_URL);
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(8, 11, 18));
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setUserAgentString(settings.getUserAgentString() + " KinoHubTV/0.1");

        webView.setWebViewClient(new KinoHubClient());
        setContentView(webView);

        if (state == null) webView.loadUrl(BuildConfig.KinoHub_URL);
        else webView.restoreState(state);
        webView.requestFocus();
    }

    @Override
    protected void onSaveInstanceState(Bundle state) {
        webView.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        webView.destroy();
        super.onDestroy();
    }

    private boolean isAppUrl(Uri uri) {
        return uri != null
            && ("http".equals(uri.getScheme()) || "https".equals(uri.getScheme()))
            && appOrigin.getHost() != null
            && appOrigin.getHost().equalsIgnoreCase(uri.getHost())
            && appOrigin.getPort() == uri.getPort();
    }

    private final class KinoHubClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (request.isForMainFrame() && "kinohub-player".equals(uri.getScheme())) {
                openPlayerUri(uri);
                return true;
            }
            if (request.isForMainFrame() && isAppUrl(uri)) return false;
            if (request.isForMainFrame()) openExternal(uri, null);
            return true;
        }
    }

    private void openPlayerUri(Uri request) {
        String rawUrl = request.getQueryParameter("url");
        if (rawUrl == null) {
            showMessage("KinoHub получил пустую ссылку");
            return;
        }
        Uri uri = Uri.parse(rawUrl);
        if (!("http".equals(uri.getScheme()) || "https".equals(uri.getScheme()))) {
            showMessage("KinoHub отклонил небезопасную ссылку");
            return;
        }
        String mimeType = "application/x-mpegURL".equals(request.getQueryParameter("mime"))
            ? "application/x-mpegURL"
            : "video/*";
        openExternal(uri, mimeType);
    }

    private void openExternal(Uri uri, String mimeType) {
        Intent intent = new Intent(Intent.ACTION_VIEW);
        if (mimeType == null) intent.setData(uri);
        else intent.setDataAndType(uri, mimeType);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            startActivity(Intent.createChooser(intent, "Смотреть через…"));
        } catch (ActivityNotFoundException error) {
            showMessage("Не найден подходящий плеер");
        }
    }

    private void showMessage(String message) {
        runOnUiThread(() -> Toast.makeText(this, message, Toast.LENGTH_LONG).show());
    }
}
