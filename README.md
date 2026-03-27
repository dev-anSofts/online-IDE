# Browser IDE V1

Prima base per un IDE self-hosted via browser con editor a sinistra e preview a destra.

## Cosa fa già

- Monaco Editor integrato
- Modalità `HTML + CSS` con render live in `iframe`
- Modalità `SwiftUI` già pronta come editor con sintassi di base
- Reset demo e render manuale
- Nessun backend richiesto per la preview V1

## Cosa non fa ancora

- Preview reale di SwiftUI
- Salvataggio locale persistente
- Apertura / esportazione file
- Account, storage remoto, billing

## Avvio locale

```bash
npm install
npm run dev
```

## Build produzione

```bash
npm run build
```

La cartella da pubblicare sarà `dist/`.

## Roadmap

1. IndexedDB per salvataggio locale
2. Import / export file
3. Console errori HTML/CSS/JS
4. Layout resizable vero
5. Preview SwiftUI compatibile via pipeline dedicata
