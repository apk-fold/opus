package fr.naviviolet.app;

import android.content.Context;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Pont web → widget : l'appli envoie le titre en cours et l'état lecture / pause (widget.js).
@CapacitorPlugin(name = "OpusWidget")
public class OpusWidgetPlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        Context ctx = getContext();
        Boolean playing = call.getBoolean("playing", false);
        ctx.getSharedPreferences(OpusWidget.PREFS, Context.MODE_PRIVATE).edit()
            .putString("title", call.getString("title", "Opus"))
            .putString("artist", call.getString("artist", ""))
            .putBoolean("playing", playing != null && playing)
            .apply();
        OpusWidget.refreshAll(ctx);
        call.resolve();
    }
}
