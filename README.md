# Glow Up

App de rotina para celular (PWA): Planner, Dieta, Treino e Glow Up.

- Site: https://glowup-planner.netlify.app
- Tudo num `index.html` (HTML, CSS e JS puros, sem build).
- Os dados ficam só no navegador do celular (`localStorage`, chave `glowup.v1`). O backup é um arquivo JSON exportado e importado pelo app.
- `sw.js` faz o app funcionar offline. Ao mudar arquivos estáticos, aumente a versão em `CACHE`.
