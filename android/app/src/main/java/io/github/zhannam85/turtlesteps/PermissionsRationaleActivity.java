package io.github.zhannam85.turtlesteps;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

/**
 * #656 — Health Connect requires an activity reachable from its permission
 * screen's privacy-policy link (see AndroidManifest.xml's comment on why
 * two declarations exist). Rather than duplicate the app's real privacy
 * copy (#312) natively, this just opens the actual deployed /privacy page
 * and finishes — no UI of its own.
 */
public class PermissionsRationaleActivity extends Activity {

    private static final String PRIVACY_POLICY_URL =
        "https://zhannam85.github.io/turtle-steps-to-the-goal/privacy";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(PRIVACY_POLICY_URL)));
        finish();
    }
}
