# Weinkeller-App — Design-Spec

Datum: 2026-09-19 · Status: zur Freigabe

## 1. Ziel

Eine kleine, selbst gehostete Web-App, um die Weine im eigenen Keller zu erfassen. Ein Etikett-Foto genügt: Eine KI mit Websuche klassifiziert und bewertet den Wein, bestimmt das Trinkfenster und schlägt passendes Essen vor. Die App zeigt, was bald getrunken werden sollte, und empfiehlt zu einem Gericht die passende Flasche aus dem Keller.

**Erfolgskriterien**

- Einen Wein zu erfassen braucht ein Foto und eine Bestätigung.
- Alle KI-Ergebnisse liegen dauerhaft lokal. Ansehen, Suchen und Filtern kosten nichts und brauchen kein Internet.
- KI-Kosten entstehen nur durch Aktionen, die der Nutzer selbst auslöst.
- Läuft als ein Docker-Container auf einem Synology NAS und lokal in Docker Desktop.
- Hochwertiges, responsives Design im Stil «Étiquette».

## 2. Rahmenbedingungen

| Thema | Entscheidung |
|---|---|
| Hosting | Synology NAS, Container Manager (Docker). Test lokal mit Docker Desktop (macOS). |
| Nutzer | Mehrere Mobilgeräte im Haushalt, ein gemeinsamer Keller. |
| Zugriff | Nur Heimnetz, kein Login. Zugriff von unterwegs über VPN/Tailscale, ausserhalb der App. |
| KI | Claude API (Anthropic): Bildanalyse und Websuche-Tool. Modell per Umgebungsvariable `CLAUDE_MODEL`. |
| Sprache | Oberfläche Deutsch. Code, Bezeichner und Commits Englisch. |
| Währung | CHF (in `settings` änderbar). |

**Nicht im Umfang (YAGNI):** Benutzerkonten, mehrere Keller, Verfolgung einzelner Flaschen, Barcode-Scan, Import/Export, Offline-Modus, automatische Hintergrund-Aktualisierungen, austauschbare KI-Anbieter.

## 3. Architektur

Eine Next.js-Anwendung (App Router, TypeScript strict) in einem Container. Daten in SQLite (Drizzle ORM), Fotos als Dateien. Beides liegt in einem gemounteten Datenordner.

| Baustein | Aufgabe | Hängt ab von |
|---|---|---|
| UI (`src/app`, `src/components`) | Anzeigen und Eingaben. Keine Geschäftslogik. | API-Routen |
| API-Routen (`src/app/api`) | Eingaben validieren, Repository oder Dienste aufrufen. | Repository, Dienste |
| Repository (`src/server/repository`) | Einziger Ort mit Datenbankzugriff. | SQLite |
| KI-Dienst (`src/server/wine-intelligence`) | Einziger Ort, der die Claude API aufruft. | Claude API |
| Foto-Ablage (`src/server/photo-storage`) | Fotos prüfen, verkleinern, speichern, ausliefern. | Dateisystem |
| Domänenlogik (`src/domain`) | Reine Funktionen: Trinkreife, Bestand, Duplikat-Erkennung. | nichts |

**Schnittstelle des KI-Dienstes**

- `analyzeLabel(photo)` → erkannte Stammdaten
- `researchWine(wineIdentity)` → Bewertung, Trinkfenster, Essen, Marktwert, Konfidenz
- `recommendWinesForDish(dish, cellarWines)` → Rangliste mit Begründung

Alle Antworten werden gegen ein Zod-Schema geprüft. Der Dienst ist hinter einem Interface gekapselt, damit Tests eine aufgezeichnete Variante einsetzen können.

**Datenablage:** ein Ordner (`/data` im Container) mit `weinkeller.db` und `photos/`. NAS: `/volume1/docker/weinkeller`. Lokal: `./data` (nicht in Git).

## 4. Datenmodell

**`wines`** — ein Eintrag pro Wein und Jahrgang

- Stammdaten: `producer`, `name`, `vintage`, `country`, `region`, `appellation`, `grapeVarieties`, `wineType` (rot, weiss, rosé, schaum, süss), `alcoholPercent`
- Keller: `bottleCount`, `storageLocation` (Freitext), `purchasePricePerBottle`, `photoFileName`
- KI-Ergebnis: `styleClassification`, `description`, `criticScores` (Liste aus Quelle, Punkte, Link), `aggregateScore`, `drinkFromYear`, `drinkUntilYear`, `foodPairings`, `estimatedMarketValue`, `confidence` (`recherchiert` | `geschätzt`), `analyzedAt`
- `analysisStatus`: `pending` | `analyzing` | `awaitingConfirmation` | `complete` | `failed`
- `createdAt`, `updatedAt`

**`tastings`** — jede getrunkene Flasche: `wineId`, `tastedOn`, `starRating` (1–5), `tastingNote`, `occasionOrDish`.

