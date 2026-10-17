package fr.naviviolet.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Garde le processeur et le Wi-Fi éveillés pendant la lecture, pour que la musique ne se coupe pas
// écran éteint / application en arrière-plan, et permet de sortir l'appli de l'optimisation de batterie.
@CapacitorPlugin(name = "OpusKeepAlive")
public class OpusKeepAlivePlugin extends Plugin {
    private PowerManager.WakeLock cpu;
    private WifiManager.WifiLock wifi;

    @PluginMethod
    public void hold(PluginCall call) {
        try {
            Context ctx = getContext().getApplicationContext();
            if (cpu == null) {
                PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
                cpu = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "opus:playback");
                cpu.setReferenceCounted(false);
            }
            if (!cpu.isHeld()) cpu.acquire(6 * 60 * 60 * 1000L);
            if (wifi == null) {
                WifiManager wm = (WifiManager) ctx.getSystemService(Context.WIFI_SERVICE);
                wifi = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "opus:playback");
                wifi.setReferenceCounted(false);
            }
            if (!wifi.isHeld()) wifi.acquire();
        } catch (Exception ignored) { }
        call.resolve();
    }

    @PluginMethod
    public void release(PluginCall call) {
        try { if (cpu != null && cpu.isHeld()) cpu.release(); } catch (Exception ignored) { }
        try { if (wifi != null && wifi.isHeld()) wifi.release(); } catch (Exception ignored) { }
        call.resolve();
    }

    @PluginMethod
    public void batteryStatus(PluginCall call) {
        boolean ok = true;
        if (Build.VERSION.SDK_INT >= 23) {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            ok = pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        }
        JSObject r = new JSObject();
        r.put("unrestricted", ok);
        call.resolve(r);
    }

    @PluginMethod
    public void requestUnrestricted(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } catch (Exception e) {
            try {
                Intent i = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
            } catch (Exception ignored) { }
        }
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        try { if (cpu != null && cpu.isHeld()) cpu.release(); } catch (Exception ignored) { }
        try { if (wifi != null && wifi.isHeld()) wifi.release(); } catch (Exception ignored) { }
    }
}
