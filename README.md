# Weinkeller

Eine kleine, selbst gehostete Web-App, um die Weine im eigenen Keller zu erfassen. Ein Etikett-Foto genügt: Eine KI mit Websuche klassifiziert und bewertet den Wein, bestimmt das Trinkfenster und schlägt passendes Essen vor.

## Inhaltsverzeichnis

1. [Was die App kann](#1-was-die-app-kann)
2. [Kosten](#2-kosten)
3. [Lokal testen (Docker Desktop)](#3-lokal-testen-docker-desktop)
4. [Installation auf dem Synology NAS](#4-installation-auf-dem-synology-nas)
5. [Hinweis zur Installation als App](#5-hinweis-zur-installation-als-app)
6. [Zugriff von unterwegs](#6-zugriff-von-unterwegs)
7. [Sicherheit](#7-sicherheit)
8. [Backup](#8-backup)
9. [Update](#9-update)
10. [Entwicklung](#10-entwicklung)
11. [Fehlerbehebung](#11-fehlerbehebung)

## 1. Was die App kann

- Einen Wein zu erfassen braucht nur ein Etikett-Foto und eine Bestätigung.
- Eine KI mit Websuche klassifiziert den Wein, bewertet ihn, bestimmt das Trinkfenster und schlägt passendes Essen vor.
- Alle KI-Ergebnisse liegen dauerhaft lokal: Ansehen, Suchen und Filtern kosten nichts und brauchen kein Internet.
- Die App zeigt, welche Weine bald getrunken werden sollten, und empfiehlt zu einem Gericht die passende Flasche aus dem Keller.
- Läuft als ein einziger Docker-Container, lokal in Docker Desktop zum Testen und dauerhaft auf einem Synology NAS.

## 2. Kosten

KI-Aufrufe entstehen ausschliesslich bei drei Aktionen: beim Erfassen eines Weins (Etikett lesen und Recherche), bei «Neu bewerten» und bei einer neuen Frage nach einem passenden Wein zu einem Gericht. Alles, was bereits gespeichert ist, kostet beim Ansehen, Suchen und Filtern nichts.

> Hinweis: Die folgenden Zahlen sind eine Schätzung, keine Messung. Die tatsächlich gemessenen Werte aus einem echten Lauf werden in `docs/real-api-check.md` festgehalten, sobald dieser Check durchgeführt wurde.

Mit dem Standardmodell `claude-sonnet-5` ist pro erfasstem Wein (Etikett lesen und Websuche-Recherche inklusive Websuche-Gebühr) mit rund 8–16 Rappen zu rechnen. Mit `claude-opus-5` liegt der Betrag etwa 2,5-mal so hoch (rund 20–40 Rappen). Eine einzelne Frage nach einem passenden Wein zu einem Gericht kostet deutlich weniger als eine Weinerfassung.

- `claude-sonnet-5` (Standard): günstig, für bekannte Weine meist ausreichend.
- `claude-opus-5`: beste Erkennung und Recherche, auch bei seltenen Weinen. Umstellen über `CLAUDE_MODEL=claude-opus-5` in der `.env`. Bereits erfasste Weine bleiben unverändert; «Neu bewerten» verwendet das jeweils eingestellte Modell.
- Google Gemini als günstigere Alternative: `WINE_INTELLIGENCE_MODE=gemini` und `GEMINI_API_KEY=…` (kostenpflichtiger Schlüssel aus Google AI Studio) in der `.env` setzen. Standardmodell ist `gemini-3.7-flash`, umstellbar über `GEMINI_MODEL`. Gemessen bei zwei Testweinen: rund 1 Rappen pro erfasstem Wein (etwa 2300 Eingabe- und 2000 Ausgabe-Tokens, 3–4 Suchanfragen). Die Google-Suche ist mit kostenpflichtigem Schlüssel bis 5000 Suchanfragen pro Monat kostenlos, und die Suchergebnisse werden nicht als Tokens verrechnet. Ein Gratis-Schlüssel genügt nicht: Damit lehnt Google die Suche bei den Gemini-3-Modellen ab. Der Listenpreis von `gemini-3.7-flash` verdoppelt sich laut Google am 1. Januar 2027. `ANTHROPIC_API_KEY` wird in diesem Modus nicht benötigt; zurück zu Claude geht es mit `WINE_INTELLIGENCE_MODE=claude`.
- Die monatliche Obergrenze in «Mehr → Einstellungen» schützt vor Überraschungen.

Zum kostenlosen Ausprobieren ohne jeden API-Aufruf steht der Modus `WINE_INTELLIGENCE_MODE=recorded` zur Verfügung (siehe Abschnitt 3): Er liefert aufgezeichnete, realistische Antworten statt echter KI-Aufrufe.

## 3. Lokal testen (Docker Desktop)

```bash
cp .env.example .env
# API-Schlüssel in .env eintragen
npm run deploy:local
```

Die App ist danach unter [http://localhost:3010](http://localhost:3010) erreichbar (der Hostport lässt sich mit der Umgebungsvariable `WEINKELLER_PORT` ändern; im Container und auf dem NAS bleibt der Port immer 3000).

Ohne jede Kosten ausprobieren, mit aufgezeichneten statt echten KI-Antworten:

```bash
WINE_INTELLIGENCE_MODE=recorded npm run deploy:local
```

## 4. Installation auf dem Synology NAS

Das Image wird von GitHub Actions bei jedem Versions-Tag gebaut (für Intel/AMD und ARM) und in der privaten Container-Registry dieses Repositorys abgelegt: `ghcr.io/stefanschaedeli/wyychaeller`. Das NAS holt es von dort.

1. Zugriffstoken erstellen: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → «Generate new token», einzig mit dem Recht `read:packages`. Dieses Token kann nur Images lesen, keinen Code.
2. Container Manager → Registrierung → Einstellungen → Hinzufügen: Name `ghcr`, URL `https://ghcr.io`, Benutzername `stefanschaedeli`, Passwort = das Token. Diese Registrierung als aktiv setzen («Verwenden»).
3. File Station: Ordner `/docker/weinkeller` und darin `data` anlegen. `docker-compose.nas.yml` und eine Datei `.env` mit der Zeile `ANTHROPIC_API_KEY=…` hochladen — beide Dateien müssen nebeneinander in `/docker/weinkeller` liegen. Ohne echten API-Schlüssel funktioniert die App auch im kostenlosen Demo-Modus: dazu in derselben `.env` zusätzlich `WINE_INTELLIGENCE_MODE=recorded` eintragen.
4. Schreibrecht für den Container (läuft als Benutzer-ID 1000): per SSH `sudo chown -R 1000:1000 /volume1/docker/weinkeller/data`.
5. Container Manager → Projekt → Erstellen → Pfad `/docker/weinkeller`, vorhandene `docker-compose.nas.yml` verwenden → Starten. Das Image wird dabei automatisch heruntergeladen.
6. Im Heimnetz öffnen: `http://<NAS-IP>:3000`. Auf dem Handy «Zum Home-Bildschirm» hinzufügen.

**Protokoll:** Die App schreibt laufend ins Container-Protokoll, was sie tut: jede Anfrage, jeden Analyseschritt, jeden Claude-Aufruf mit Dauer und Token-Verbrauch, die Websuchen, Fotos und Änderungen am Keller. Anzeigen im Container Manager unter Container → `weinkeller` → Details → Protokoll, oder per SSH mit `docker logs -f weinkeller`. Die Ausführlichkeit steuert `LOG_LEVEL` in der `.env`: `info` (Standard), `debug` (zusätzlich Healthcheck- und Foto-Abrufe), `warn`, `error` oder `silent`. Der API-Schlüssel, Fotos und Antworttexte der KI werden nie protokolliert.

**Aktualisieren:** Container Manager → Image → `ghcr.io/stefanschaedeli/wyychaeller` → Aktualisieren (oder per SSH `docker pull ghcr.io/stefanschaedeli/wyychaeller:latest`), danach Projekt → Aktion → «Erstellen» (neu aufbauen). Die Daten in `data` bleiben erhalten. Wer eine feste Version will, trägt in `docker-compose.nas.yml` statt `latest` z. B. `1.1.0` ein.

**Ohne Registry (offline):** Auf dem Mac `npm run image:nas` (für ARM: `bash scripts/build-nas-image.sh arm64`), das Archiv aus `dist/` im Container Manager unter Image → Hinzufügen → Aus Datei importieren und in `docker-compose.nas.yml` als Image `weinkeller:<Version>` eintragen.

## 5. Hinweis zur Installation als App

Auf dem iPhone funktioniert die Installation über «Zum Home-Bildschirm» direkt, ohne HTTPS. Android/Chrome verlangt für die echte App-Installation (mit Installationsdialog) HTTPS; das lässt sich optional über DSM → Anmeldeportal → Reverse Proxy mit Zertifikat einrichten. Ohne HTTPS funktioniert die App normal im Browser, inklusive Kamera für das Etikett-Foto.

## 6. Zugriff von unterwegs

Von unterwegs nur über VPN (Synology VPN Server oder Tailscale) zugreifen. Den Port 3000 nie direkt ins Internet freigeben: Die App hat bewusst kein Login.

## 7. Sicherheit

- Die App hat bewusst kein Login. Den Port deshalb nie ins Internet freigeben — Zugriff von unterwegs ausschliesslich über VPN oder Tailscale (siehe Abschnitt 6).
- Der API-Schlüssel steht nur in der `.env`-Datei neben der Compose-Datei, nie im Image und nie in Git.
- Im Anthropic-Konsole-Bereich für den Schlüssel ein Ausgabelimit («Spend Limit») setzen, damit ein Fehlverhalten oder ein Leck begrenzt bleibt.
- Backups (siehe Abschnitt 8) enthalten Etikett-Fotos und die Datenbank — entsprechend sorgfältig aufbewahren.

## 8. Backup

Hyper Backup: Ordner `/docker/weinkeller/data` aufnehmen (enthält `weinkeller.db` und `photos/`). Wiederherstellen: Ordner zurückspielen, Projekt starten.

## 9. Update

Neues Archiv bauen, importieren, in `docker-compose.nas.yml` die Version anpassen, Projekt neu erstellen. Datenbank-Migrationen laufen beim Start automatisch.

## 10. Entwicklung

- `npm run dev` — Entwicklungsserver auf Port 3001.
- `npm run verify` — Format, Lint, Typprüfung, Tests und die Playwright-Journey (Playwright braucht einen freien Port 3100).
- `npm run deploy:local` — lokal bauen und starten, siehe Abschnitt 3.
- Spezifikation und Pläne liegen unter `docs/superpowers/`.
- `npm run verify` prüft `npm audit` nur ab Stufe `high` (`--audit-level=high`), bewusst so eingestellt. Ein bekannter moderater Befund (`drizzle-kit` → `esbuild`, nur im Entwicklungsserver, GHSA-67mh-4wv8-2f99) betrifft ausschliesslich `npm run database:generate` während der Entwicklung und ist nicht im Laufzeit-Image enthalten; er wird bewusst akzeptiert.

Qualitätsregeln (siehe Spezifikation Abschnitt 8):

1. TypeScript strict, kein `any`, keine unbegründeten Non-Null-Assertions.
2. Kleine Dateien (max. 250 Zeilen), kleine Funktionen, klare Schichten: UI ruft nie Datenbank oder Claude direkt auf.
3. Sprechende, ausgeschriebene Namen; keine Abkürzungen; Booleans mit `is`/`has`.
4. Keine magischen Werte — Konstanten zentral in `src/domain/constants.ts`.
5. Testgetrieben (TDD); `npm run verify` muss vor jedem Commit grün sein.

## 11. Fehlerbehebung

| Symptom                                                            | Massnahme                                                                              |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| «Kein API-Schlüssel hinterlegt»                                    | `.env` prüfen, Projekt neu starten.                                                    |
| «wartet auf Analyse» bleibt stehen                                 | Internet-Anbindung des NAS prüfen, danach «Analyse erneut versuchen».                  |
| Container startet nicht, Log zeigt `SQLITE_CANTOPEN` oder `EACCES` | Schritt 4.4 (Schreibrecht auf `data`) wiederholen.                                     |
| Unklar, was die App gerade tut                                     | Container-Protokoll lesen (`docker logs -f weinkeller`), bei Bedarf `LOG_LEVEL=debug`. |
| Monatliche Obergrenze erreicht                                     | «Mehr → Einstellungen» öffnen und Obergrenze anpassen.                                 |

Eine geänderte Währung in den Einstellungen wirkt sich auf die Preisrecherche erst nach einem Neustart des Containers aus.
