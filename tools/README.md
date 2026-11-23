# Autoria dos modelos 3D

O jogo utiliza quatro GLBs versionados em `public/models`. O estúdio de autoria permite editar e regenerar esses arquivos com Three.js. O Blender também pode abrir os modelos para inspeção e edição.

1. Rode `npm run dev` e abra `/tools/studio.html` no endereço exibido pelo Vite.
2. Clique em **Exportar modelos** e salve os quatro GLBs em uma pasta separada.
3. Rode `node tools/compress-models.mjs CAMINHO_DA_PASTA` a partir da raiz do projeto para instalar os arquivos comprimidos em `public/models`.
4. Para aplicar quantização somente à vegetação estática, rode `npx @gltf-transform/cli@4.5.1 meshopt CAMINHO_DA_PASTA/Grove.glb public/models/Grove.glb --level medium --quantization-volume scene`.
5. Rode `npm test` e valide o jogo pelo endereço do Vite.

Os GLBs articulados usam compressão sem quantizar nós e transforms, porque o jogo controla escalas e rotações diretamente. Preserve os nomes das peças, os alvos de deformação e os metadados dos braços e rodas ao substituir um modelo. `src/models.js` liga o rig de cada asset às poses da corrida. O clipe `Respirar` movimenta tronco, peito e cauda, enquanto o jogo controla direção, olhar, mandíbula, orelhas, lenço, troca e lançamento.

