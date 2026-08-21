package ru.kinohub.tv;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.Toast;

public final class MainActivity extends Activity {
    private WebView webView;
    private Uri appOrigin;
    private boolean serverDialogVisible;
    private static final String PREFS = "kinohub_tv";
    private static final String SERVER_URL = "server_url";

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );

        String savedUrl = getSharedPreferences(PREFS, MODE_PRIVATE)
            .getString(SERVER_URL, null);
        appOrigin = Uri.parse(savedUrl == null ? BuildConfig.KINOHUB_URL : savedUrl);
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
        settings.setUserAgentString(settings.getUserAgentString() + " KinoHubTV/0.2");

        webView.setWebViewClient(new KinoHubClient());
        setContentView(webView);

        if (state == null && savedUrl == null) showServerDialog(true);
        else if (state == null) webView.loadUrl(appOrigin.toString());
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
        webView.evaluateJavascript(
            "(function(){var e=new Event('kinohub-back',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;})()",
            handled -> {
                if ("true".equals(handled)) return;
                if (webView.canGoBack()) webView.goBack();
                else finish();
            }
        );
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
            if (request.isForMainFrame() && "kinohub-settings".equals(uri.getScheme())) {
                showServerDialog(false);
                return true;
            }
            if (request.isForMainFrame() && isAppUrl(uri)) return false;
            if (request.isForMainFrame()) openExternal(uri, null);
            return true;
        }

        @Override
        public void onReceivedError(
            WebView view,
            WebResourceRequest request,
            WebResourceError error
        ) {
            super.onReceivedError(view, request, error);
            if (request.isForMainFrame()) showServerDialog(false);
        }
    }

    private void showServerDialog(boolean firstLaunch) {
        if (serverDialogVisible || isFinishing()) return;
        serverDialogVisible = true;
        EditText input = new EditText(this);
        input.setSingleLine(true);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        input.setText(appOrigin.toString());
        input.setSelectAllOnFocus(true);
        int padding = (int) (24 * getResources().getDisplayMetrics().density);
        input.setPadding(padding, padding / 2, padding, padding / 2);

        AlertDialog dialog = new AlertDialog.Builder(this)
            .setTitle(firstLaunch ? "Адрес KinoHub" : "Изменить адрес KinoHub")
            .setMessage("Укажите IP или адрес сервера, например http://192.168.0.120:4100/")
            .setView(input)
            .setPositiveButton("Сохранить", null)
            .setNegativeButton(firstLaunch ? "Оставить текущий" : "Отмена", null)
            .create();
        dialog.setOnDismissListener(ignored -> serverDialogVisible = false);
        dialog.setOnShowListener(ignored -> {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(button -> {
                Uri candidate = normalizeServerUrl(input.getText().toString());
                if (candidate == null) {
                    input.setError("Введите HTTP-адрес с IP или именем сервера");
                    return;
                }
                saveAndLoadServer(candidate);
                dialog.dismiss();
            });
            dialog.getButton(AlertDialog.BUTTON_NEGATIVE).setOnClickListener(button -> {
                if (firstLaunch) saveAndLoadServer(appOrigin);
                dialog.dismiss();
            });
            input.requestFocus();
        });
        dialog.show();
    }

    private Uri normalizeServerUrl(String value) {
        String normalized = value.trim();
        if (!normalized.contains("://")) normalized = "http://" + normalized;
        Uri uri = Uri.parse(normalized);
        if (!("http".equals(uri.getScheme()) || "https".equals(uri.getScheme()))) return null;
        if (uri.getHost() == null || uri.getHost().isEmpty()) return null;
        if (!normalized.endsWith("/")) normalized += "/";
        return Uri.parse(normalized);
    }

    private void saveAndLoadServer(Uri uri) {
        appOrigin = uri;
        getSharedPreferences(PREFS, MODE_PRIVATE)
            .edit()
            .putString(SERVER_URL, uri.toString())
            .apply();
        webView.clearHistory();
        webView.loadUrl(uri.toString());
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
