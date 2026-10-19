package fr.naviviolet.app;

import android.content.ComponentName;
import android.content.Context;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import androidx.core.content.ContextCompat;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.PlaybackParameters;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionToken;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.common.util.concurrent.ListenableFuture;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONObject;

// Pont web → lecteur natif (OpusPlaybackService). Le web décrit la file ; ExoPlayer la joue.
@UnstableApi
@CapacitorPlugin(name = "OpusNative")
public class OpusNativePlugin extends Plugin {
    private final Handler main = new Handler(Looper.getMainLooper());
    private final List<Runnable> waiting = new ArrayList<>();
    private ListenableFuture<MediaController> future;
    private MediaController ctl;
    private float base = 1f;
    private float gain = 1f;
    private Runnable sleepTask;

    // ---------- connexion au service (thread principal) ----------
    private void ensure() {
        if (future != null) return;
        Context ctx = getContext().getApplicationContext();
        SessionToken token = new SessionToken(ctx, new ComponentName(ctx, OpusPlaybackService.class));
        future = new MediaController.Builder(ctx, token).buildAsync();
        future.addListener(() -> {
            try {
                ctl = future.get();
                ctl.addListener(listener);
                List<Runnable> todo = new ArrayList<>(waiting);
                waiting.clear();
                for (Runnable r : todo) r.run();
            } catch (Exception e) {
                future = null;
                waiting.clear();
            }
        }, ContextCompat.getMainExecutor(ctx));
    }

    private void run(PluginCall call, Runnable r) {
        main.post(() -> {
            ensure();
            Runnable guarded = () -> {
                try { r.run(); if (call != null) call.resolve(); }
                catch (Exception e) { if (call != null) call.reject(String.valueOf(e.getMessage())); }
            };
            if (ctl != null) guarded.run(); else waiting.add(guarded);
        });
    }

    // ---------- état ----------
    private JSObject snap() {
        JSObject o = new JSObject();
        if (ctl == null) return o;
        long dur = ctl.getDuration();
        MediaItem m = ctl.getCurrentMediaItem();
        o.put("playing", ctl.isPlaying());
        o.put("wanted", ctl.getPlayWhenReady());
        o.put("state", ctl.getPlaybackState());
        o.put("pos", Math.max(0, ctl.getCurrentPosition()));
        o.put("dur", dur == C.TIME_UNSET ? -1 : dur);
        o.put("idx", ctl.getCurrentMediaItemIndex());
        o.put("count", ctl.getMediaItemCount());
        o.put("id", m == null ? "" : m.mediaId);
        return o;
    }

    private void applyVolume(MediaItem m) {
        float g = 1f;
        if (m != null && m.mediaMetadata.extras != null) g = m.mediaMetadata.extras.getFloat("gain", 1f);
        gain = g;
        if (ctl != null) ctl.setVolume(Math.max(0f, Math.min(1f, base * g)));
    }

    private final Player.Listener listener = new Player.Listener() {
        @Override public void onIsPlayingChanged(boolean isPlaying) { notifyListeners("state", snap()); }
        @Override public void onPlayWhenReadyChanged(boolean pw, int reason) { notifyListeners("state", snap()); }
        @Override public void onPlaybackStateChanged(int state) { notifyListeners("state", snap()); }
        @Override public void onMediaItemTransition(MediaItem item, int reason) {
            applyVolume(item);
            JSObject o = snap();
            o.put("reason", reason);
            notifyListeners("transition", o);
        }
        @Override public void onPositionDiscontinuity(Player.PositionInfo a, Player.PositionInfo b, int reason) {
            if (reason == Player.DISCONTINUITY_REASON_SEEK) notifyListeners("state", snap());
        }
        @Override public void onPlayerError(PlaybackException e) {
            JSObject o = snap();
            o.put("error", e.getErrorCodeName() + " : " + e.getMessage());
            notifyListeners("error", o);
        }
    };

    private MediaItem build(JSONObject o) throws Exception {
        MediaMetadata.Builder md = new MediaMetadata.Builder()
            .setTitle(o.optString("title", ""))
            .setArtist(o.optString("artist", ""))
            .setAlbumTitle(o.optString("album", ""))
            .setIsPlayable(true)
            .setIsBrowsable(false);
        String art = o.optString("art", "");
        if (!art.isEmpty()) md.setArtworkUri(Uri.parse(art));
        long d = (long) (o.optDouble("duration", 0) * 1000);
        if (d > 0) md.setDurationMs(d);
        android.os.Bundle ex = new android.os.Bundle();
        ex.putFloat("gain", (float) o.optDouble("gain", 1.0));
        md.setExtras(ex);
        return new MediaItem.Builder()
            .setMediaId(o.getString("id"))
            .setUri(Uri.parse(o.getString("uri")))
            .setMediaMetadata(md.build())
            .build();
    }

