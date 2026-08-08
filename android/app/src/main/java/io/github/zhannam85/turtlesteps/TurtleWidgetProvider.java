package io.github.zhannam85.turtlesteps;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * #606 — home-screen glance widget. Reads the same "CapacitorStorage"
 * SharedPreferences file @capacitor/preferences writes to from JS
 * (src/shared/native/widgetDataSync.ts), rather than a custom native
 * plugin — the widget only ever needs to read a small pre-formatted JSON
 * snapshot, no two-way native API surface.
 */
public class TurtleWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "CapacitorStorage";
    private static final String SNAPSHOT_KEY = "widgetSnapshot";
    /**
     * Set on the tap PendingIntent's extras; MainActivity#handleWidgetTap
     * turns this into a "navigate to Day" request the JS side picks up on
     * next resume (see widgetDataSync.ts's OPEN_DAY_REQUESTED_KEY doc
     * comment for why this doesn't just evaluateJavascript directly).
     */
    static final String EXTRA_OPEN_DAY = "openDay";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    /** Called from MainActivity#onPause so a "log something, go home" flow refreshes promptly. */
    static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, TurtleWidgetProvider.class);
        int[] widgetIds = manager.getAppWidgetIds(provider);
        for (int widgetId : widgetIds) {
            updateWidget(context, manager, widgetId);
        }
    }

    private static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_turtle_glance);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(SNAPSHOT_KEY, null);

        String weightText = "—";
        String remainingKcalText = null;

        if (raw != null) {
            try {
                JSONObject snapshot = new JSONObject(raw);
                if (!snapshot.isNull("weightText")) {
                    weightText = snapshot.getString("weightText");
                }
                if (!snapshot.isNull("remainingKcalText")) {
                    remainingKcalText = snapshot.getString("remainingKcalText");
                }
            } catch (JSONException ignored) {
                // Corrupt/unexpected snapshot — fall back to the "not logged" defaults above.
            }
        }

        views.setTextViewText(R.id.widget_weight, weightText);
        if (remainingKcalText != null) {
            views.setViewVisibility(R.id.widget_remaining_kcal, View.VISIBLE);
            views.setTextViewText(R.id.widget_remaining_kcal, remainingKcalText);
        } else {
            views.setViewVisibility(R.id.widget_remaining_kcal, View.GONE);
        }

        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launchIntent.putExtra(EXTRA_OPEN_DAY, true);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
