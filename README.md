# M1 Karten

Karteikarten-App für M1 Psychologie (FernUni Hagen). Statische Seite auf GitHub Pages.

- `index.html`: die App (Abfrage mit FSRS, Durchlauf zum Anhören, Kartenübersicht)
- `sw.js`: Offline-Speicher
- Auswahl-Karten: Steht in der Spalte `auswahl` der Tabelle "richtig | falsch | falsch | falsch", zeigt die App vier Antworten zum Antippen statt Aufdecken. Richtig zählt als "Schwer", falsch als "Nochmal". Nur für Karten mit Satz-Antworten, Begriffe bleiben freier Abruf.
- Nicht gewusst: Die Karte kommt einmal am Ende der Runde, danach erst am nächsten Tag (keine 10-Minuten-Schleife mehr).
- Höchstens 10 neue Karten pro Tag im normalen Stapel. Karten mit mindestens 4 Fehlern, die zuletzt nicht saßen, pausieren und gehen in die Session mit Claude (Blatt state: lapses >= 4 und lastRating = 1).
- "Bestimmte Karten üben": Filter nach Heute dran, Oft falsch (mindestens 2 Fehler), Neu, Alle, jeweils pro Kurs (Psy, FoM, KuV, Stat nach der Spalte topic).
- Karten und Lernstand liegen in einer Google-Tabelle, angebunden über ein Google-Skript.
- `audio/`: vorgelesene Karten. Ein GitHub-Workflow (`.github/workflows/audio.yml`) holt sie zweimal pro Stunde vom Google-Skript; die App spielt sie von hier ab und fragt nur bei fehlenden Dateien das Skript.

## Hinweis zu den Tonspuren

Die Tonspuren in `audio/` sind mit [ElevenLabs](https://elevenlabs.io) erzeugt (Text-to-Speech), daher steht "elevenlabs.io" in jedem Dateinamen. Nicht-kommerzielle Lernhilfe.

Veröffentlichung: Push auf main, GitHub Pages ist nach etwa einer Minute aktuell.
