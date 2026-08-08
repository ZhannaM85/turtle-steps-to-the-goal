package io.github.zhannam85.turtlesteps;

import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // #308/#648: draw the WebView edge-to-edge behind both system bars
        // and make them transparent so the app's own CSS background (mood/
        // light-dark themed) shows through, instead of a fixed native
        // color. Android 15+ (this app's targetSdk) already enforces
        // edge-to-edge by default; setting it explicitly keeps the same
        // look on older OS versions too (minSdk 24) -- confirmed live on a
        // physical device running below API 35, where without this the
        // nav bar stayed a solid native-themed strip regardless of the
        // app's own dark mode. Bars' icon color is kept readable as the
        // in-app theme changes via @capacitor/core's built-in SystemBars
        // plugin (src/shared/native/nativeChrome.ts) -- a custom
        // ThemeBridgePlugin previously hand-rolled the same thing before
        // #648 found Capacitor already ships it, cross-platform.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        handleWidgetTap(getIntent());
    }

    // #606 — the widget's PendingIntent targets this singleTask activity
    // directly, so an already-running instance gets onNewIntent rather than
    // a fresh onCreate; handle both so "tap opens Day" works whether the
    // app was already open (e.g. left on Settings) or fully closed.
    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleWidgetTap(intent);
    }

    @Override
    public void onPause() {
        super.onPause();
        // Covers the realistic "log something, return to the home screen to
        // glance at the widget" flow promptly, on top of the widget's own
        // updatePeriodMillis backstop (Android's enforced ~30 min minimum).
        TurtleWidgetProvider.updateAllWidgets(this);
    }

    // Writes a flag to the same SharedPreferences file widgetDataSync.ts
    // reads/writes, rather than calling into the WebView's JS directly —
    // see that file's OPEN_DAY_REQUESTED_KEY doc comment for why (a real
    // race against the WebView's own JS not being loaded/listening yet on
    // a cold start).
    private void handleWidgetTap(Intent intent) {
        if (intent == null || !intent.getBooleanExtra(TurtleWidgetProvider.EXTRA_OPEN_DAY, false)) {
            return;
        }
        SharedPreferences prefs = getSharedPreferences("CapacitorStorage", MODE_PRIVATE);
        prefs.edit().putString("widgetOpenDayRequested", "true").apply();
    }
}
