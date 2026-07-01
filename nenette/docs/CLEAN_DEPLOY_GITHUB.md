# Nettoyage GitHub — Nénette V7.1

## Objectif

Supprimer la structure temporaire :

```text
nenette/index.html  -> redirection
nenette/nenette/    -> vraie application
```

et obtenir :

```text
nenette/index.html  -> vraie application
nenette/assets/
nenette/config/
nenette/modules/
nenette/services/
```

## Procédure GitHub Web

1. Aller dans `spacelonx-site / nenette`.
2. Supprimer le fichier `index.html` de redirection.
3. Supprimer le sous-dossier `nenette` interne après migration.
4. Cliquer `Add file` puis `Upload files`.
5. Depuis le PC, ouvrir le dossier décompressé de cette archive jusqu'à voir directement :
   - `index.html`
   - `assets`
   - `config`
   - `docs`
   - `modules`
   - `services`
   - `manifest.json`
   - `service-worker.js`
   - `README.md`
6. Sélectionner tout ce contenu, pas le dossier autour.
7. Glisser ce contenu dans GitHub, dans `spacelonx-site / nenette`.
8. Commit message :

```text
Clean deploy Nénette AI V7.1
```

## Test final

```text
https://silversurfer239.github.io/spacelonx-site/nenette/?v=71
```
