# Nénette AI V7 Web3 Terminal — Weekend Deployment

## Dossier recommandé

Mettre le contenu de cette archive dans :

`/nenette-v7/`

ou, si vous voulez remplacer la version actuelle :

`/nenette/`

## Test local

```bash
py -m http.server 9000
```

Puis ouvrir :

```text
http://127.0.0.1:9000/index.html
```

## Bouton à ajouter sur le site SpacelonX

```html
<a class="launch-nenette" href="/nenette-v7/">
  LAUNCH NÉNETTE AI
</a>
```

## CSS du bouton

```css
.launch-nenette {
  display:inline-flex;
  padding:14px 22px;
  border-radius:999px;
  color:#020617;
  background:linear-gradient(135deg,#fff3b0,#f5c542);
  font-weight:900;
  text-decoration:none;
  box-shadow:0 16px 44px rgba(245,197,66,.28);
}
```

## À vérifier avant mise en ligne

- Dashboard s’ouvre.
- Web3 Terminal s’ouvre.
- Market affiche le graphique ou au minimum le lien DexScreener.
- Blockchain lit le dernier bloc Polygon.
- Portfolio accepte une adresse 0x.
- Staking calcule Bronze / Silver / Gold / Diamond.
- Security affiche le statut du contrat et de la LP.
- Console navigateur sans erreur bloquante.

## Ce qui reste post-déploiement

- WalletConnect / Reown : nécessite un Project ID.
- Staking on-chain : nécessite contrat audité + ABI.
- Holder count réel : nécessite indexer API.
- Whale Tracker : nécessite backend ou service d’indexation.
