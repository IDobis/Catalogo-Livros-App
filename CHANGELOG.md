# Changelog

## V.05

### Animação ao abrir
- Efeito de entrada nos cards ao rolar ou abrir listas (fade + slide de cima).
- Animação aplicada ao **card inteiro**, compatível com drag & drop.
- Opção em **Configurações → Animação ao abrir**:
  - **Smooth** — entrada mais lenta, com stagger maior.
  - **Linear** — entrada mais rápida, com stagger menor.
  - **None** — sem animação.
- Preferência salva no `localStorage` e lida no primeiro frame (sem flash de preset errado após F5).

### Correções de carregamento
- Estado de loading nas listas evita piscar a mensagem “Nenhuma coleção cadastrada” antes dos dados chegarem do Tauri.
- Sincronização de listas ajustada para não resetar a ordem durante o arraste (drag & release).

### Build
- Versão **0.5.0** (`package.json`, Tauri, Cargo).
- Script `rename-msi.mjs` renomeia o instalador para `Catalogo_Colecoes_0.5_x64.msi` após `npm run tauri:build`.

### Frontend
- `ScrollReveal.tsx`, `scrollAnimation.ts` (presets centralizados).
- `AppSettings` com leitura síncrona de preferências do `localStorage`.

---

## V.04

### Backup
- Ícones de importar e exportar invertidos no diálogo de backup (exportar = upload, importar = download).

### Capas
- Escolha de capa ao cadastrar coleção, capítulo ou item (preview antes de salvar).
- Correção de cache ao remover e escolher outra capa (mesmo caminho no disco).

### Validação e limites do banco
- Validação de título obrigatório no formulário de coleção (mensagem no campo, sem erro genérico).
- Limites padronizados:
  - **Título:** até 50 caracteres em `title`; de 51 a 100 em `long_titulo` (migração automática).
  - **Descrição:** até 800 caracteres.
- Contadores de caracteres nos formulários.

### Interface
- Barra de pesquisa em coleções, capítulos e itens (título, título longo e descrição).
- Pesquisa na mesma linha do título e do botão de criar.
- Descrição exibida no cabeçalho ao abrir uma coleção ou capítulo.

### Backend (Rust)
- Novo módulo `text_limits.rs` com validação e divisão de títulos.
- Coluna `long_titulo` em `books`, `chapters` e `items`.
- Comandos `pick_image_file` e `set_*_cover_from_path` para capas no cadastro.

### Frontend
- `SearchField`, `fieldLimits.ts`, `search.ts`.
- `BookCover` com bust de cache via `cacheKey`.
