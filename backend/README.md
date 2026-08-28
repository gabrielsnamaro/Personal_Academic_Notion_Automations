# Backend - Notion Automation

Módulo backend responsável pela comunicação com a API do Notion, extração de blocos, parsing de elementos (tarefas, listas, cabeçalhos) e lógica de automação.

## Estrutura

- `src/config.js`: Carregamento e validação de variáveis de ambiente.
- `src/main.js`: Ponto de entrada do serviço de automação.
- `src/notion/`:
  - `NotionController.js`: Métodos de requisição à API do Notion (`getPage`, `getPageBlocks`).
  - `Block.js`: Modelo de bloco do Notion.
  - `Page.js`: Modelo de página e extração de elementos/blocos.
  - `elements/`: Construtores e elementos estruturados (`ElementBuilder`, `Task`, `Element`, `Divider`, `Title`).
- `src/util/`:
  - `http/`: Cliente HTTP e classes auxiliares de `Headers`.

## Scripts

```bash
npm start       # Inicia a execução do backend (node src/main.js)
npm run dev     # Inicia em modo watch com tsx
```
