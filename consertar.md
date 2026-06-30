# Consertar UI bugada na build

O `tauri:dev` funciona porque usa o servidor Next.js (`http://localhost:3000`).  
Na build, o app carrega arquivos estáticos da pasta `out` pelo protocolo interno do Tauri — e o **MUI/Emotion não consegue injetar os estilos** corretamente nesse ambiente.

Siga os passos **na ordem**. Pare no primeiro que resolver.

---

## 1. Testar o frontend estático no navegador

Isso separa problema do Next.js de problema do Tauri.

```powershell
cd C:\Users\Dobis\Documents\GitHub\Catalogo-Livros-App
npm run build
npx serve out -p 3456
```

Abra **http://localhost:3456** no Chrome/Edge.

| Resultado | Significa |
|-----------|-----------|
| UI **normal** no navegador, **bugada** no .exe | Problema específico do Tauri (passos 2–4) |
| UI **bugada** nos dois | Problema do Next.js + MUI na exportação estática (passo 5) |

Feche o `serve` depois (`Ctrl+C` no terminal).

---

## 2. Build limpa (obrigatório)

Feche **tudo** antes:

- App instalado (`Catalogo Colecoes`)
- `npm run tauri:dev`
- Explorer aberto na pasta `out`

```powershell
cd C:\Users\Dobis\Documents\GitHub\Catalogo-Livros-App

Remove-Item -Recurse -Force out -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force src-tauri\target -ErrorAction SilentlyContinue

npm run tauri:build
```

### Onde está o executável

| Tipo | Caminho |
|------|---------|
| Portátil | `src-tauri\target\release\app.exe` |
| Instalador | `src-tauri\target\release\bundle\nsis\` |

---

## 3. Desinstalar versão antiga antes de testar

1. Painel de Controle → Desinstalar **Catalogo Colecoes**
2. Teste primeiro o **`app.exe` portátil** (sem instalador)
3. Se estiver ok, aí sim rode o instalador `.exe` novo

Instalar por cima da versão antiga pode manter frontend quebrado em cache.

---

## 4. Ver erros no console (DevTools)

Se ainda estiver bugado, habilite DevTools **temporariamente** em `src-tauri/tauri.conf.json`:

```json
"windows": [
  {
    "title": "Catálogo de Coleções",
    "devtools": true,
    ...
  }
]
```

Rebuild, abra o app, pressione **F12** e veja a aba **Console**.

Erros comuns:

| Erro | Causa |
|------|-------|
| `Loading chunk ... failed` | JS não carregou (caminho de assets) |
| `Minified React error` | Falha de hidratação Next.js + MUI |
| `Refused to apply inline style` | CSP bloqueando Emotion |

> O projeto já está com `"csp": null` no `tauri.conf.json` (padrão de templates Tauri que funcionam).  
> Remova `"devtools": true` depois de consertar.

---

## 5. Se nada funcionar — solução definitiva

**Next.js 16 App Router + MUI (Emotion) + Tauri** é uma combinação instável em produção.  
O `tauri:dev` engana porque usa servidor; a build estática não.

### Opção recomendada: migrar frontend para Vite + React

- Padrão da comunidade Tauri
- MUI funciona sem SSR/hidratação
- Mesmo código React, sem App Router

Passos gerais:

1. Criar projeto Vite (`npm create vite@latest`)
2. Copiar `src/components`, `src/providers`, `src/lib`, `src/theme`
3. Apontar `frontendDist` do Tauri para `dist`
4. Remover Next.js

### Opção alternativa: trocar MUI por Tailwind CSS

Templates oficiais Tauri + Next.js usam Tailwind (CSS estático no build, sem injeção runtime).  
Exige refatorar os componentes.

---

## Checklist rápido

- [ ] Testei `out` no navegador (`npx serve out`)
- [ ] Fechei app instalado e `tauri:dev` antes de buildar
- [ ] Apaguei `out` e `src-tauri\target`
- [ ] Rodei `npm run tauri:build` sem erro
- [ ] Desinstalei versão antiga
- [ ] Testei `app.exe` portátil antes do instalador
- [ ] Vi o Console (F12) se ainda estiver bugado

---

## Resumo

| Ambiente | Por que funciona / não funciona |
|----------|----------------------------------|
| `tauri:dev` | Next.js serve tudo via `localhost:3000` |
| Build (.exe) | Arquivos estáticos + MUI injeta CSS via JS → quebra no Tauri |

Se após os passos 1–4 a UI continuar bugada, a correção real é **sair do Next.js App Router** (passo 5).