**`dish_recommendations`** — gespeicherte Pairing-Anfragen: `dish`, `recommendations`, `cellarFingerprint`, `createdAt`. Eine gleiche Anfrage bei unverändertem Keller kommt aus dieser Tabelle.

**`ai_usage`** — ein Eintrag pro KI-Aufruf: `operation`, `inputTokens`, `outputTokens`, `createdAt`. Grundlage für den Monatszähler.

**`settings`** — Schlüssel-Wert: Währung, monatliche Obergrenze für KI-Aufrufe.

**Trinkreife** wird nie gespeichert, sondern aus Trinkfenster und aktuellem Jahr berechnet: `zu jung` → `trinkreif` → `bald trinken` (letzte zwei Jahre des Fensters) → `überfällig`.

## 5. Bildschirme

Navigation mobil unten: **Keller · Bald · ＋ · Essen · Mehr**. Ab Tablet-Breite Seitenleiste und zweispaltige Liste.

1. **Keller** — Liste mit Foto, Name, Region, Punkten, Trinkreife, Bestand. Suche und Filter (Typ, Region, Trinkreife).
2. **Bald trinken** — sortiert nach Dringlichkeit, überfällige zuerst.
3. **＋ Erfassen**
   - Schritt 1: Kamera über `<input type="file" accept="image/*" capture>` (funktioniert ohne HTTPS). Das Foto wird sofort gespeichert, die Analyse läuft im Hintergrund, das nächste Etikett kann direkt fotografiert werden.
   - Schritt 2: «Stimmt das so?» KI-Felder editierbar. Pflicht: Flaschenzahl. Optional: Lagerort, Kaufpreis.
4. **Wein-Detail** — Foto, Punkte mit Quellen-Links, Trinkfenster-Balken mit «heute»-Markierung, Essensempfehlungen, Beschreibung, Marktwert, Verkostungen. Aktionen: «Flasche getrunken» (Sterne, Notiz, Bestand −1), «Neu bewerten», Bearbeiten, Löschen.
5. **Essen → Wein** — Gericht eintippen, bis zu drei Empfehlungen aus dem Bestand mit Begründung. «Bald trinken» wird bevorzugt. Frühere Anfragen abrufbar.
6. **Mehr** — Historie, Kellerwert (Kaufpreis und Schätzwert), Einstellungen, KI-Zähler des laufenden Monats.

**Design «Étiquette»:** cremefarbener Grund (`#f6f1e7`), Tinte (`#2a2622`), Bordeaux-Akzent (`#7b2d3a`), feine 1-px-Linien, kaum Rundungen, Serifenschrift für Inhalte, Sans-Serif-Kapitälchen für Labels. Farben und Abstände als Design-Tokens in Tailwind. Mockups: `.superpowers/brainstorm/` (lokal).

## 6. KI-Anreicherung und Kosten

1. Foto serverseitig auf höchstens 1500 px verkleinern.
2. `analyzeLabel` liest das Etikett.
3. Duplikat-Prüfung (Weingut, Name, Jahrgang). Bei Treffer: «Schon im Keller. Bestand erhöhen?» Keine zweite Recherche.
4. `researchWine` recherchiert mit dem Websuche-Tool und liefert das feste Schema.
5. Bei Weinen ohne auffindbare Bewertungen: Schätzung aus Region, Rebsorte und Jahrgang, markiert als `geschätzt`. Keine erfundenen Punkte.
6. Ergebnis speichern, Status `awaitingConfirmation`.

**Kostenkontrolle**

- KI-Aufrufe nur bei: Erfassen, «Neu bewerten», neue Pairing-Anfrage. Nie automatisch.
- Pairing ohne Websuche. Ergebnisse werden gespeichert und wiederverwendet.
- Monatliche Obergrenze für KI-Aufrufe (Standard 300, einstellbar). Bei Erreichen blockt die App weitere Aufrufe mit klarem Hinweis.
- Modell und Preise werden bei der Planung gegen die aktuelle Claude-Dokumentation geprüft.

## 7. Fehlerfälle

| Fall | Verhalten |
|---|---|
| Etikett unleserlich | Status `failed`. Neues Foto oder Stammdaten von Hand eingeben und Recherche starten. |
| Kein Internet, API-Fehler, Zeitüberschreitung | Foto bleibt. Status `pending`, Knopf «Erneut versuchen». |
| API-Key fehlt oder ungültig | Hinweis in der App. Alles ohne KI funktioniert weiter. |
| KI-Antwort verletzt das Schema | Ein automatischer zweiter Versuch, danach `failed`. |
| Container-Neustart während Analyse | Beim Start werden `analyzing`-Einträge auf `pending` gesetzt. |
| Bestand 0 | Wein bleibt mit Historie erhalten, in der Kellerliste standardmässig ausgeblendet. |

## 8. Codequalität

