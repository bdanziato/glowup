# Glow Up

App de rotina para celular (PWA): Planner, Dieta, Treino e Glow Up.

- Site: https://glowup-planner.netlify.app
- O app fica em `public/` (HTML, CSS e JS puros, sem build).
- `netlify/functions/` envia os avisos com o app fechado (Web Push). Precisa das variáveis `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` no Netlify; os horários ficam no Netlify Blobs (store `glowup-push`).
- Os dados ficam só no navegador do celular (`localStorage`, chave `glowup.v1`). O backup é um arquivo JSON exportado e importado pelo app.
- `sw.js` faz o app funcionar offline. Ao mudar arquivos estáticos, aumente a versão em `CACHE`.
