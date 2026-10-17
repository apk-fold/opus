package fr.naviviolet.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioManager;
import android.net.Uri;
import android.os.SystemClock;
import android.view.KeyEvent;
import android.widget.RemoteViews;

// Widget d'écran d'accueil Opus : titre en cours, précédent / lecture-pause / suivant,
// et accès direct au Flow, au hors-ligne et à la recherche.
// Les boutons de lecture envoient une touche média : Android la transmet à la session média active
// (celle d'Opus quand il joue). Les raccourcis ouvrent l'appli avec un lien opus://….
public class OpusWidget extends AppWidgetProvider {

    static final String PREFS = "opus_widget";
    static final String ACT_TOGGLE = "fr.naviviolet.app.widget.TOGGLE";
    static final String ACT_NEXT = "fr.naviviolet.app.widget.NEXT";
    static final String ACT_PREV = "fr.naviviolet.app.widget.PREV";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        RemoteViews v = build(ctx);
        for (int id : ids) mgr.updateAppWidget(id, v);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        String a = intent.getAction();
        int key = -1;
        if (ACT_TOGGLE.equals(a)) key = KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE;
        else if (ACT_NEXT.equals(a)) key = KeyEvent.KEYCODE_MEDIA_NEXT;
        else if (ACT_PREV.equals(a)) key = KeyEvent.KEYCODE_MEDIA_PREVIOUS;
        if (key == -1) return;
        AudioManager am = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
        if (am == null) return;
        long now = SystemClock.uptimeMillis();
        am.dispatchMediaKeyEvent(new KeyEvent(now, now, KeyEvent.ACTION_DOWN, key, 0));
        am.dispatchMediaKeyEvent(new KeyEvent(now, now, KeyEvent.ACTION_UP, key, 0));
    }

    static RemoteViews build(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.opus_widget);
        String artist = p.getString("artist", "");
        v.setTextViewText(R.id.w_title, p.getString("title", "Opus"));
        v.setTextViewText(R.id.w_artist, artist == null || artist.isEmpty() ? "Touche pour ouvrir" : artist);
        v.setImageViewResource(R.id.w_toggle, p.getBoolean("playing", false) ? R.drawable.w_pause : R.drawable.w_play);
        v.setOnClickPendingIntent(R.id.w_prev, broadcast(ctx, ACT_PREV, 1));
        v.setOnClickPendingIntent(R.id.w_toggle, broadcast(ctx, ACT_TOGGLE, 2));
        v.setOnClickPendingIntent(R.id.w_next, broadcast(ctx, ACT_NEXT, 3));
        v.setOnClickPendingIntent(R.id.w_info, activity(ctx, "opus://player", 10));
        v.setOnClickPendingIntent(R.id.w_flow, activity(ctx, "opus://flow", 11));
        v.setOnClickPendingIntent(R.id.w_offline, activity(ctx, "opus://offline", 12));
        v.setOnClickPendingIntent(R.id.w_search, activity(ctx, "opus://search", 13));
        return v;
    }

    static PendingIntent broadcast(Context ctx, String action, int code) {
        Intent i = new Intent(ctx, OpusWidget.class);
        i.setAction(action);
        return PendingIntent.getBroadcast(ctx, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static PendingIntent activity(Context ctx, String uri, int code) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(uri), ctx, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, OpusWidget.class));
        if (ids == null || ids.length == 0) return;
        mgr.updateAppWidget(ids, build(ctx));
    }
}
