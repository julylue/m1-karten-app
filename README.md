# M1 Karten

Karteikarten-App für M1 Psychologie (FernUni Hagen). Statische Seite auf GitHub Pages.

- `index.html`: die App (Abfrage mit FSRS, Durchlauf zum Anhören, Kartenübersicht)
- `sw.js`: Offline-Speicher
- Stufenleiter pro Karte: Auswählen (Erkennen: 4 Antworten aus Spalte `auswahl`, erste richtig; Aufzählen: richtige Begriffe aus `a` plus Ablenker aus `auswahl`, Mehrfachauswahl), Richtig oder falsch (zufällige Aussage aus Spalte `aussagen`, Format "Text ## wahr || Text ## falsch"), Selbst nennen (freier Abruf). Neue Karten starten bei Auswählen, zwei richtige in Folge = eine Stufe höher, eine falsche = eine tiefer. Stufen ohne Daten oder ohne `geprueft` = "ja" werden übersprungen (alte Erkennen-Karten mit `auswahl` und leerem `geprueft` behalten Auswählen). Richtig zählt wie "Wusste ich", falsch wie "Noch nicht". Der Stufenstand liegt je Gerät im Browser (localStorage "ladder").
- Zweimal falsch in derselben Runde: Die App zeigt die Antwort, sie wird einmal abgetippt (oder "Auf Papier geschrieben"), danach kommt die Karte erst am nächsten Tag.
- Spalte `aktiv` = "nein": Karte wird überall ignoriert.
- Nicht gewusst: Die Karte kommt einmal am Ende der Runde, danach erst am nächsten Tag (keine 10-Minuten-Schleife mehr).
- Höchstens 10 neue Karten pro Tag im normalen Stapel. Karten mit mindestens 4 Fehlern, die zuletzt nicht saßen, pausieren und gehen in die Session mit Claude (Blatt state: lapses >= 4 und lastRating = 1).
- "Bestimmte Karten üben": Filter nach Heute dran, Oft falsch (mindestens 2 Fehler), Neu, Alle, jeweils pro Kurs (Psy, FoM, KuV, Stat nach der Spalte topic).
- Karten und Lernstand liegen in einer Google-Tabelle, angebunden über ein Google-Skript.
- `audio/`: vorgelesene Karten. Ein GitHub-Workflow (`.github/workflows/audio.yml`) holt sie zweimal pro Stunde vom Google-Skript; die App spielt sie von hier ab und fragt nur bei fehlenden Dateien das Skript.

## Hinweis zu den Tonspuren

Die Tonspuren in `audio/` sind mit [ElevenLabs](https://elevenlabs.io) erzeugt (Text-to-Speech), daher steht "elevenlabs.io" in jedem Dateinamen. Nicht-kommerzielle Lernhilfe.

Veröffentlichung: Push auf main, GitHub Pages ist nach etwa einer Minute aktuell.
