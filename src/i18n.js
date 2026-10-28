// Lightweight, offline-first UI localization shared by the apk-fold applications.
// Source strings remain the French UI text; unknown strings safely fall back to French.
const LOCALES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
];

const ROWS = [
  ['Langue de l’interface','Interface language','Idioma de la interfaz','Sprache der Oberfläche','Lingua dell’interfaccia','Idioma da interface'],
  ['Accueil','Home','Inicio','Startseite','Home','Início'],
  ['Bibliothèque','Library','Biblioteca','Bibliothek','Libreria','Biblioteca'],
  ['Albums','Albums','Álbumes','Alben','Album','Álbuns'],
  ['Artistes','Artists','Artistas','Künstler','Artisti','Artistas'],
  ['Playlists','Playlists','Listas de reproducción','Playlists','Playlist','Playlists'],
  ['Plus','More','Más','Mehr','Altro','Mais'],
  ['Rechercher','Search','Buscar','Suchen','Cerca','Pesquisar'],
  ['Rechercher…','Search…','Buscar…','Suchen…','Cerca…','Pesquisar…'],
  ['Favoris','Favorites','Favoritos','Favoriten','Preferiti','Favoritos'],
  ['Genres','Genres','Géneros','Genres','Generi','Gêneros'],
  ['Radios','Radios','Radios','Radios','Radio','Rádios'],
  ['Hors-ligne','Offline','Sin conexión','Offline','Offline','Offline'],
  ['Réglages','Settings','Ajustes','Einstellungen','Impostazioni','Configurações'],
  ['Paramètres','Settings','Configuración','Einstellungen','Impostazioni','Configurações'],
  ['Personnalisation','Customization','Personalización','Personalisierung','Personalizzazione','Personalização'],
  ['Apparence','Appearance','Apariencia','Erscheinungsbild','Aspetto','Aparência'],
  ['Couleurs','Colors','Colores','Farben','Colori','Cores'],
  ['Police','Font','Fuente','Schriftart','Carattere','Fonte'],
  ['Affichage','Display','Visualización','Anzeige','Visualizzazione','Exibição'],
  ['Données','Data','Datos','Daten','Dati','Dados'],
  ['Sauvegarde','Backup','Copia de seguridad','Sicherung','Backup','Backup'],
  ['Sauvegardes','Backups','Copias de seguridad','Sicherungen','Backup','Backups'],
  ['Synchronisation','Synchronization','Sincronización','Synchronisierung','Sincronizzazione','Sincronização'],
  ['Synchroniser','Sync','Sincronizar','Synchronisieren','Sincronizza','Sincronizar'],
  ['À propos','About','Acerca de','Über','Informazioni','Sobre'],
  ['Enregistrer','Save','Guardar','Speichern','Salva','Salvar'],
  ['Annuler','Cancel','Cancelar','Abbrechen','Annulla','Cancelar'],
  ['Fermer','Close','Cerrar','Schließen','Chiudi','Fechar'],
  ['Supprimer','Delete','Eliminar','Löschen','Elimina','Excluir'],
  ['Modifier','Edit','Editar','Bearbeiten','Modifica','Editar'],
  ['Ajouter','Add','Añadir','Hinzufügen','Aggiungi','Adicionar'],
  ['Créer','Create','Crear','Erstellen','Crea','Criar'],
  ['Importer','Import','Importar','Importieren','Importa','Importar'],
  ['Exporter','Export','Exportar','Exportieren','Esporta','Exportar'],
  ['Historique','History','Historial','Verlauf','Cronologia','Histórico'],
  ['Résumé','Summary','Resumen','Zusammenfassung','Riepilogo','Resumo'],
  ['Missions','Jobs','Misiones','Aufträge','Missioni','Missões'],
  ['Aujourd’hui','Today','Hoy','Heute','Oggi','Hoje'],
  ['Continuer','Continue','Continuar','Weiter','Continua','Continuar'],
  ['Retour','Back','Atrás','Zurück','Indietro','Voltar'],
  ['Oui','Yes','Sí','Ja','Sì','Sim'],
  ['Non','No','No','Nein','No','Não'],
  ['Valider','Confirm','Confirmar','Bestätigen','Conferma','Confirmar'],
  ['Langue','Language','Idioma','Sprache','Lingua','Idioma'],
  ['Thème','Theme','Tema','Thema','Tema','Tema'],
  ['Sombre','Dark','Oscuro','Dunkel','Scuro','Escuro'],
  ['Noir (AMOLED)','Black (AMOLED)','Negro (AMOLED)','Schwarz (AMOLED)','Nero (AMOLED)','Preto (AMOLED)'],
  ['Clair','Light','Claro','Hell','Chiaro','Claro'],
  ['Auto','Auto','Automático','Automatisch','Automatico','Automático'],
  ['Couleur principale','Main color','Color principal','Hauptfarbe','Colore principale','Cor principal'],
  ['Couleurs des majorations','Overtime colors','Colores de recargos','Zuschlagsfarben','Colori delle maggiorazioni','Cores dos adicionais'],
  ['Taille du texte','Text size','Tamaño del texto','Textgröße','Dimensione del testo','Tamanho do texto'],
  ['Animations','Animations','Animaciones','Animationen','Animazioni','Animações'],
  ['Vibrations','Haptics','Vibraciones','Vibrationen','Vibrazioni','Vibrações'],
  ['Confirmer','Confirm','Confirmar','Bestätigen','Conferma','Confirmar'],
  ['Réinitialiser','Reset','Restablecer','Zurücksetzen','Reimposta','Redefinir'],
  ['Réinitialiser l’apparence','Reset appearance','Restablecer apariencia','Erscheinungsbild zurücksetzen','Reimposta aspetto','Redefinir aparência'],
  ['Nom','Name','Nombre','Name','Nome','Nome'],
  ['Date','Date','Fecha','Datum','Data','Data'],
  ['Type','Type','Tipo','Typ','Tipo','Tipo'],
  ['Tout','All','Todo','Alle','Tutto','Tudo'],
  ['Documents','Documents','Documentos','Dokumente','Documenti','Documentos'],
  ['Classeurs','Spreadsheets','Hojas de cálculo','Tabellen','Fogli di calcolo','Planilhas'],
  ['Présentations','Presentations','Presentaciones','Präsentationen','Presentazioni','Apresentações'],
  ['Document','Document','Documento','Dokument','Documento','Documento'],
  ['Classeur','Spreadsheet','Hoja de cálculo','Tabelle','Foglio di calcolo','Planilha'],
  ['Présentation','Presentation','Presentación','Präsentation','Presentazione','Apresentação'],
  ['Traitement de texte','Word processing','Procesador de texto','Textverarbeitung','Elaborazione testi','Processador de texto'],
  ['Tableur et formules','Spreadsheet and formulas','Hoja de cálculo y fórmulas','Tabellenkalkulation und Formeln','Foglio di calcolo e formule','Planilha e fórmulas'],
  ['Diapositives','Slides','Diapositivas','Folien','Diapositive','Slides'],
  ['Aucun résultat.','No results.','Sin resultados.','Keine Ergebnisse.','Nessun risultato.','Nenhum resultado.'],
  ['Aucun fichier pour l’instant.','No files yet.','Todavía no hay archivos.','Noch keine Dateien.','Nessun file per ora.','Nenhum arquivo por enquanto.'],
  ['Aucun fichier pour l\'instant.','No files yet.','Todavía no hay archivos.','Noch keine Dateien.','Nessun file per ora.','Nenhum arquivo por enquanto.'],
  ['Format non pris en charge','Unsupported format','Formato no compatible','Nicht unterstütztes Format','Formato non supportato','Formato não compatível'],
  ['Connexion','Connection','Conexión','Verbindung','Connessione','Conexão'],
  ['Se connecter','Sign in','Iniciar sesión','Anmelden','Accedi','Entrar'],
  ['Serveur','Server','Servidor','Server','Server','Servidor'],
  ['Utilisateur','Username','Usuario','Benutzername','Nome utente','Usuário'],
  ['Mot de passe','Password','Contraseña','Passwort','Password','Senha'],
  ['Mot de passe maître','Master password','Contraseña maestra','Master-Passwort','Password principale','Senha mestra'],
  ['Coffres','Vaults','Bóvedas','Tresore','Cassaforti','Cofres'],
  ['Déverrouillage','Unlock','Desbloqueo','Entsperren','Sblocco','Desbloqueio'],
  ['Biométrie','Biometrics','Biometría','Biometrie','Biometria','Biometria'],
  ['Code PIN','PIN','PIN','PIN-Code','Codice PIN','Código PIN'],
  ['Corbeille','Trash','Papelera','Papierkorb','Cestino','Lixeira'],
  ['Verrouiller maintenant','Lock now','Bloquear ahora','Jetzt sperren','Blocca ora','Bloquear agora'],
  ['Jamais','Never','Nunca','Nie','Mai','Nunca'],
  ['Activé','Enabled','Activado','Aktiviert','Attivo','Ativado'],
  ['Désactivé','Disabled','Desactivado','Deaktiviert','Disattivato','Desativado'],
  ['Reprendre','Resume','Reanudar','Fortsetzen','Riprendi','Retomar'],
  ['Lecture','Playback','Reproducción','Wiedergabe','Riproduzione','Reprodução'],
  ['Téléchargements','Downloads','Descargas','Downloads','Download','Downloads'],
  ['Recherche','Search','Búsqueda','Suche','Ricerca','Pesquisa'],
  ['Nouvel onglet','New tab','Nueva pestaña','Neuer Tab','Nuova scheda','Nova aba'],
  ['Commandes rapides','Quick commands','Comandos rápidos','Schnellbefehle','Comandi rapidi','Comandos rápidos'],
  ['Terminal','Terminal','Terminal','Terminal','Terminale','Terminal'],
  ['Connexions','Connections','Conexiones','Verbindungen','Connessioni','Conexões'],
  ['SSH et clés','SSH and keys','SSH y claves','SSH und Schlüssel','SSH e chiavi','SSH e chaves'],
  ['Shell local','Local shell','Shell local','Lokale Shell','Shell locale','Shell local'],
  ['Clavier','Keyboard','Teclado','Tastatur','Tastiera','Teclado'],
  ['Rappel','Reminder','Recordatorio','Erinnerung','Promemoria','Lembrete'],
  ['Calculs et jours fériés','Calculations and public holidays','Cálculos y festivos','Berechnungen und Feiertage','Calcoli e festività','Cálculos e feriados'],
  ['Heures sup.','Overtime','Horas extra','Überstunden','Straordinari','Horas extras'],
  ['Nuit','Night','Noche','Nacht','Notte','Noite'],
  ['Dimanche','Sunday','Domingo','Sonntag','Domenica','Domingo'],
  ['Jours fériés','Public holidays','Festivos','Feiertage','Festività','Feriados'],
  ['Texte','Text','Texto','Text','Testo','Texto'],
  ['Police des titres','Heading font','Fuente de títulos','Schrift für Überschriften','Carattere dei titoli','Fonte dos títulos'],
  ['Police du texte','Body font','Fuente del texto','Fließtext-Schrift','Carattere del testo','Fonte do texto'],
  ['Formes et mouvements','Shapes and motion','Formas y movimiento','Formen und Bewegung','Forme e movimenti','Formas e movimentos'],
  ['Coins','Corners','Esquinas','Ecken','Angoli','Cantos'],
  ['Arrondis','Rounded','Redondeados','Abgerundet','Arrotondati','Arredondados'],
  ['Très arrondis','Very rounded','Muy redondeados','Stark abgerundet','Molto arrotondati','Muito arredondados'],
  ['Densité','Density','Densidad','Dichte','Densità','Densidade'],
  ['Confortable','Comfortable','Cómoda','Komfortabel','Confortevole','Confortável'],
  ['Compacte','Compact','Compacta','Kompakt','Compatta','Compacta'],
  ['Aucun titre trouvé','No tracks found','No se encontraron pistas','Keine Titel gefunden','Nessun brano trovato','Nenhuma faixa encontrada'],
  ['Changer de serveur','Change server','Cambiar de servidor','Server wechseln','Cambia server','Trocar de servidor'],
  ['Mix aléatoire','Random mix','Mezcla aleatoria','Zufallsmix','Mix casuale','Mix aleatório'],
  ['Bibliothèque vide','Empty library','Biblioteca vacía','Leere Bibliothek','Libreria vuota','Biblioteca vazia'],
  ['Ajoutés récemment','Recently added','Añadidos recientemente','Kürzlich hinzugefügt','Aggiunti di recente','Adicionados recentemente'],
  ['Écoutés récemment','Recently played','Escuchados recientemente','Kürzlich angehört','Ascoltati di recente','Ouvidos recentemente'],
  ['Les plus écoutés','Most played','Los más escuchados','Am häufigsten gespielt','I più ascoltati','Mais ouvidos'],
  ['Au hasard','Random','Al azar','Zufällig','Casuale','Aleatório'],
  ['Tes favoris','Your favorites','Tus favoritos','Deine Favoriten','I tuoi preferiti','Seus favoritos'],
  ['Bienvenue','Welcome','Te damos la bienvenida','Willkommen','Benvenuto','Boas-vindas'],
  ['Connecte-toi à ton serveur Navidrome.','Connect to your Navidrome server.','Conéctate a tu servidor Navidrome.','Verbinde dich mit deinem Navidrome-Server.','Connettiti al tuo server Navidrome.','Conecte-se ao seu servidor Navidrome.'],
  ['Créer mon coffre','Create my vault','Crear mi bóveda','Tresor erstellen','Crea la mia cassaforte','Criar meu cofre'],
  ['Restaurer une sauvegarde','Restore a backup','Restaurar una copia de seguridad','Sicherung wiederherstellen','Ripristina un backup','Restaurar um backup'],
  ['gestionnaire de mots de passe','password manager','gestor de contraseñas','Passwortmanager','gestore di password','gerenciador de senhas'],
  ['Générateur','Generator','Generador','Generator','Generatore','Gerador'],
  ['Générer','Generate','Generar','Generieren','Genera','Gerar'],
  ['Verrouiller','Lock','Bloquear','Sperren','Blocca','Bloquear'],
  ['Déverrouiller','Unlock','Desbloquear','Entsperren','Sblocca','Desbloquear'],
  ['Nom du thème','Theme name','Nombre del tema','Themenname','Nome del tema','Nome do tema'],
  ['Personnaliser les couleurs','Customize colors','Personalizar colores','Farben anpassen','Personalizza i colori','Personalizar cores'],
  ['Importer un thème','Import a theme','Importar un tema','Thema importieren','Importa un tema','Importar um tema'],
  ['Supprimer ce thème','Delete this theme','Eliminar este tema','Dieses Thema löschen','Elimina questo tema','Excluir este tema'],
  ['Thème personnel','Custom theme','Tema personalizado','Benutzerdefiniertes Thema','Tema personalizzato','Tema personalizado'],
  ['Interface','Interface','Interfaz','Oberfläche','Interfaccia','Interface'],
  ['Couleur d’accent','Accent color','Color de acento','Akzentfarbe','Colore accento','Cor de destaque'],
  ['Accent qui suit le thème','Accent follows theme','El acento sigue el tema','Akzent folgt dem Thema','L’accento segue il tema','A cor de destaque acompanha o tema'],
  ['Marge autour du texte','Text margin','Margen del texto','Textabstand','Margine del testo','Margem ao redor do texto'],
  ['Position des onglets','Tab position','Posición de las pestañas','Position der Tabs','Posizione delle schede','Posição das abas'],
  ['En haut','Top','Arriba','Oben','In alto','Em cima'],
  ['En bas','Bottom','Abajo','Unten','In basso','Embaixo'],
  ['Onglet actif, boutons, touches CTRL/ALT…','Active tab, buttons, CTRL/ALT keys…','Pestaña activa, botones, teclas CTRL/ALT…','Aktiver Tab, Schaltflächen, STRG/ALT-Tasten…','Scheda attiva, pulsanti, tasti CTRL/ALT…','Aba ativa, botões, teclas CTRL/ALT…'],
  ['Écrivez, calculez et présentez.','Write, calculate, and present.','Escribe, calcula y presenta.','Schreiben, rechnen und präsentieren.','Scrivi, calcola e presenta.','Escreva, calcule e apresente.'],
  ['Tout reste sur vos appareils et se synchronise sans serveur.','Everything stays on your devices and syncs without a server.','Todo permanece en tus dispositivos y se sincroniza sin servidor.','Alles bleibt auf deinen Geräten und synchronisiert sich ohne Server.','Tutto resta sui tuoi dispositivi e si sincronizza senza server.','Tudo fica nos seus dispositivos e sincroniza sem servidor.'],
  ['Créer un document','Create a document','Crear un documento','Dokument erstellen','Crea un documento','Criar documento'],
  ['Paramètres','Settings','Configuración','Einstellungen','Impostazioni','Configurações'],
  ['Enregistrer les modifications','Save changes','Guardar cambios','Änderungen speichern','Salva modifiche','Salvar alterações'],
  ['Appliquer','Apply','Aplicar','Anwenden','Applica','Aplicar'],
  ['Précédent','Previous','Anterior','Zurück','Precedente','Anterior'],
  ['Suivant','Next','Siguiente','Weiter','Successivo','Próximo'],
  ['Actualiser','Refresh','Actualizar','Aktualisieren','Aggiorna','Atualizar'],
  ['État','Status','Estado','Status','Stato','Status'],
  ['Reconnecter','Reconnect','Volver a conectar','Erneut verbinden','Riconnetti','Reconectar'],
  ['Aperçu','Preview','Vista previa','Vorschau','Anteprima','Pré-visualização'],
  ['Principal','Primary','Principal','Primär','Primario','Principal'],
  ['Secondaire','Secondary','Secundario','Sekundär','Secondario','Secundário'],
  ['Système','System','Sistema','System','Sistema','Sistema'],
  ['Système (Roboto)','System (Roboto)','Sistema (Roboto)','System (Roboto)','Sistema (Roboto)','Sistema (Roboto)'],
  ['Exporter les données','Export data','Exportar datos','Daten exportieren','Esporta dati','Exportar dados'],
  ['Importer des données','Import data','Importar datos','Daten importieren','Importa dati','Importar dados'],
  ['Sauvegarder','Save backup','Crear copia de seguridad','Sicherung erstellen','Crea backup','Fazer backup'],
  ['Annuler les modifications','Discard changes','Descartar cambios','Änderungen verwerfen','Annulla modifiche','Descartar alterações'],
  ['Chargement…','Loading…','Cargando…','Wird geladen…','Caricamento…','Carregando…'],
  ['Réessayer','Retry','Reintentar','Erneut versuchen','Riprova','Tentar novamente'],
  ['Erreur','Error','Error','Fehler','Errore','Erro'],
  ['Langue enregistrée','Language saved','Idioma guardado','Sprache gespeichert','Lingua salvata','Idioma salvo'],
];

