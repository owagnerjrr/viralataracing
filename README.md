# Dupla Kart 0.3

Use Node.js 24. No terminal, abra a pasta extraída e execute:

```sh
npm install
npm run dev
```

Abra o endereço HTTP exibido pelo Vite, normalmente `http://localhost:5173/`. Clique em **Começar corrida**. O jogo requer WebGL 2.

| Ação | Teclado |
| --- | --- |
| Acelerar | W ou ↑ |
| Frear e engatar a ré | S ou ↓ |
| Virar | A/D ou ←/→ |
| Derrapar e carregar o mini-turbo | Segure Espaço enquanto vira em velocidade |
| Trocar piloto | Shift |
| Usar item | E |
| Voltar à pista | R |
| Pausar ou continuar | Esc |

Em telas sensíveis ao toque, os botões aparecem durante a corrida.

## Build e Vercel

Execute `npm run build` para gerar `dist/` e `npm run preview` para testar o build por HTTP. O ZIP já inclui o build verificado.

Na Vercel, importe o repositório com esta pasta como raiz. O `vercel.json` configura Vite, instala com `npm ci`, compila com `npm run build` e publica a pasta `dist`. Use Node.js 24.
