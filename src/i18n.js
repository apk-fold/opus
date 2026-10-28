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

const APP_ROWS = [
  ['Disque','Drive','Unidad','Laufwerk','Disco','Disco'],
  ['Découvrir','Discover','Descubrir','Entdecken','Scopri','Descobrir'],
  ['Nouveautés','New releases','Novedades','Neuerscheinungen','Novità','Novidades'],
  ['Écoutes récentes','Recently played','Reproducciones recientes','Kürzlich angehört','Ascoltati di recente','Tocadas recentemente'],
  ['Les plus joués','Most played','Más reproducidos','Am häufigsten gespielt','Più riprodotti','Mais tocados'],
  ['Lire','Play','Reproducir','Abspielen','Riproduci','Reproduzir'],
  ['Pause','Pause','Pausar','Pause','Pausa','Pausar'],
  ['Suivant','Next','Siguiente','Weiter','Successivo','Próximo'],
  ['Précédent','Previous','Anterior','Zurück','Precedente','Anterior'],
  ['Aléatoire','Shuffle','Aleatorio','Zufällig','Casuale','Aleatório'],
  ['Répéter','Repeat','Repetir','Wiederholen','Ripeti','Repetir'],
  ['Égaliseur','Equalizer','Ecualizador','Equalizer','Equalizzatore','Equalizador'],
  ['Paroles','Lyrics','Letras','Liedtexte','Testi','Letras'],
  ['File d’attente','Queue','Cola','Warteschlange','Coda','Fila'],
  ['Ajouter à la file d’attente','Add to queue','Añadir a la cola','Zur Warteschlange hinzufügen','Aggiungi alla coda','Adicionar à fila'],
  ['Mode hors-ligne','Offline mode','Modo sin conexión','Offline-Modus','Modalità offline','Modo offline'],
  ['Titres','Tracks','Pistas','Titel','Brani','Faixas'],
  ['Pistes','Tracks','Pistas','Titel','Brani','Faixas'],
  ['Aucun album','No albums','No hay álbumes','Keine Alben','Nessun album','Nenhum álbum'],
  ['Aucun titre','No tracks','No hay pistas','Keine Titel','Nessun brano','Nenhuma faixa'],
  ['Changer de serveur','Change server','Cambiar de servidor','Server wechseln','Cambia server','Trocar de servidor'],
  ['Bienvenue','Welcome','Te damos la bienvenida','Willkommen','Benvenuto','Boas-vindas'],
  ['Coffre','Vault','Bóveda','Tresor','Cassaforte','Cofre'],
  ['Créer un coffre','Create a vault','Crear una bóveda','Tresor erstellen','Crea una cassaforte','Criar um cofre'],
  ['Créer mon coffre','Create my vault','Crear mi bóveda','Meinen Tresor erstellen','Crea la mia cassaforte','Criar meu cofre'],
  ['Déverrouiller','Unlock','Desbloquear','Entsperren','Sblocca','Desbloquear'],
  ['Mot de passe principal','Master password','Contraseña maestra','Master-Passwort','Password principale','Senha mestra'],
  ['Générateur','Generator','Generador','Generator','Generatore','Gerador'],
  ['Générer un mot de passe','Generate a password','Generar una contraseña','Passwort generieren','Genera una password','Gerar uma senha'],
  ['Identifiants','Logins','Credenciales','Anmeldedaten','Credenziali','Credenciais'],
  ['Carte bancaire','Payment card','Tarjeta bancaria','Zahlungskarte','Carta di pagamento','Cartão bancário'],
  ['Notes sécurisées','Secure notes','Notas seguras','Sichere Notizen','Note sicure','Notas seguras'],
  ['Aucun élément','No items','No hay elementos','Keine Einträge','Nessun elemento','Nenhum item'],
  ['Aucun élément pour l’instant.','No items yet.','Todavía no hay elementos.','Noch keine Einträge.','Ancora nessun elemento.','Nenhum item ainda.'],
  ['Créer un élément','Create item','Crear elemento','Eintrag erstellen','Crea elemento','Criar item'],
  ['Nouveau mot de passe','New password','Nueva contraseña','Neues Passwort','Nuova password','Nova senha'],
  ['Remplissage automatique','Autofill','Autorrelleno','Automatisches Ausfüllen','Compilazione automatica','Preenchimento automático'],
  ['Verrouillage automatique','Auto-lock','Bloqueo automático','Automatische Sperre','Blocco automatico','Bloqueio automático'],
  ['Confidentialité','Privacy','Privacidad','Datenschutz','Privacy','Privacidade'],
  ['Presse-papiers','Clipboard','Portapapeles','Zwischenablage','Appunti','Área de transferência'],
  ['Nouvelle mission','New job','Nueva misión','Neuer Auftrag','Nuova missione','Nova missão'],
  ['Modifier la mission','Edit job','Editar misión','Auftrag bearbeiten','Modifica missione','Editar missão'],
  ['Début','Start','Inicio','Beginn','Inizio','Início'],
  ['Fin','End','Fin','Ende','Fine','Fim'],
  ['Pause','Break','Pausa','Pause','Pausa','Intervalo'],
  ['Heures travaillées','Hours worked','Horas trabajadas','Arbeitsstunden','Ore lavorate','Horas trabalhadas'],
  ['Heures supplémentaires','Overtime','Horas extra','Überstunden','Straordinari','Horas extras'],
  ['Jour férié','Public holiday','Festivo','Feiertag','Festivo','Feriado'],
  ['Montant estimé','Estimated amount','Importe estimado','Geschätzter Betrag','Importo stimato','Valor estimado'],
  ['Taux horaire','Hourly rate','Tarifa por hora','Stundenlohn','Tariffa oraria','Valor por hora'],
  ['Panier repas','Meal allowance','Plus de comida','Essenspauschale','Indennità pasto','Auxílio-alimentação'],
  ['Indemnités','Allowances','Indemnizaciones','Zulagen','Indennità','Adicionais'],
  ['Ajouter des heures','Add hours','Añadir horas','Stunden hinzufügen','Aggiungi ore','Adicionar horas'],
  ['Choisir une date','Choose a date','Elegir una fecha','Datum auswählen','Scegli una data','Escolher uma data'],
  ['Données et sauvegarde','Data and backup','Datos y copia de seguridad','Daten und Sicherung','Dati e backup','Dados e backup'],
  ['Exporter PDF','Export PDF','Exportar PDF','PDF exportieren','Esporta PDF','Exportar PDF'],
  ['Aujourd’hui','Today','Hoy','Heute','Oggi','Hoje'],
  ['Bonne nuit','Good evening','Buenas noches','Gute Nacht','Buona notte','Boa noite'],
  ['Bonjour','Good morning','Buenos días','Guten Morgen','Buongiorno','Bom dia'],
  ['Bon après-midi','Good afternoon','Buenas tardes','Guten Tag','Buon pomeriggio','Boa tarde'],
  ['Bonsoir','Good evening','Buenas tardes','Guten Abend','Buonasera','Boa noite'],
  ['Nouveau document','New document','Nuevo documento','Neues Dokument','Nuovo documento','Novo documento'],
  ['Document vierge','Blank document','Documento en blanco','Leeres Dokument','Documento vuoto','Documento em branco'],
  ['Nouveau classeur','New spreadsheet','Nueva hoja de cálculo','Neue Tabelle','Nuovo foglio di calcolo','Nova planilha'],
  ['Nouvelle présentation','New presentation','Nueva presentación','Neue Präsentation','Nuova presentazione','Nova apresentação'],
  ['Rechercher dans les documents','Search documents','Buscar documentos','Dokumente durchsuchen','Cerca documenti','Pesquisar documentos'],
  ['Aucun fichier pour l’instant.','No files yet.','Todavía no hay archivos.','Noch keine Dateien.','Nessun file per ora.','Nenhum arquivo por enquanto.'],
  ['Sans titre','Untitled','Sin título','Unbenannt','Senza titolo','Sem título'],
  ['Renommer','Rename','Cambiar nombre','Umbenennen','Rinomina','Renomear'],
  ['Dupliquer','Duplicate','Duplicar','Duplizieren','Duplica','Duplicar'],
  ['Tout supprimer','Delete all','Eliminar todo','Alles löschen','Elimina tutto','Excluir tudo'],
  ['Arrière-plan','Background','Fondo','Hintergrund','Sfondo','Plano de fundo'],
  ['Affichage des fichiers','File display','Visualización de archivos','Dateianzeige','Visualizzazione file','Exibição de arquivos'],
  ['Trier par','Sort by','Ordenar por','Sortieren nach','Ordina per','Ordenar por'],
  ['Confirmer avant de supprimer','Confirm before deleting','Confirmar antes de eliminar','Vor dem Löschen bestätigen','Conferma prima di eliminare','Confirmar antes de excluir'],
  ['Terminal','Terminal','Terminal','Terminal','Terminale','Terminal'],
  ['Shell local','Local shell','Shell local','Lokale Shell','Shell locale','Shell local'],
  ['SSH et clés','SSH and keys','SSH y claves','SSH und Schlüssel','SSH e chiavi','SSH e chaves'],
  ['Clé privée','Private key','Clave privada','Privater Schlüssel','Chiave privata','Chave privada'],
  ['Ouvrir une connexion','Open connection','Abrir conexión','Verbindung öffnen','Apri connessione','Abrir conexão'],
  ['Créer une connexion','Create connection','Crear conexión','Verbindung erstellen','Crea connessione','Criar conexão'],
  ['Déconnecter','Disconnect','Desconectar','Trennen','Disconnetti','Desconectar'],
  ['Hôte','Host','Host','Host','Host','Host'],
  ['Port','Port','Puerto','Port','Porta','Porta'],
  ['Copier','Copy','Copiar','Kopieren','Copia','Copiar'],
  ['Coller','Paste','Pegar','Einfügen','Incolla','Colar'],
  ['Effacer','Clear','Borrar','Löschen','Cancella','Limpar'],
  ['Rechercher dans le terminal','Search terminal','Buscar en el terminal','Terminal durchsuchen','Cerca nel terminale','Pesquisar no terminal'],
  ['Touches supplémentaires','Extra keys','Teclas adicionales','Zusatztasten','Tasti aggiuntivi','Teclas extras'],
  ['Afficher le test des couleurs','Show color test','Mostrar prueba de colores','Farbtest anzeigen','Mostra test colori','Mostrar teste de cores'],
  ['Paramètres du coffre','Vault settings','Ajustes de la bóveda','Tresoreinstellungen','Impostazioni cassaforte','Configurações do cofre'],
  ['Importer / Exporter','Import / Export','Importar / Exportar','Importieren / Exportieren','Importa / Esporta','Importar / Exportar'],
  ['Pas de données à afficher','No data to display','No hay datos que mostrar','Keine Daten zum Anzeigen','Nessun dato da visualizzare','Nenhum dado para exibir'],
  ['Chargement…','Loading…','Cargando…','Wird geladen…','Caricamento…','Carregando…'],
  ['Serveur injoignable','Server unreachable','Servidor inaccesible','Server nicht erreichbar','Server non raggiungibile','Servidor inacessível'],
  ['Aperçus','Previews','Vistas previas','Vorschauen','Anteprime','Pré-visualizações'],
  ['Mode tabletop / livre','Tabletop / book mode','Modo mesa / libro','Tisch-/Buchmodus','Modalità tabletop / libro','Modo mesa / livro'],
  // Extra Opus screen strings
  ["Radio de l'artiste","Artist radio","Radio del artista","Künstlerradio","Radio dell'artista","Rádio do artista"],
  ["Ne plus proposer","Don't recommend","No recomendar","Nicht mehr empfehlen","Non suggerire","Não recomendar"],
  ["Artistes similaires","Similar artists","Artistas similares","Ähnliche Künstler","Artisti simili","Artistas semelhantes"],
  ["Lire la suite","Read more","Leer más","Mehr lesen","Leggi di più","Ler mais"],
  ["Réduire","Show less","Mostrar menos","Weniger anzeigen","Mostra meno","Mostrar menos"],
  ["Toutes tes playlists sont déjà dans ce dossier","All your playlists are already in this folder","Todas tus listas ya están en esta carpeta","Alle deine Playlists sind bereits in diesem Ordner","Tutte le tue playlist sono già in questa cartella","Todas as suas playlists já estão nesta pasta"],
  ["Nouveau dossier","New folder","Nueva carpeta","Neuer Ordner","Nuova cartella","Nova pasta"],
  ["Nom du dossier","Folder name","Nombre de la carpeta","Ordnername","Nome della cartella","Nome da pasta"],
  ["Nouvelle playlist","New playlist","Nueva lista","Neue Playlist","Nuova playlist","Nova playlist"],
  ["Nom de la playlist","Playlist name","Nombre de la lista","Playlistname","Nome della playlist","Nome da playlist"],
  ["Titre retiré","Track removed","Pista eliminada","Titel entfernt","Brano rimosso","Faixa removida"],
  ["Recherches récentes","Recent searches","Búsquedas recientes","Letzte Suchen","Ricerche recenti","Pesquisas recentes"],
  ["Recherche impossible","Search failed","Búsqueda fallida","Suche fehlgeschlagen","Ricerca non riuscita","Falha na pesquisa"],
  ["Pas encore de favori","No favorites yet","Aún no hay favoritos","Noch keine Favoriten","Ancora nessun preferito","Ainda não há favoritos"],
  ["Aucun genre","No genres","No hay géneros","Keine Genres","Nessun genere","Nenhum gênero"],
  ["Aucun titre pour ce genre","No tracks in this genre","No hay pistas de este género","Keine Titel in diesem Genre","Nessun brano per questo genere","Nenhuma faixa neste gênero"],
  ["Webradios de ton serveur","Web radios from your server","Radios web de tu servidor","Webradios von deinem Server","Web radio del tuo server","Rádios web do seu servidor"],
  ["Mix du jour","Daily mix","Mezcla del día","Mix des Tages","Mix del giorno","Mix do dia"],
  ["Pas assez de titres pour ce mix","Not enough tracks for this mix","No hay suficientes pistas para esta mezcla","Nicht genug Titel für diesen Mix","Brani insufficienti per questo mix","Faixas insuficientes para esta mistura"],
  ["Recherche de pépites…","Finding hidden gems…","Buscando joyas…","Suche nach Geheimtipps…","Alla ricerca di perle…","Procurando novidades…"],
  ["Titres introuvables sur le serveur","Tracks not found on server","Pistas no encontradas en el servidor","Titel auf dem Server nicht gefunden","Brani non trovati sul server","Faixas não encontradas no servidor"],
  ["Ta bibliothèque, autrement","Your library, reimagined","Tu biblioteca de otra forma","Deine Bibliothek neu entdeckt","La tua libreria in modo diverso","Sua biblioteca de outro jeito"],
  ["Radios de tes artistes","Radios from your artists","Radios de tus artistas","Radios deiner Künstler","Radio dei tuoi artisti","Rádios dos seus artistas"],
  ["Nouveautés de tes artistes","New releases from your artists","Novedades de tus artistas","Neuerscheinungen deiner Künstler","Novità dei tuoi artisti","Novidades dos seus artistas"],
  ["Sorties des 4 derniers mois de tes artistes, sur Deezer","Releases from your artists in the last 4 months on Deezer","Lanzamientos de tus artistas de los últimos 4 meses en Deezer","Veröffentlichungen deiner Künstler der letzten 4 Monate auf Deezer","Uscite dei tuoi artisti degli ultimi 4 mesi su Deezer","Lançamentos dos seus artistas nos últimos 4 meses no Deezer"],
  ["Rien ne correspond au filtre","Nothing matches the filter","Nada coincide con el filtro","Keine Treffer für diesen Filter","Nessun risultato corrisponde al filtro","Nada corresponde ao filtro"],
  ["Historique vide","History is empty","El historial está vacío","Verlauf ist leer","Cronologia vuota","Histórico vazio"],
  ["Les titres apparaissent ici une fois écoutés à moitié.","Tracks appear here once you've listened to half of them.","Las pistas aparecerán aquí tras escuchar la mitad.","Titel erscheinen hier, sobald du die Hälfte gehört hast.","I brani appariranno qui dopo averne ascoltato metà.","As faixas aparecem aqui depois de ouvir metade."],
  ["Fonctionnalités","Features","Funciones","Funktionen","Funzionalità","Funcionalidades"],
  ["Aucune fonctionnalité","No features","No hay funciones","Keine Funktionen","Nessuna funzionalità","Nenhum recurso"],
  ["Rien ne correspond à la recherche","Nothing matches the search","Nada coincide con la búsqueda","Keine Treffer für die Suche","Nessun risultato corrisponde alla ricerca","Nada corresponde à pesquisa"],
  ["Active seulement ce dont tu as besoin","Enable only what you need","Activa solo lo que necesitas","Aktiviere nur, was du brauchst","Attiva solo ciò che serve","Ative apenas o que precisa"],
  ["Fonctionnalités activées","Enabled features","Funciones activadas","Aktivierte Funktionen","Funzionalità attive","Recursos ativados"],
  ["Valeurs par défaut rétablies","Defaults restored","Valores predeterminados restaurados","Standards wiederhergestellt","Valori predefiniti ripristinati","Padrões restaurados"],
  ["Masqués","Hidden","Ocultos","Ausgeblendet","Nascosti","Ocultos"],
  ["Écartés du Flow, des mix, des radios et de la lecture automatique","Excluded from Flow, mixes, radios, and autoplay","Excluidos de Flow, mezclas, radios y reproducción automática","Von Flow, Mixes, Radios und automatischer Wiedergabe ausgeschlossen","Esclusi da Flow, mix, radio e riproduzione automatica","Excluídos do Flow, mixes, rádios e reprodução automática"],
  ["Rien de masqué","Nothing hidden","Nada oculto","Nichts ausgeblendet","Niente di nascosto","Nada oculto"],
  ["Téléchargements serveur","Server downloads","Descargas del servidor","Server-Downloads","Download server","Downloads do servidor"],
  ["Serveur deemix non configuré","deemix server not configured","Servidor deemix no configurado","deemix-Server nicht konfiguriert","Server deemix non configurato","Servidor deemix não configurado"],
  ["MP3 320","MP3 320","MP3 320","MP3 320","MP3 320","MP3 320"],
  ["MP3 128","MP3 128","MP3 128","MP3 128","MP3 128","MP3 128"],
  ["ARL non vérifié","ARL not verified","ARL no verificado","ARL nicht verifiziert","ARL non verificato","ARL não verificado"],
  ["Liste vidée","List cleared","Lista vaciada","Liste geleert","Elenco svuotato","Lista limpa"],
  ["Retirer de la liste","Remove from list","Quitar de la lista","Aus Liste entfernen","Rimuovi dall'elenco","Remover da lista"],
  ["Voir les fichiers","View files","Ver archivos","Dateien anzeigen","Visualizza file","Ver arquivos"],
  ["Journal deemix","deemix log","Registro de deemix","deemix-Protokoll","Log deemix","Log do deemix"],
  ["Relancé","Restarted","Reiniciado","Neu gestartet","Riavviato","Reiniciado"],
  ["Blind test","Blind test","Prueba a ciegas","Blindtest","Test alla cieca","Teste às cegas"],
  ["Temps écoulé","Time elapsed","Tiempo transcurrido","Vergangene Zeit","Tempo trascorso","Tempo decorrido"],
  ["Raté","Missed","Fallado","Verpasst","Sbagliato","Errou"],
  ["Résultat","Result","Resultado","Ergebnis","Risultato","Resultado"],
  ["Préparation…","Preparing…","Preparando…","Vorbereitung…","Preparazione…","Preparando…"],
  ["Gestes et raccourcis","Gestures and shortcuts","Gestos y accesos directos","Gesten und Tastenkürzel","Gesti e scorciatoie","Gestos e atalhos"],
  ["Gestes activés","Gestures enabled","Gestos activados","Gesten aktiviert","Gesti attivati","Gestos ativados"],
  ["Glisser la pochette","Swipe the cover","Deslizar la carátula","Cover wischen","Scorri la copertina","Deslizar a capa"],
  ["Gestes du mini-lecteur","Mini-player gestures","Gestos del minirreproductor","Miniplayer-Gesten","Gesti del mini-player","Gestos do mini-player"],
  ["Appui long = menu","Long press = menu","Mantener pulsado = menú","Langes Drücken = Menü","Pressione lunga = menu","Pressionar e segurar = menu"],
  ["Même titre en plusieurs exemplaires ou qualités","Same track in multiple copies or qualities","La misma pista en varias copias o calidades","Derselbe Titel in mehreren Kopien oder Qualitäten","Stesso brano in più copie o qualità","A mesma faixa em várias cópias ou qualidades"],
  ["Qualités différentes","Different qualities","Calidades diferentes","Unterschiedliche Qualität","Qualità diverse","Qualidades diferentes"],
  ["Copies identiques","Identical copies","Copias idénticas","Identische Kopien","Copie identiche","Cópias idênticas"],
  ["Pas un doublon","Not a duplicate","No es duplicado","Kein Duplikat","Non è un duplicato","Não é duplicado"],
  ["Copier la liste des fichiers en trop","Copy list of extra files","Copiar lista de archivos sobrantes","Liste überzähliger Dateien kopieren","Copia elenco file in eccesso","Copiar lista de arquivos extras"],
  ["Réafficher les groupes ignorés","Show ignored groups again","Volver a mostrar grupos ignorados","Ignorierte Gruppen erneut anzeigen","Mostra di nuovo i gruppi ignorati","Mostrar grupos ignorados novamente"],
  ["Liste copiée","List copied","Lista copiada","Liste kopiert","Elenco copiato","Lista copiada"],
  ["Copie impossible","Copy failed","No se pudo copiar","Kopieren fehlgeschlagen","Copia non riuscita","Falha ao copiar"],
  ["Groupe ignoré","Group ignored","Grupo ignorado","Gruppe ignoriert","Gruppo ignorato","Grupo ignorado"],
  ["Importer une playlist","Import a playlist","Importar una lista","Playlist importieren","Importa una playlist","Importar playlist"],
  ["Spotify, YouTube, YouTube Music ou Deezer","Spotify, YouTube, YouTube Music, or Deezer","Spotify, YouTube, YouTube Music o Deezer","Spotify, YouTube, YouTube Music oder Deezer","Spotify, YouTube, YouTube Music o Deezer","Spotify, YouTube, YouTube Music ou Deezer"],
  ["Rien de téléchargé","Nothing downloaded","Nada descargado","Nichts heruntergeladen","Niente scaricato","Nada baixado"],
  ["Aucune playlist hors-ligne","No offline playlists","No hay listas sin conexión","Keine Offline-Playlists","Nessuna playlist offline","Nenhuma playlist offline"],
  ["Télécharger les titres manquants","Download missing tracks","Descargar las pistas que faltan","Fehlende Titel herunterladen","Scarica i brani mancanti","Baixar faixas ausentes"],
  ["Nécessite le serveur","Requires the server","Requiere el servidor","Benötigt den Server","Richiede il server","Requer o servidor"],
  ["Les fichiers restent sur le téléphone","Files remain on the phone","Los archivos permanecen en el teléfono","Dateien bleiben auf dem Telefon","I file restano sul telefono","Os arquivos permanecem no telefone"],
  ["Supprimer du téléphone","Delete from phone","Eliminar del teléfono","Vom Telefon löschen","Elimina dal telefono","Excluir do telefone"],
  ["Synchroniser maintenant","Sync now","Sincronizar ahora","Jetzt synchronisieren","Sincronizza ora","Sincronizar agora"],
  ["Télécharger toutes mes playlists","Download all my playlists","Descargar todas mis listas","Alle meine Playlists herunterladen","Scarica tutte le mie playlist","Baixar todas as minhas playlists"],
  ["Vérifier les fichiers","Verify files","Verificar archivos","Dateien überprüfen","Verifica i file","Verificar arquivos"],
  ["Réglages des téléchargements","Download settings","Ajustes de descargas","Download-Einstellungen","Impostazioni download","Configurações de download"],
  ["Tout supprimer du téléphone","Delete everything from phone","Eliminar todo del teléfono","Alles vom Telefon löschen","Elimina tutto dal telefono","Excluir tudo do telefone"],
  ["Téléchargements supprimés","Downloads deleted","Descargas eliminadas","Downloads gelöscht","Download eliminati","Downloads excluídos"],
  ["Catalogue Deezer, rapproché de ta bibliothèque Navidrome","Deezer catalog matched to your Navidrome library","Catálogo de Deezer comparado con tu biblioteca Navidrome","Deezer-Katalog mit deiner Navidrome-Bibliothek abgeglichen","Catalogo Deezer confrontato con la tua libreria Navidrome","Catálogo Deezer comparado com sua biblioteca Navidrome"],
  ["Chercher sur Deezer ou coller un lien…","Search Deezer or paste a link…","Busca en Deezer o pega un enlace…","Auf Deezer suchen oder Link einfügen…","Cerca su Deezer o incolla un link…","Pesquise no Deezer ou cole um link…"],
  ["Chercher sur Deezer","Search Deezer","Buscar en Deezer","Auf Deezer suchen","Cerca su Deezer","Pesquisar no Deezer"],
  ["Mon compte","My account","Mi cuenta","Mein Konto","Il mio account","Minha conta"],
  ["Tes titres aimés","Your liked tracks","Tus pistas favoritas","Deine Lieblingssongs","I brani che ti piacciono","Suas faixas favoritas"],
  ["Playlists du moment","Trending playlists","Listas populares","Aktuelle Playlists","Playlist del momento","Playlists do momento"],
  ["Albums du moment","Trending albums","Álbumes populares","Aktuelle Alben","Album del momento","Álbuns do momento"],
  ["Top titres","Top tracks","Mejores pistas","Top-Titel","Brani migliori","Melhores faixas"],
  ["Top Deezer","Deezer Top","Top de Deezer","Deezer-Charts","Top Deezer","Top do Deezer"],
  ["Demander à chaque fois","Ask every time","Preguntar siempre","Jedes Mal fragen","Chiedi ogni volta","Perguntar sempre"],
  ["Aucune (bibliothèque seulement)","None (library only)","Ninguna (solo biblioteca)","Keine (nur Bibliothek)","Nessuna (solo libreria)","Nenhuma (somente biblioteca)"],
  ["Test de la connexion…","Testing connection…","Probando conexión…","Verbindung wird getestet…","Test connessione…","Testando conexão…"],
  ["ARL refusé par Deezer : renvoie un ARL valide","ARL rejected by Deezer: send a valid ARL","ARL rechazado por Deezer: envía un ARL válido","ARL von Deezer abgelehnt: Sende einen gültigen ARL","ARL rifiutato da Deezer: invia un ARL valido","ARL recusado pelo Deezer: envie um ARL válido"],
  ["ARL présent (non vérifié)","ARL present (not verified)","ARL presente (sin verificar)","ARL vorhanden (nicht überprüft)","ARL presente (non verificato)","ARL presente (não verificado)"],
  ["Colle ton ARL","Paste your ARL","Pega tu ARL","Füge deinen ARL ein","Incolla il tuo ARL","Cole seu ARL"],
  ["Qualité deemix","deemix quality","Calidad de deemix","deemix-Qualität","Qualità deemix","Qualidade do deemix"],
  ["Playlist de destination","Destination playlist","Lista de destino","Ziel-Playlist","Playlist di destinazione","Playlist de destino"],
  ["Bibliothèque seulement","Library only","Solo biblioteca","Nur Bibliothek","Solo libreria","Somente biblioteca"],
  ["Toujours la même playlist…","Always the same playlist…","Siempre la misma lista…","Immer dieselbe Playlist…","Sempre la stessa playlist…","Sempre a mesma playlist…"],
];