const DICT = new Map(ROWS.map((row) => [row[0], Object.fromEntries(LOCALES.map((l, i) => [l.code, row[i + 1] || row[0]]))]));
const ORDERED = ROWS.slice().sort((a, b) => b[0].length - a[0].length);
const TEXT_STATE = new WeakMap();
const ATTR_STATE = new WeakMap();
let initialized = false;
let locale = 'fr';
let observer = null;
let exclusions = [];
let sourceToLocalized = null;

function escapeRegExp(value) {
  return value.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
}

function excluded(element) {
  if (!element || element.nodeType !== 1) return false;
  const selectors = ['script','style','noscript','textarea','input','code','pre','[contenteditable="true"]','[data-no-translate]','.xterm','.xterm-screen','.xterm-rows','.terminal-output','.command-output','.doc-page','.sheet-cell','.sheet-grid','.slides-canvas','.slide-content','.ProseMirror','.tiptap','.editor-content','.credential-name','.secret-value','.passphrase','.item-title','.item-subtitle','.vault-name','.doc-title','.mission-name','.mission-title','.entry-note','.user-text','.song-title','.artist-name','.album-title','.playlist-name','.track-title'].concat(exclusions);
  try { return !!element.closest(selectors.join(',')); } catch { return false; }
}

function capitalizeLike(source, target) {
  if (!source || !target) return target;
  const first = source.charAt(0);
  if (first && first === first.toLowerCase() && first !== first.toUpperCase()) return target.charAt(0).toLowerCase() + target.slice(1);
  return target;
}

