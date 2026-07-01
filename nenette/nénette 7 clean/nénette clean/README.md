# Nénette AI V7.1 Clean Deploy

Version propre destinée à remplacer la structure provisoire :

`/nenette/nenette/`

par une structure propre :

`/nenette/`

## Structure finale attendue

```text
spacelonx-site/
  nenette/
    index.html
    assets/
    config/
    docs/
    modules/
    services/
    manifest.json
    service-worker.js
    README.md
```

## Mauvaise structure à éviter

```text
spacelonx-site/
  nenette/
    nenette/
      index.html
```

## Test local

```bash
py -m http.server 9020
```

Puis ouvrir :

```text
http://127.0.0.1:9020/index.html
```

## Badge attendu

`V7.1 CLEAN DEPLOY`