const DICT = new Map([...ROWS, ...APP_ROWS].map((row) => [row[0], Object.fromEntries(LOCALES.map((l, i) => [l.code, i === 0 ? row[0] : (row[i] || row[0])]))]));
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
  if (!element || element.nodeType !== 1) return;
  const attributeExclusions = ['script','style','noscript','code','pre','[contenteditable="true"]','[data-no-translate]','.xterm','.xterm-screen','.xterm-rows','.terminal-output','.command-output','.doc-page','.sheet-cell','.sheet-grid','.slides-canvas','.ProseMirror','.tiptap','.editor-content'].concat(exclusions);
  try { if (element.closest(attributeExclusions.join(','))) return; } catch { return; }
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
    const formControl = root.matches('input,textarea');
    if (excluded(root) && !formControl) return;
    if (!excluded(root) || formControl) translateAttributes(root);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) translateTextNode(node);
  if (root.querySelectorAll) {
    for (const element of root.querySelectorAll('*')) {
      const formControl = element.matches('input,textarea');
      if (!excluded(element) || formControl) translateAttributes(element);
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
  style.textContent = '#apk-fold-language-picker{position:fixed;left:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 92px);z-index:2147483000;display:grid;place-items:center;width:36px;height:36px;box-sizing:border-box;color:#f8f7ff;background:rgba(22,18,32,.94);border:1px solid rgba(255,255,255,.2);border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.24);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);font:12px/1.25 system-ui,-apple-system,sans-serif}#apk-fold-language-picker span{font-size:18px;pointer-events:none}#apk-fold-language-picker select{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:0}#apk-fold-language-picker option{color:#17131e;background:#fff}@media(min-width:800px){#apk-fold-language-picker{left:16px;bottom:16px}}@media(max-width:360px){#apk-fold-language-picker{left:6px;bottom:calc(env(safe-area-inset-bottom,0px) + 82px)}}';
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
