package io.github.zhannam85.turtlesteps;

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
    }
}
