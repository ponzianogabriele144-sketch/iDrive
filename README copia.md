# 🚗 iDrive

Applicazione personale per iPhone e Mac per la gestione del garage personale (**Golf 2.0 TDI, Fiat 500, Yaris Hybrid**): monitoraggio rifornimenti con scanner fotocamera, consumi reali (`L/100km` e `km/l`), diario dei percorsi con **Auto-Start Bluetooth**, memorizzazione della posizione di sosta con **mappa GPS interattiva**, monitoraggio **scadenze assicurative** con avviso a 14 giorni, calendario mensile dedicato e generazione report PDF.

*development Gabriele Ponziano*

---

## 📱 Come Installare l'App sul tuo iPhone

Hai a disposizione due metodi ufficiali:

### 🌟 Metodo 1: Installazione PWA Istantanea via QR Code (Consigliato - 60 Secondi)
Non servono cavi né account sviluppatore:
1. Sul tuo Mac, apri il Terminale nella cartella dell'app ed esegui:
   ```bash
   python3 run_app.py
   ```
2. Si aprirà automaticamente sul Mac la **pagina di installazione con il QR Code**:
   - Inquadra il QR Code con l'app **Fotocamera** del tuo iPhone (assicurati che il telefono sia connesso allo stesso Wi-Fi del Mac).
   - Tocca il banner giallo per aprire il link in **Safari**.
3. In Safari, tocca il pulsante **Condividi** (il quadrato con la freccia verso l'alto ⎋ in basso al centro).
4. Scorri l'elenco e tocca **"Aggiungi alla schermata Home"** ➕, poi tocca **"Aggiungi"** in alto a destra.
5. **Fatto!** L'icona dell'app apparirà sulla Home del tuo iPhone. Aprendola, l'app funzionerà a schermo intero senza barre del browser e memorizzerà tutti i dati anche offline.

---

### 🛠️ Metodo 2: Progetto Nativo Xcode per iOS (Swift / SwiftUI)
Se desideri compilare e installare l'applicazione come app nativa `.ipa` nel tuo iPhone tramite Xcode:
1. Apri la cartella `ios/` e fai doppio clic su:
   ```bash
   open ios/FuelFlow.xcodeproj
   ```
2. Collega il tuo iPhone al Mac con il cavetto USB (oppure seleziona il tuo iPhone via Wi-Fi).
3. In Xcode, seleziona il tuo iPhone come target in alto.
4. Nella scheda *Signing & Capabilities*, seleziona il tuo Apple ID personale gratuito.
5. Premi il tasto **Play ▶️ (Run)** per installare ed eseguire l'app direttamente sul telefono.

---

## ✨ Funzionalità Principali

1. **Garage Personale 3 Auto:**
   - Gestione autonoma e modificabile di 3 vetture (Golf 2.0 TDI, Fiat 500, Yaris Hybrid).
   - Monitoraggio odometro, carburante e costo medio per tratta.

2. **Auto-Start Bluetooth & Memorizzazione Sosta:**
   - All'aggancio del Bluetooth dell'auto, l'app avvia in automatico il tracciamento in background con indicatore Dynamic Island.
   - Allo spegnimento dell'auto e disconnessione, l'app salva la sosta nel diario con orario, **coordinate GPS esatte** e notifica iPhone.
   - Scheda sosta nel reparto **Viaggi** con **mappa vettoriale stile Apple Maps**, pin con radar pulsante e tasto rapido *"Mappe"* per le indicazioni a piedi.

3. **Monitoraggio Assicurazioni & Scadenze Modificabili:**
   - Visualizzazione dello stato polizza per tutte le auto.
   - Modifica rapida di compagnia, tipo copertura, data scadenza e premio annuale.
   - Avviso automatico visivo e notifica a 14 giorni dalla scadenza.

4. **Grafici Andamento Spese & Resoconto Consumi:**
   - Grafico interattivo con andamento temporale delle spese sia per singola auto che comparativo per tutte le auto.
   - Sezione resoconto con litri consumati giornalmente e mensilmente.
   - Generazione di report PDF ufficiali con tabella chilometri e grafico spese.