- **TypeScript strict**, kein `any`, keine Non-Null-Assertions ohne Begründung.
- **Kleine Dateien:** Richtwert 200 Zeilen, ESLint `max-lines` 250 als Fehler. Funktionen höchstens rund 40 Zeilen (`max-lines-per-function`). Eine Datei, eine Aufgabe.
- **Lesbare Namen:** ausgeschriebene, sprechende Bezeichner (`drinkUntilYear`, `recommendWinesForDish`, `WineRepository`). Keine Abkürzungen, keine Ein-Buchstaben-Namen ausser Schleifenindizes. Booleans mit `is`/`has`. Per ESLint (`id-length`, Naming-Convention) durchgesetzt.
- **Klare Schichten:** UI ruft nie die Datenbank oder Claude direkt auf. Per ESLint-Import-Regeln abgesichert.
- **Keine magischen Werte:** Konstanten mit Namen an einem Ort (`src/domain/constants.ts`).
- **Testgetrieben (TDD):** zuerst der fehlschlagende Test, dann der Code.
- ESLint und Prettier, beides zusammen mit Typprüfung und Tests in einem Befehl `npm run verify`. Dieser muss vor jedem Commit grün sein.
- Kommentare erklären das Warum, nicht das Was.
- Kleine, thematisch saubere Commits (Conventional Commits).

## 9. Sicherheit

- **Geheimnisse:** `ANTHROPIC_API_KEY` nur als Umgebungsvariable, nur serverseitig gelesen. `.env` ist in `.gitignore`, `.env.example` ohne Werte liegt im Repo. Der Schlüssel wird nie geloggt und nie an den Browser gesendet.
- **Eingaben:** Jede API-Route validiert mit Zod. Längenbegrenzungen auf allen Textfeldern.
- **Uploads:** Höchstens 15 MB. Dateityp wird am Inhalt geprüft, nicht an der Endung. Jedes Bild wird mit `sharp` neu kodiert (entfernt EXIF und GPS). Dateinamen sind serverseitig erzeugte UUIDs, kein Nutzereingabe-Pfad erreicht das Dateisystem.
- **Datenbank:** nur parametrisierte Abfragen über Drizzle.
- **KI-Ausgaben gelten als nicht vertrauenswürdig** (Websuche kann manipulierte Inhalte liefern): Schema-Validierung, Darstellung nur als Text, kein `dangerouslySetInnerHTML`, Quellen-Links nur mit `http`/`https` und `rel="noopener noreferrer"`. Das Modell hat ausser der Websuche keine Werkzeuge und kann nichts in der App auslösen.
- **HTTP-Header:** Content-Security-Policy, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`.
- **Missbrauchsschutz:** Rate-Limit auf KI-Endpunkten plus monatliche Obergrenze (Abschnitt 6).
- **Container:** läuft als Nicht-Root-Benutzer, schreibt nur in `/data`, schlankes Basis-Image, Healthcheck.
- **Abhängigkeiten:** Lockfile committet, `npm audit` als Teil von `npm run verify`, wenige und gepflegte Pakete.
- **Fehlermeldungen** an den Browser ohne Stacktraces oder interne Pfade.

## 10. Tests

- **Unit:** Trinkreife, Bestandslogik, Duplikat-Erkennung, Keller-Fingerabdruck, Schema-Validierung.
- **Repository:** gegen temporäre SQLite-Datenbank.
- **KI-Dienst:** aufgezeichnete Claude-Antworten, alle Fehlerfälle. Keine API-Kosten.
- **API-Routen:** Validierung, Upload-Grenzen, Rate-Limit.
- **End-to-End (Playwright):** Foto hochladen → bestätigen → «Flasche getrunken» → Historie, mit aufgezeichnetem KI-Dienst.
- **Manuell vor NAS-Deploy:** zwei bis drei echte Etiketten.

## 11. Betrieb

**Lokal (Docker Desktop) — nach jedem abgeschlossenen Task**

1. `npm run verify` ist grün.
2. `docker compose up -d --build`
3. Healthcheck `GET /api/health` antwortet mit 200. Erst dann gilt der Task als abgeschlossen.

Die App ist danach unter `http://localhost:3000` erreichbar. Daten liegen in `./data` und überleben Neu-Deploys. Dieser Ablauf ist ein fester Schritt in jedem Task des Implementierungsplans und als `npm run deploy:local` gebündelt.

**NAS**

- Dieselbe `docker-compose.yml`, als Projekt im Container Manager. Ein Port (3000), ein Volume, Umgebungsvariablen `ANTHROPIC_API_KEY` und `CLAUDE_MODEL`.
- Image wird auf dem Mac für die CPU-Architektur des NAS gebaut (`docker buildx`, in der Regel `linux/amd64`) und als Datei übertragen. Anleitung im README.
- Datenbank-Migrationen laufen beim Start automatisch.
- Backup: Volume-Ordner in Hyper Backup aufnehmen.
- PWA-Manifest für «Zum Homescreen hinzufügen».
