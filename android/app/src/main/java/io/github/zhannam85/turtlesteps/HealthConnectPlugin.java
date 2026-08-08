package io.github.zhannam85.turtlesteps;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContract;
import androidx.health.connect.client.HealthConnectClient;
import androidx.health.connect.client.PermissionController;
import androidx.health.connect.client.permission.HealthPermission;
import androidx.health.connect.client.records.WeightRecord;
import androidx.health.connect.client.request.ReadRecordsRequest;
import androidx.health.connect.client.response.ReadRecordsResponse;
import androidx.health.connect.client.time.TimeRangeFilter;
import androidx.health.connect.client.units.Mass;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import kotlin.jvm.JvmClassMappingKt;
import kotlinx.coroutines.BuildersKt;
import kotlinx.coroutines.Dispatchers;

/**
 * #656 — bridges Health Connect (a Kotlin-coroutine-based API with no
 * Java-friendly wrapper) to JS. Suspend functions (readRecords) are
 * bridged via BuildersKt.runBlocking on Dispatchers.IO — Health Connect
 * reads are fast local IPC, not network calls, and Capacitor already
 * dispatches @PluginMethod calls off the main thread, so this doesn't
 * risk an ANR. JvmClassMappingKt.getKotlinClass bridges a plain Java
 * Class into the KClass Health Connect's Kotlin-first generics expect.
 *
 * The permission request itself needs no such bridge:
 * PermissionController.createRequestPermissionResultContract() is a
 * plain static Java-callable factory for an ActivityResultContract,
 * registered once in load() via Bridge#registerForActivityResult (a
 * fully generic method — not just the two contract types Capacitor's
 * own @ActivityCallback/@PermissionCallback annotations wire up
 * automatically, which don't cover a third-party contract like this).
 */
@CapacitorPlugin(name = "HealthConnect")
public class HealthConnectPlugin extends Plugin {

    private static final String PROVIDER_PACKAGE = "com.google.android.apps.healthdata";

    private ActivityResultLauncher<Set<String>> permissionLauncher;
    private PluginCall pendingPermissionCall;

    @Override
    public void load() {
        ActivityResultContract<Set<String>, Set<String>> contract =
            PermissionController.createRequestPermissionResultContract();
        permissionLauncher = getBridge().registerForActivityResult(contract, grantedPermissions -> {
            PluginCall call = pendingPermissionCall;
            pendingPermissionCall = null;
            if (call == null) {
                return;
            }
            JSObject result = new JSObject();
            result.put("granted", grantedPermissions.contains(HealthPermission.READ_WEIGHT));
            call.resolve(result);
        });
    }

    @PluginMethod
    public void getAvailability(PluginCall call) {
        int status = HealthConnectClient.getSdkStatus(getContext(), PROVIDER_PACKAGE);
        String statusString;
        if (status == HealthConnectClient.SDK_AVAILABLE) {
            statusString = "available";
        } else if (status == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
            statusString = "updateRequired";
        } else {
            statusString = "unavailable";
        }
        JSObject result = new JSObject();
        result.put("status", statusString);
        call.resolve(result);
    }

    @PluginMethod
    public void openHealthConnectInstall(PluginCall call) {
        Uri marketUri = Uri.parse("market://details?id=" + PROVIDER_PACKAGE);
        try {
            getContext().startActivity(new Intent(Intent.ACTION_VIEW, marketUri));
        } catch (ActivityNotFoundException e) {
            Uri webUri = Uri.parse("https://play.google.com/store/apps/details?id=" + PROVIDER_PACKAGE);
            getContext().startActivity(new Intent(Intent.ACTION_VIEW, webUri));
        }
        call.resolve();
    }

    @PluginMethod
    public void requestWeightPermission(PluginCall call) {
        pendingPermissionCall = call;
        Set<String> permissions = new HashSet<>();
        permissions.add(HealthPermission.READ_WEIGHT);
        permissionLauncher.launch(permissions);
    }

    @PluginMethod
    public void syncTodayWeight(PluginCall call) {
        try {
            HealthConnectClient client = HealthConnectClient.getOrCreate(getContext(), PROVIDER_PACKAGE);
            LocalDateTime startOfToday = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
            // ascendingOrder=false + pageSize=1 fetches just the latest
            // reading directly, no client-side sort/max needed.
            ReadRecordsRequest<WeightRecord> request = new ReadRecordsRequest<>(
                JvmClassMappingKt.getKotlinClass(WeightRecord.class),
                TimeRangeFilter.between(startOfToday, LocalDateTime.now()),
                Collections.emptySet(),
                false,
                1,
                null
            );
            ReadRecordsResponse<WeightRecord> response = BuildersKt.runBlocking(
                Dispatchers.getIO(),
                (scope, continuation) -> client.readRecords(request, continuation)
            );

            List<WeightRecord> records = response.getRecords();
            JSObject result = new JSObject();
            if (!records.isEmpty()) {
                Mass weight = records.get(0).getWeight();
                result.put("weightKg", weight.getKilograms());
            }
            call.resolve(result);
        } catch (SecurityException e) {
            call.reject("Health Connect permission not granted", "not_permitted");
        } catch (Exception e) {
            call.reject("Failed to read from Health Connect: " + e.getMessage(), e);
        }
    }
}