function translateText(source, targetLocale) {
  const value = String(source || '');
  if (targetLocale === 'fr' || !value.trim()) return value;
  const leading = (value.match(/^\s*/) || [''])[0];
  const trailing = (value.match(/\s*$/) || [''])[0];
  const trimmed = value.slice(leading.length, value.length - trailing.length);
  const exact = DICT.get(trimmed);
  if (exact) return leading + (exact[targetLocale] || trimmed) + trailing;

  let output = trimmed;
  for (const row of ORDERED) {
    const key = row[0];
    const target = DICT.get(key)?.[targetLocale];
    if (!target || target === key || !output) continue;
    const regex = new RegExp('(^|[^\\p{L}\\p{N}])(' + escapeRegExp(key) + ')(?=$|[^\\p{L}\\p{N}])', 'giu');
    output = output.replace(regex, (_whole, prefix, found) => prefix + capitalizeLike(found, target));
  }
  return leading + output + trailing;
}

function translateTextNode(node) {
  if (!node || !node.parentElement || excluded(node.parentElement)) return;
  const current = node.nodeValue || '';
  let state = TEXT_STATE.get(node);
  if (!state || current !== state.output) {
    state = { source: current, output: current };
    TEXT_STATE.set(node, state);
  }
  const next = translateText(state.source, locale);
  if (next !== current) {
    state.output = next;
    TEXT_STATE.set(node, state);
    node.nodeValue = next;
  } else {
    state.output = current;
    TEXT_STATE.set(node, state);
  }
}

