# Vira-Lata Racing 0.5

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
| Derrapar e carregar o mini-turbo | Segure Espaço enquanto vira em velocidade e solte para ativar |
| Trocar piloto | Shift ou botão **Trocar piloto** |
| Usar o item do parceiro | E ou botão **Item** no toque |
| Voltar à pista | R |
| Pausar ou continuar | Esc |

Em telas sensíveis ao toque, os botões aparecem durante a corrida.

Cada personagem leva um item. A caixa de interrogação abastece primeiro o parceiro, se ele tiver espaço, e depois o piloto. O contorno amarelo indica o inventário que pode ser usado. A troca de assentos mantém os dois itens.

Na Volta do Ribeirão, a curva longa do lado direito permite carregar os três níveis de drift. As faíscas mudam de amarelo para azul e vermelho. Solte Espaço para liberar o mini-turbo. Cada nível eleva o limite de velocidade em 15%, 25% ou 40% por 0,8 s, 1,5 s ou 2,5 s, respectivamente. Use o raio amarelo do inventário para ativar o turbo de item.

## Build e Vercel

Execute `npm run build` para gerar `dist/` e `npm run preview` para testar o build por HTTP. O ZIP já inclui o build verificado.

Na Vercel, importe o repositório com esta pasta como raiz. O `vercel.json` configura Vite, instala com `npm ci`, compila com `npm run build` e publica a pasta `dist`. Use Node.js 24.
