# Weinkeller

🇬🇧 English version: [README.md](README.md)

Eine kleine, selbst gehostete Web-App, um die Weine im eigenen Keller zu erfassen. Ein Etikett-Foto genügt: Eine KI mit Websuche klassifiziert und bewertet den Wein, bestimmt das Trinkfenster und schlägt passendes Essen vor.

## Inhaltsverzeichnis

1. [Was die App kann](#1-was-die-app-kann)
2. [KI-Anbieter wählen und API-Schlüssel holen](#2-ki-anbieter-wählen-und-api-schlüssel-holen)
3. [Kosten](#3-kosten)
4. [Lokal testen (Docker Desktop)](#4-lokal-testen-docker-desktop)
5. [Installation auf dem Synology NAS](#5-installation-auf-dem-synology-nas)
6. [Hinweis zur Installation als App](#6-hinweis-zur-installation-als-app)
7. [Zugriff von unterwegs](#7-zugriff-von-unterwegs)
8. [Sicherheit](#8-sicherheit)
9. [Backup](#9-backup)
10. [Update](#10-update)
11. [Entwicklung](#11-entwicklung)
12. [Fehlerbehebung](#12-fehlerbehebung)
13. [Lizenz](#13-lizenz)

## 1. Was die App kann

- Einen Wein zu erfassen braucht nur ein Etikett-Foto und eine Bestätigung.
- Eine KI mit Websuche klassifiziert den Wein, bewertet ihn, bestimmt das Trinkfenster und schlägt passendes Essen vor.
- Alle KI-Ergebnisse liegen dauerhaft lokal: Ansehen, Suchen und Filtern kosten nichts und brauchen kein Internet.
- Die App zeigt, welche Weine bald getrunken werden sollten, und empfiehlt zu einem Gericht die passende Flasche aus dem Keller.
- Läuft als ein einziger Docker-Container, lokal in Docker Desktop zum Testen und dauerhaft auf einem Synology NAS.
- **Wichtig:** Die App hat bewusst kein Login. Sie gehört ins Heimnetz; von unterwegs nur über VPN zugreifen und den Port nie direkt ins Internet freigeben (siehe Abschnitte 7 und 8).

## 2. KI-Anbieter wählen und API-Schlüssel holen

Die App arbeitet wahlweise mit **Google Gemini** oder mit **Claude von Anthropic**. Beide lesen das Etikett, recherchieren im Web und empfehlen Weine zu einem Gericht; die App verhält sich mit beiden gleich. Es braucht nur den Schlüssel des gewählten Anbieters. Gewechselt wird jederzeit über die `.env`, bereits erfasste Weine bleiben unverändert.

|                       | Google Gemini                                           | Claude (Anthropic)                         |
| --------------------- | ------------------------------------------------------- | ------------------------------------------ |
| Kosten pro Wein       | rund 1 Rappen (gemessen)                                | rund 8–16 Rappen (geschätzt)               |
| Websuche              | Google-Suche, bis 5000 Suchanfragen pro Monat kostenlos | 1 Rappen pro Suche, Ergebnisse als Tokens  |
| Standardmodell        | `gemini-3.7-flash`                                      | `claude-sonnet-5`                          |
| Einstellung in `.env` | `WINE_INTELLIGENCE_MODE=gemini` und `GEMINI_API_KEY=…`  | `ANTHROPIC_API_KEY=…`                      |
| Empfehlung            | für die meisten Keller die beste Wahl                   | Alternative, `claude-opus-5` für Raritäten |

Ohne Angabe von `WINE_INTELLIGENCE_MODE` verwendet die App Claude. Das hält bestehende Installationen unverändert am Laufen.

### Google Gemini: Schlüssel holen

1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) öffnen und mit einem Google-Konto anmelden.
2. «Create API key» wählen. Google legt dabei automatisch ein Projekt an, zu dem der Schlüssel gehört.
3. Beim Projekt auf «Set up billing» klicken, ein Zahlungskonto anlegen oder auswählen und ein Modell wählen: **Prepay** (Guthaben ab 5 US-Dollar im Voraus laden, reicht für mehrere hundert Weine) oder Postpay (Abrechnung am Monatsende). Dieser Schritt ist nötig: Mit einem Gratis-Schlüssel lehnt Google die Websuche bei den Gemini-3-Modellen ab, und die App meldet, der KI-Dienst sei nicht erreichbar.
4. Empfohlen: auf der Seite «Spend» unter «Monthly spend cap» eine tiefe Obergrenze setzen. Bei Prepay ohne automatisches Nachladen ist das Guthaben ohnehin die Obergrenze.
5. Schlüssel kopieren und in die `.env` eintragen:

   ```bash
   WINE_INTELLIGENCE_MODE=gemini
   GEMINI_API_KEY=hier-den-schlüssel-einfügen
   ```

Im kostenpflichtigen Tarif verwendet Google die Etikett-Fotos und Anfragen laut eigenen Bedingungen nicht zur Verbesserung seiner Produkte; im Gratis-Tarif schon.

### Claude (Anthropic): Schlüssel holen

1. [platform.claude.com](https://platform.claude.com) öffnen und ein Konto anlegen.
2. Unter «Billing» Guthaben laden (ab 5 US-Dollar).
3. Unter «API keys» mit «Create key» einen Schlüssel erstellen und kopieren. Er wird nur einmal angezeigt.
4. Empfohlen: unter «Limits» ein monatliches Ausgabelimit setzen.
5. In die `.env` eintragen:

   ```bash
   ANTHROPIC_API_KEY=hier-den-schlüssel-einfügen
   ```

### Anbieter wechseln

`WINE_INTELLIGENCE_MODE` in der `.env` auf `gemini` oder `claude` setzen und den Container neu starten (lokal `npm run deploy:local`, auf dem NAS Projekt → Aktion → «Erstellen»). Die Startzeile im Protokoll zeigt den aktiven Anbieter und das Modell, z. B. `intelligenceMode=gemini model=gemini-3.7-flash`.

## 3. Kosten

KI-Aufrufe entstehen ausschliesslich bei drei Aktionen: beim Erfassen eines Weins (Etikett lesen und Recherche), bei «Neu bewerten» und bei einer neuen Frage nach einem passenden Wein zu einem Gericht. Alles, was bereits gespeichert ist, kostet beim Ansehen, Suchen und Filtern nichts. Eine einzelne Frage nach einem passenden Wein zu einem Gericht kostet deutlich weniger als eine Weinerfassung.

**Google Gemini** (`gemini-3.7-flash`), gemessen bei zwei Testweinen: rund 1 Rappen pro erfasstem Wein (etwa 2300 Eingabe- und 2000 Ausgabe-Tokens, 3–4 Suchanfragen, etwa 15 Sekunden). Die Google-Suche ist bis 5000 Suchanfragen pro Monat kostenlos, und die Suchergebnisse werden nicht als Tokens verrechnet. Der Listenpreis von `gemini-3.7-flash` verdoppelt sich laut Google am 1. Januar 2027; auch dann bleibt ein Wein bei wenigen Rappen. Ein anderes Modell lässt sich über `GEMINI_MODEL` wählen; `gemini-2.5-flash` lieferte im Test deutlich dünnere Ergebnisse.

**Claude**, geschätzt: mit `claude-sonnet-5` rund 8–16 Rappen pro erfasstem Wein, inklusive Websuche-Gebühr. Der grösste Teil entfällt auf die Websuche, weil deren Ergebnisse als Eingabe-Tokens verrechnet werden (gemessen rund 50 000 Tokens pro Wein).

- `claude-sonnet-5` (Standard): für bekannte Weine meist ausreichend.
- `claude-opus-5`: beste Erkennung und Recherche, auch bei seltenen Weinen, rund 2,5-mal so teuer (20–40 Rappen). Umstellen über `CLAUDE_MODEL=claude-opus-5` in der `.env`.

Für beide Anbieter gilt: «Neu bewerten» verwendet den jeweils eingestellten Anbieter und das eingestellte Modell. Die monatliche Obergrenze in «Mehr → Einstellungen» schützt vor Überraschungen.

Zum kostenlosen Ausprobieren ohne jeden API-Aufruf steht der Modus `WINE_INTELLIGENCE_MODE=recorded` zur Verfügung (siehe Abschnitt 4): Er liefert aufgezeichnete, realistische Antworten statt echter KI-Aufrufe.

## 4. Lokal testen (Docker Desktop)

```bash
cp .env.example .env
# Anbieter und API-Schlüssel in .env eintragen (siehe Abschnitt 2)
npm run deploy:local
```

Die App ist danach unter [http://localhost:3010](http://localhost:3010) erreichbar (der Hostport lässt sich mit der Umgebungsvariable `WEINKELLER_PORT` ändern; im Container und auf dem NAS bleibt der Port immer 3000).

Ohne jede Kosten ausprobieren, mit aufgezeichneten statt echten KI-Antworten:

```bash
WINE_INTELLIGENCE_MODE=recorded npm run deploy:local
```

## 5. Installation auf dem Synology NAS

Das Image wird von GitHub Actions bei jedem Versions-Tag gebaut (für Intel/AMD und ARM) und als öffentliches Paket in der Container-Registry dieses Repositorys abgelegt: `ghcr.io/stefanschaedeli/wyychaeller`. Das NAS holt es von dort; ein Login bei der Registry ist nicht nötig.

1. File Station: Ordner `/docker/weinkeller` und darin `data` anlegen. `docker-compose.nas.yml` und eine Datei `.env` mit dem Anbieter und dem API-Schlüssel hochladen (für Gemini die Zeilen `WINE_INTELLIGENCE_MODE=gemini` und `GEMINI_API_KEY=…`, für Claude die Zeile `ANTHROPIC_API_KEY=…`, siehe Abschnitt 2) — beide Dateien müssen nebeneinander in `/docker/weinkeller` liegen. Ohne echten API-Schlüssel funktioniert die App auch im kostenlosen Demo-Modus: dazu in derselben `.env` zusätzlich `WINE_INTELLIGENCE_MODE=recorded` eintragen.
2. Schreibrecht für den Container (läuft als Benutzer-ID 1000): per SSH `sudo chown -R 1000:1000 /volume1/docker/weinkeller/data`.
3. Container Manager → Projekt → Erstellen → Pfad `/docker/weinkeller`, vorhandene `docker-compose.nas.yml` verwenden → Starten. Das Image wird dabei automatisch heruntergeladen.
4. Im Heimnetz öffnen: `http://<NAS-IP>:3000`. Auf dem Handy «Zum Home-Bildschirm» hinzufügen.

**Protokoll:** Die App schreibt laufend ins Container-Protokoll, was sie tut: jede Anfrage, jeden Analyseschritt, jeden KI-Aufruf mit Dauer und Token-Verbrauch, die Websuchen, Fotos und Änderungen am Keller. Anzeigen im Container Manager unter Container → `weinkeller` → Details → Protokoll, oder per SSH mit `docker logs -f weinkeller`. Die Ausführlichkeit steuert `LOG_LEVEL` in der `.env`: `info` (Standard), `debug` (zusätzlich Healthcheck- und Foto-Abrufe), `warn`, `error` oder `silent`. Der API-Schlüssel, Fotos und Antworttexte der KI werden nie protokolliert.

**Aktualisieren:** Container Manager → Image → `ghcr.io/stefanschaedeli/wyychaeller` → Aktualisieren (oder per SSH `docker pull ghcr.io/stefanschaedeli/wyychaeller:latest`), danach Projekt → Aktion → «Erstellen» (neu aufbauen). Die Daten in `data` bleiben erhalten. Wer eine feste Version will, trägt in `docker-compose.nas.yml` statt `latest` z. B. `1.1.0` ein.

**Ohne Registry (offline):** Auf dem Mac `npm run image:nas` (für ARM: `bash scripts/build-nas-image.sh arm64`), das Archiv aus `dist/` im Container Manager unter Image → Hinzufügen → Aus Datei importieren und in `docker-compose.nas.yml` als Image `weinkeller:<Version>` eintragen.

## 6. Hinweis zur Installation als App

Auf dem iPhone funktioniert die Installation über «Zum Home-Bildschirm» direkt, ohne HTTPS. Android/Chrome verlangt für die echte App-Installation (mit Installationsdialog) HTTPS; das lässt sich optional über DSM → Anmeldeportal → Reverse Proxy mit Zertifikat einrichten. Ohne HTTPS funktioniert die App normal im Browser, inklusive Kamera für das Etikett-Foto.

## 7. Zugriff von unterwegs

Von unterwegs nur über VPN (Synology VPN Server oder Tailscale) zugreifen. Den Port 3000 nie direkt ins Internet freigeben: Die App hat bewusst kein Login (siehe Abschnitt 1).

## 8. Sicherheit

- Die App hat bewusst kein Login. Den Port deshalb nie ins Internet freigeben — Zugriff von unterwegs ausschliesslich über VPN oder Tailscale (siehe Abschnitt 7).
- Der API-Schlüssel steht nur in der `.env`-Datei neben der Compose-Datei, nie im Image und nie in Git.
- Beim KI-Anbieter eine Ausgabenobergrenze setzen (Google AI Studio: «Spend» → «Monthly spend cap»; Anthropic: «Limits»), damit ein Fehlverhalten oder ein Leck begrenzt bleibt.
- Backups (siehe Abschnitt 9) enthalten Etikett-Fotos und die Datenbank — entsprechend sorgfältig aufbewahren.

## 9. Backup

Hyper Backup: Ordner `/docker/weinkeller/data` aufnehmen (enthält `weinkeller.db` und `photos/`). Wiederherstellen: Ordner zurückspielen, Projekt starten.

## 10. Update

Neues Archiv bauen, importieren, in `docker-compose.nas.yml` die Version anpassen, Projekt neu erstellen. Datenbank-Migrationen laufen beim Start automatisch.

## 11. Entwicklung

- `npm run dev` — Entwicklungsserver auf Port 3001.
- `npm run verify` — Format, Lint, Typprüfung, Tests und die Playwright-Journey (Playwright braucht einen freien Port 3100).
- `npm run deploy:local` — lokal bauen und starten, siehe Abschnitt 4.
- Beiträge sind willkommen: `npm run verify` muss grün sein; die CI führt es bei jedem Push und Pull Request aus. Dank `WINE_INTELLIGENCE_MODE=recorded` braucht die Entwicklung keinen API-Schlüssel.
- `npm run verify` prüft `npm audit` nur ab Stufe `high` (`--audit-level=high`), bewusst so eingestellt. Ein bekannter moderater Befund (`drizzle-kit` → `esbuild`, nur im Entwicklungsserver, GHSA-67mh-4wv8-2f99) betrifft ausschliesslich `npm run database:generate` während der Entwicklung und ist nicht im Laufzeit-Image enthalten; er wird bewusst akzeptiert.

Qualitätsregeln:

1. TypeScript strict, kein `any`, keine unbegründeten Non-Null-Assertions.
2. Kleine Dateien (max. 250 Zeilen), kleine Funktionen, klare Schichten: UI ruft nie Datenbank oder KI-Dienst direkt auf.
3. Sprechende, ausgeschriebene Namen; keine Abkürzungen; Booleans mit `is`/`has`.
4. Keine magischen Werte — Konstanten zentral in `src/domain/constants.ts`.
5. Testgetrieben (TDD); `npm run verify` muss vor jedem Commit grün sein.

## 12. Fehlerbehebung

| Symptom                                                              | Massnahme                                                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| «Kein API-Schlüssel hinterlegt»                                      | `.env` prüfen: Der Schlüssel muss zum Anbieter in `WINE_INTELLIGENCE_MODE` passen. Projekt neu starten. |
| Mit Gemini: «KI-Dienst nicht erreichbar», Log zeigt `httpStatus=429` | Der Schlüssel ist im Gratis-Tarif. Abrechnung einrichten (Abschnitt 2, Schritt 3).                      |
| «wartet auf Analyse» bleibt stehen                                   | Internet-Anbindung des NAS prüfen, danach «Analyse erneut versuchen».                                   |
| Container startet nicht, Log zeigt `SQLITE_CANTOPEN` oder `EACCES`   | Schritt 5.2 (Schreibrecht auf `data`) wiederholen.                                                      |
| Unklar, was die App gerade tut                                       | Container-Protokoll lesen (`docker logs -f weinkeller`), bei Bedarf `LOG_LEVEL=debug`.                  |
| Monatliche Obergrenze erreicht                                       | «Mehr → Einstellungen» öffnen und Obergrenze anpassen.                                                  |

Eine geänderte Währung in den Einstellungen wirkt sich auf die Preisrecherche erst nach einem Neustart des Containers aus.

## 13. Lizenz

MIT, siehe [LICENSE](LICENSE).
