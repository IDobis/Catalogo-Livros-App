# Como buildar o Catálogo de Coleções

## Pré-requisitos

- **Node.js** (LTS)
- **Rust** (`winget install Rustlang.Rustup`)
- **Visual Studio Build Tools** com "Desenvolvimento para Desktop com C++"

Se `rustc` não for reconhecido após instalar o Rust:

```powershell
$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path
rustc --version
```

Ou feche e reabra o terminal/Cursor.

---

## Instalar dependências

```powershell
cd C:\Users\LUCAS.DOBIS\Documents\GitHub\Catalogo-Livros-App
npm install
```

---

## Desenvolvimento (testar antes do .exe)

```powershell
npm run tauri:dev
```

Abre o app desktop com hot reload. SQLite e backup só funcionam via Tauri (não no `npm run dev` do navegador).

---

## Gerar o .exe

```powershell
npm run tauri:build
```

A primeira build pode demorar vários minutos.

### Onde fica o executável

| Tipo | Caminho |
|------|---------|
| .exe portátil | `src-tauri\target\release\app.exe` |
| Instalador MSI (x64) | `src-tauri\target\release\bundle\msi\Catalogo_Colecoes_0.5_x64.msi` |
| Instalador NSIS | `src-tauri\target\release\bundle\nsis\` |

---

## Dados do app

O banco SQLite fica em:

```
%APPDATA%\com.catalogo.livros\catalogo_livros.db
```

No Explorer: `Win + R` → `%APPDATA%\com.catalogo.livros`

---

## Teste rápido do .exe

1. Abrir `app.exe`
2. Cadastrar um livro
3. Exportar backup
4. Importar backup
