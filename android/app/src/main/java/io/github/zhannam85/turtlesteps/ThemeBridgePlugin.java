package io.github.zhannam85.turtlesteps;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * #308 — Capacitor's own StatusBar plugin doesn't reliably cover Android:
 * its background/overlay APIs are Android-15+-unavailable and it has no
 * navigation-bar equivalent at all. Both system bars are made transparent
 * once, natively, in MainActivity.onCreate; this plugin instead keeps
 * their icon color readable as the in-app theme changes (Capacitor's
 * documented pattern for native code that doesn't warrant a published
 * package), driven from src/shared/native/nativeChrome.ts.
 */
@CapacitorPlugin(name = "ThemeBridge")
public class ThemeBridgePlugin extends Plugin {

    @PluginMethod
    public void setSystemBarsLight(PluginCall call) {
        boolean light = call.getBoolean("light", true);
        getActivity().runOnUiThread(() -> {
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
                getActivity().getWindow(),
                getActivity().getWindow().getDecorView()
            );
            controller.setAppearanceLightStatusBars(light);
            controller.setAppearanceLightNavigationBars(light);
        });
        call.resolve();
    }
}