function translateAttributes(element) {
  if (!element || excluded(element)) return;
  const attrs = ['title', 'placeholder', 'aria-label'];
  let state = ATTR_STATE.get(element);
  if (!state) { state = new Map(); ATTR_STATE.set(element, state); }
  for (const attr of attrs) {
    const current = element.getAttribute(attr);
    if (current === null) continue;
    let item = state.get(attr);
    if (!item || current !== item.output) item = { source: current, output: current };
    const next = translateText(item.source, locale);
    if (next !== current) {
      item.output = next;
      element.setAttribute(attr, next);
    } else item.output = current;
    state.set(attr, item);
  }
}

function translateTree(root) {
  if (!root) return;
  if (root.nodeType === 3) { translateTextNode(root); return; }
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.nodeType === 1) {
    if (excluded(root)) return;
    translateAttributes(root);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) translateTextNode(node);
  if (root.querySelectorAll) {
    for (const element of root.querySelectorAll('*')) {
      if (!excluded(element)) translateAttributes(element);
    }
  }
}

function applyLocale(nextLocale) {
  locale = LOCALES.some((l) => l.code === nextLocale) ? nextLocale : 'fr';
  document.documentElement.lang = locale;
  const select = document.querySelector('#apk-fold-language-picker select');
  if (select) select.value = locale;
  translateTree(document.body);
}

