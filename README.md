{\rtf1\ansi\ansicpg1252\cocoartf2870
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # Family Reminder\
\
Un sito web semplice, ispirato a **Apple Promemoria**, pensato per la tua famiglia.\
\
## Funzionalit\'e0 principali\
\
- Liste di promemoria (con colore e icona tipo Apple Reminders)\
- Promemoria con:\
  - titolo, note\
  - data e ora\
  - priorit\'e0 (bassa, media, alta)\
  - tag (es. `#spesa`, `#nonna`)\
  - ripetizione (giornaliera, settimanale, mensile)\
  - sub-attivit\'e0\
  - allegato (URL)\
- Vista filtrata:\
  - Oggi\
  - Prossimi\
  - Tutti\
- Completamento promemoria con gestione delle ripetizioni\
- Salvataggio locale (localStorage) per chi usa il sito\
\
## Come pubblicare su GitHub Pages\
\
1. Vai nelle **Settings** della repo.\
2. Sezione **Pages**.\
3. Scegli branch `main` e cartella `/root`.\
4. Salva: GitHub generer\'e0 l\'92URL del sito.\
5. Manda il link alla tua famiglia.\
\
## Dati condivisi tra tutta la famiglia\
\
Per avere **liste e promemoria condivisi** (non solo sul singolo dispositivo):\
\
- usa un backend come **Firebase Firestore**;\
- sostituisci le funzioni di salvataggio/caricamento in `app.js` con chiamate a Firestore;\
- opzionale: aggiungi autenticazione (email/password o anonima) per ogni familiare.\
\
Questo progetto \'e8 pensato come base: puoi crescere da qui e aggiungere\
funzioni avanzate (notifiche push, ruoli, liste per persona, ecc.).\
}