    // ---------- commandes ----------
    @PluginMethod
    public void load(PluginCall call) {
        run(call, () -> {
            try {
                MediaItem mi = build(call.getObject("item"));
                boolean play = Boolean.TRUE.equals(call.getBoolean("play", true));
                double start = call.getDouble("startMs", 0.0);
                ctl.setRepeatMode(Player.REPEAT_MODE_OFF);
                ctl.setMediaItem(mi, start > 0 ? (long) start : C.TIME_UNSET);
                applyVolume(mi);
                ctl.prepare();
                ctl.setPlayWhenReady(play);
            } catch (Exception e) { throw new RuntimeException(e); }
        });
    }

    // Remplace ce qui suit (et précède) le titre en cours, sans l'interrompre.
    @PluginMethod
    public void setUpcoming(PluginCall call) {
        run(call, () -> {
            try {
                String expect = call.getString("expect", "");
                MediaItem cur = ctl.getCurrentMediaItem();
                if (cur == null || !cur.mediaId.equals(expect)) return;
                List<MediaItem> next = new ArrayList<>();
                JSArray arr = call.getArray("items");
                if (arr != null) for (int i = 0; i < arr.length(); i++) next.add(build(arr.getJSONObject(i)));
                JSObject prevObj = call.getObject("prev");
                int idx = ctl.getCurrentMediaItemIndex();
                int n = ctl.getMediaItemCount();
                if (idx + 1 < n) ctl.removeMediaItems(idx + 1, n);
                if (idx > 0) ctl.removeMediaItems(0, idx);
                if (prevObj != null && prevObj.length() > 0) ctl.addMediaItem(0, build(prevObj));
                if (!next.isEmpty()) ctl.addMediaItems(next);
                int mode = call.getInt("repeat", 0);
                ctl.setRepeatMode(mode == 1 ? Player.REPEAT_MODE_ONE : mode == 2 ? Player.REPEAT_MODE_ALL : Player.REPEAT_MODE_OFF);
            } catch (Exception e) { throw new RuntimeException(e); }
        });
    }

    @PluginMethod public void play(PluginCall call) { run(call, () -> { if (ctl.getPlaybackState() == Player.STATE_IDLE && ctl.getMediaItemCount() > 0) ctl.prepare(); ctl.play(); }); }
    @PluginMethod public void pause(PluginCall call) { run(call, () -> ctl.pause()); }
    @PluginMethod public void stop(PluginCall call) { run(call, () -> { ctl.stop(); ctl.clearMediaItems(); }); }
    @PluginMethod public void seek(PluginCall call) { run(call, () -> ctl.seekTo((long) (double) call.getDouble("ms", 0.0))); }

    @PluginMethod
    public void setVolume(PluginCall call) {
        run(call, () -> {
            float v = (float) (double) call.getDouble("v", 1.0);
            float g = (float) (double) call.getDouble("gain", 1.0);
            gain = g;
            base = g > 0.0001f ? v / g : v;
            ctl.setVolume(Math.max(0f, Math.min(1f, v)));
        });
    }

    @PluginMethod
    public void setSpeed(PluginCall call) {
        run(call, () -> ctl.setPlaybackParameters(new PlaybackParameters((float) (double) call.getDouble("rate", 1.0), 1f)));
    }

    // Minuterie de sommeil exécutée côté natif (fiable écran éteint). at = date en ms, 0 = annuler.
    @PluginMethod
    public void setSleepAt(PluginCall call) {
        final double at = call.getDouble("at", 0.0);
        run(call, () -> {
            if (sleepTask != null) { main.removeCallbacks(sleepTask); sleepTask = null; }
            if (at > 0) {
                long delay = Math.max(0, (long) at - System.currentTimeMillis());
                sleepTask = () -> { if (ctl != null) ctl.pause(); };
                main.postDelayed(sleepTask, delay);
            }
        });
    }

    @PluginMethod
    public void snapshot(PluginCall call) {
        main.post(() -> {
            ensure();
            if (ctl != null) call.resolve(snap()); else call.resolve(new JSObject());
        });
    }

    @Override
    protected void handleOnDestroy() {
        try { if (future != null) MediaController.releaseFuture(future); } catch (Exception ignored) { }
    }
}