function addPicker(appId) {
  const wrapper = document.createElement('label');
  wrapper.id = 'apk-fold-language-picker';
  wrapper.setAttribute('data-no-translate', '');
  wrapper.setAttribute('aria-label', 'Interface language');
  const icon = document.createElement('span');
  icon.textContent = '🌐';
  icon.setAttribute('aria-hidden', 'true');
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Langue de l’interface');
  for (const item of LOCALES) {
    const option = document.createElement('option');
    option.value = item.code;
    option.textContent = item.label;
    select.appendChild(option);
  }
  wrapper.append(icon, select);
  document.body.appendChild(wrapper);

  const style = document.createElement('style');
  style.id = 'apk-fold-language-picker-style';
  style.textContent = '#apk-fold-language-picker{position:fixed;left:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 82px);z-index:2147483000;display:flex;align-items:center;gap:6px;padding:5px 8px;color:#f8f7ff;background:rgba(22,18,32,.94);border:1px solid rgba(255,255,255,.2);border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.24);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);font:12px/1.25 system-ui,-apple-system,sans-serif;max-width:150px}#apk-fold-language-picker span{font-size:14px}#apk-fold-language-picker select{min-width:0;max-width:112px;color:inherit;background:transparent;border:0;outline:none;font:inherit;padding:2px 0}#apk-fold-language-picker option{color:#17131e;background:#fff}@media(min-width:800px){#apk-fold-language-picker{left:16px;bottom:16px}}@media(max-width:360px){#apk-fold-language-picker{left:6px;bottom:calc(env(safe-area-inset-bottom,0px) + 74px);padding:4px 6px}}';
  document.head.appendChild(style);
  select.addEventListener('change', () => {
    try { localStorage.setItem('apk-fold.language.' + appId, select.value); } catch {}
    applyLocale(select.value);
  });
}

export function initI18n(options = {}) {
  if (initialized || !document.body) return;
  initialized = true;
  exclusions = Array.isArray(options.exclude) ? options.exclude : [];
  const appId = String(options.app || 'app').replace(/[^a-z0-9_-]/gi, '-');
  let saved = '';
  try { saved = localStorage.getItem('apk-fold.language.' + appId) || ''; } catch {}
  const browserLanguage = String((navigator.languages && navigator.languages[0]) || navigator.language || 'fr').slice(0, 2).toLowerCase();
  locale = LOCALES.some((l) => l.code === saved) ? saved : (LOCALES.some((l) => l.code === browserLanguage) ? browserLanguage : 'fr');
  addPicker(appId);
  applyLocale(locale);
  observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') translateTextNode(record.target);
      else if (record.type === 'childList') record.addedNodes.forEach(translateTree);
      else if (record.type === 'attributes') translateAttributes(record.target);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title', 'placeholder', 'aria-label'] });
}
