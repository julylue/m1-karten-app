# M1 Karten

Karteikarten-App für M1 Psychologie (FernUni Hagen). Statische Seite auf GitHub Pages.

- `index.html`: die App (Abfrage mit FSRS, Durchlauf zum Anhören, Kartenübersicht)
- `sw.js`: Offline-Speicher
- Begriff erklären (stage 3, seit 20.11.2026): Begriff vorne in `ask` (fett markiert), kurze Erklärung im Wortlaut der Dozentin in `a`, `auswahl` = richtige Erklärung | 3 falsche Erklärungen. Stufen: Auswählen, Richtig oder falsch, Selbst erklären (aufdecken und selbst bewerten). Kein Abtippen nach zwei Fehlern.
- Stufenleiter pro Karte: Auswählen (Erkennen: 4 Antworten aus Spalte `auswahl`, erste richtig; Aufzählen: richtige Begriffe aus `a` plus Ablenker aus `auswahl`, Mehrfachauswahl), Richtig oder falsch (zufällige Aussage aus Spalte `aussagen`, Format "Text ## wahr || Text ## falsch"), Selbst nennen (freier Abruf). Neue Karten starten bei Auswählen, zwei richtige in Folge = eine Stufe höher, eine falsche = eine tiefer. Stufen ohne Daten oder ohne `geprueft` = "ja" werden übersprungen (alte Erkennen-Karten mit `auswahl` und leerem `geprueft` behalten Auswählen). Richtig zählt wie "Wusste ich", falsch wie "Noch nicht". Bei Auswählen und Richtig oder falsch gibt es "Weiß ich nicht" (Taste 0): zeigt die Lösung und zählt wie falsch. Der Stufenstand liegt je Gerät im Browser (localStorage "ladder").
- Zweimal falsch in derselben Runde: Die App zeigt die Antwort, sie wird einmal abgetippt (oder "Auf Papier geschrieben"), danach kommt die Karte erst am nächsten Tag.
- Spalte `aktiv` = "nein": Karte wird überall ignoriert.
- Nicht gewusst: Die Karte kommt nach 5 weiteren Karten einmal wieder (nicht erst am Rundenende), danach erst am nächsten Tag. Beim zweiten Fehler einmal aufschreiben.
- Keine Tagesgrenze für neue Karten: alle neuen kommen in den normalen Stapel, Kernthemen (prio 1) zuerst. Karten mit mindestens 4 Fehlern, die zuletzt nicht saßen, pausieren und gehen in die Session mit Claude (Blatt state: lapses >= 4 und lastRating = 1).
- "Nicht verstanden" (Fragezeichen auf der Karte, Taste U): merkt das Thema mit optionaler Notiz für die nächste Session mit Claude vor. Schreibt in dieselbe Liste wie der Lernkurs M2 (Hub-Speicher, Pfad `kurs/unklar`, Einträge `karten|<id>`), über den Hub-Schlüssel `hub-key` im Browser. Die Karte bleibt im Stapel.
- "Bestimmte Karten üben": Filter nach Heute dran, Oft falsch (mindestens 2 Fehler), Neu, Alle, jeweils pro Kurs (Psy, FoM, KuV, Stat nach der Spalte topic).
- Karten und Lernstand liegen in einer Google-Tabelle, angebunden über ein Google-Skript.
- `audio/`: vorgelesene Karten. Ein GitHub-Workflow (`.github/workflows/audio.yml`) holt sie zweimal pro Stunde vom Google-Skript; die App spielt sie von hier ab und fragt nur bei fehlenden Dateien das Skript.

## Hinweis zu den Tonspuren

Die Tonspuren in `audio/` sind mit [ElevenLabs](https://elevenlabs.io) erzeugt (Text-to-Speech), daher steht "elevenlabs.io" in jedem Dateinamen. Nicht-kommerzielle Lernhilfe.

Veröffentlichung: Push auf main, GitHub Pages ist nach etwa einer Minute aktuell.

## Klausurtrainer (`trainer/`)

Der M1-Klausurtrainer als eigene App: `https://julylue.github.io/m1-karten-app/trainer/?k=<Hub-Schlüssel>`.

- Nur für July: Klausurtexte, Fundstellen und Themen liegen ausschließlich verschlüsselt in `trainer/data.enc` (AES-256-GCM, PBKDF2). Schlüssel ist der Hub-Schlüssel. Ohne Schlüssel zeigt die Seite nur ein Eingabefeld. Keine Gast-Fassung mit Originalwortlaut (Klausurtexte dürfen laut FernUni nicht weitergegeben werden).
- Fortschritt: pro Gerät im Browser und im Hub-Speicher unter `klausurtrainer/progress` (Blatt hubdata im Studien-Hub Wochenplan), zusammengeführt pro Aussage nach dem jüngeren Stand.
- Quelle der Inhalte ist weiterhin das Klausurtrainer-Artifact. Nach Änderungen dort neu bauen: `KT_KEY=<Hub-Schlüssel> python3 -I scripts/build-trainer.py <artifact-index.html>`, dann pushen. Ändert sich der Hub-Schlüssel, ebenso neu bauen.
- Offline: über `sw.js` im Hauptordner.
