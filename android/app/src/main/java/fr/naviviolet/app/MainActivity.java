package fr.naviviolet.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

// Opus : enregistre le petit plugin natif du widget d'écran d'accueil (OpusWidgetPlugin).
// Les raccourcis de l'icône et le widget ouvrent l'appli avec un lien opus://… (géré côté web, gestures.js).
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OpusWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
