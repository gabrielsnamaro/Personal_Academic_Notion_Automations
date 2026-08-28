# Personal Academic Notion Automations

Automação geral da página de organização acadêmica no Notion, estruturado em arquitetura modular contendo **backend** e **frontend**.

## Estrutura do Repositório

```text
.
├── backend/                  # Módulo de backend (Node.js)
│   ├── src/
│   │   ├── config.js         # Configurações e variáveis de ambiente
│   │   ├── main.js           # Ponto de entrada da aplicação
│   │   ├── notion/           # Controladores e modelos Notion (Pages, Blocks, Elements)
│   │   └── util/             # Utilitários e cliente HTTP customizado
│   ├── .env.example          # Exemplo de configuração de variáveis
│   ├── package.json          # Dependências e scripts do backend
│   └── README.md
├── frontend/                 # Módulo de interface do usuário
│   ├── package.json
│   └── README.md
├── package.json              # Orquestrador com workspaces
└── README.md
```

## Como Executar

### Backend

1. Configure as variáveis de ambiente em `backend/.env` baseando-se em `backend/.env.example`:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Execute o backend:
   ```bash
   # A partir da raiz
   npm run start:backend
   # Modo watch
   npm run dev:backend

   # Ou a partir do diretório backend
   cd backend
   npm start
   ```
