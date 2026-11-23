# Caramelo — candidato em desenvolvimento

Este diretório contém o primeiro estudo original feito no Blender para a reformulação gráfica. Não é uma versão aprovada para produção. O jogo continua carregando os quatro modelos da versão 0.11, sem alterações na física, pista ou controles.

- `caramelo.blend`: escultura, UVs, materiais empacotados, armature com pesos, morph Blink e 13 ações.
- `caramelo_fur_base.png`, `caramelo_fur_normal.png`: microdetalhe de pelagem curta, gerado deterministicamente pelo script.
- `caramelo_iris_amber.png`: textura radial original da íris.
- `../../tools/blender/caramelo.py`: fonte reproduzível de modelagem e exportação.
- `../../public/models/candidates/`: três GLBs experimentais; não substituem os aprovados.

O rosto usa uma malha contínua modelada por seções; o corpo recebe união voxel e relaxamento das transições de ombros e quadris. Esferas são usadas apenas para anatomia que pede superfícies arredondadas, como globos oculares e almofadas, e não como construção do crânio e tronco. O esqueleto é independente do rig procedural de 0.11. Ainda não existe adaptador de corrida para esse esqueleto.

## Regeneração

Na raiz do repositório, usando Blender 5.3 e Node:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.3\blender.exe' -b --python tools/blender/caramelo.py -- --output CAMINHO_DOS_RENDERS
node tools/compress-models.mjs public/models/candidates public/models/candidates caramelo_high caramelo_medium caramelo_low
npm.cmd test
npm.cmd run dev
```

Abra `/tools/character-review.html` para inspecionar LOD, ações, piscar, topologia e métricas da prévia. A média e o p95 vêm de janelas de 180 quadros visíveis; representam somente a prévia no computador utilizado, não a corrida completa ou um celular físico.

Para comparação sob a mesma iluminação e câmera:

```powershell
node tools/decode-glb.mjs CAMINHO_BASELINE
& 'C:\Program Files\Blender Foundation\Blender 5.3\blender.exe' -b --python tools/blender/review-caramelo.py -- --baseline CAMINHO_BASELINE --output CAMINHO_DOS_RENDERS
```

As poses de braço dos modelos antigos são reconstruídas como no código da corrida, pois o GLB original deixa essas peças sem posicionamento até a atualização procedural. O kart mostrado na comparação é o kart original de 0.11. Os arquivos de Mario e Toad não são importados pelo gerador e nenhum recurso deles integra o candidato.

## Limites e validações pendentes

Este é um estudo inicial, abaixo da referência cinematográfica pedida. O rosto, a distribuição da pelagem, os dedos traseiros, a conexão da mandíbula, o acabamento das orelhas e o encaixe nos dois assentos precisam de mais trabalho. Ações esqueléticas exportadas não equivalem a todas as interações integradas e validadas na corrida.

O validador glTF não encontrou erros, mas reportou avisos de geração de tangentes e de meshes skinned sob um pai. Esses avisos exigem atenção antes da integração e dos testes de transformação. Os arquivos ainda têm muitos draw calls e geometria para assumir bom desempenho mobile. Os GLBs usam Meshopt e PNG; KTX2/Basis ainda não foi implementado. Não há medição em celular real.

Gato, kart, vegetação, pista, renderização da corrida, qualidade ultra e efeitos permanecem no estado 0.11. A instalação Unreal 5.8.4 foi localizada, mas não executada: nesta etapa, Blender e a prévia WebGL permitem avaliar os arquivos que efetivamente podem ser usados no navegador. Não foi realizada migração ou publicação na Vercel.
