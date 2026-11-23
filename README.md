# Vira-Lata Racing 0.11

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

Em paisagem, use as setas de um lado e Drift, Freio e Item do outro. Para corrigir a direção durante um drift, deslize entre as duas setas mantendo o outro dedo em Drift. Solte Drift para liberar o mini-turbo acumulado.

Em **Controles mobile**, no menu principal ou na pausa, ajuste o tamanho e a opacidade, inverta os lados ou ative a aceleração automática. O freio tem prioridade sobre a aceleração automática. As preferências são salvas no navegador. O botão **Restaurar padrão** volta para tamanho de 100%, opacidade de 72% e aceleração automática. Desative a aceleração automática para exibir o acelerador.

Cada personagem leva um item. A caixa de interrogação abastece primeiro o parceiro, se ele tiver espaço, e depois o piloto. O HUD mostra o item que pode ser usado. Abra a pausa para consultar os dois inventários ou reiniciar a corrida. A troca de assentos mantém os dois itens.

Na Volta do Ribeirão, a curva longa do lado direito permite carregar os três níveis de drift. As faíscas mudam de amarelo para azul e vermelho. Solte Espaço para liberar o mini-turbo. Cada nível eleva o limite de velocidade em 15%, 25% ou 40% por 0,8 s, 1,5 s ou 2,5 s, respectivamente. Use o raio amarelo do inventário para ativar o turbo de item.

A pista tem 35,2 unidades de largura e 12 posições de largada. A corrida atual é solo. Em **Qualidade gráfica**, escolha Automática, Baixa, Média ou Alta. A configuração automática ajusta o custo da renderização conforme o tempo de quadro.

## Build e Vercel

Execute `npm test` para verificar a aceleração, marcha à ré, aderência, turbo, colisões e compressão da suspensão.

Os arquivos de autoria e as instruções para regenerar os modelos estão em `tools/`. O jogo carrega os quatro GLBs de `public/models/` automaticamente.

Execute `npm run build` para gerar `dist/` e `npm run preview` para testar o build por HTTP. O ZIP já inclui o build verificado.

Na Vercel, importe o repositório com esta pasta como raiz. O `vercel.json` configura Vite, instala com `npm ci`, compila com `npm run build` e publica a pasta `dist`. Use Node.js 24.
