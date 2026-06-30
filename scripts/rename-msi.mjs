import { readdir, rename, unlink } from "fs/promises";
import { join } from "path";

const MSI_DIR = join("src-tauri", "target", "release", "bundle", "msi");
const TARGET_NAME = "Catalogo_Colecoes_0.5_x64.msi";

const files = await readdir(MSI_DIR);
const sourceName = files.find(
  (file) => file.endsWith(".msi") && file.includes("_x64_"),
);

if (!sourceName) {
  console.error(`MSI x64 não encontrado em ${MSI_DIR}`);
  process.exit(1);
}

const sourcePath = join(MSI_DIR, sourceName);
const targetPath = join(MSI_DIR, TARGET_NAME);

if (sourceName === TARGET_NAME) {
  console.log(`Instalador já está como ${TARGET_NAME}`);
  process.exit(0);
}

try {
  await unlink(targetPath);
} catch {
  // destino ainda não existe
}

await rename(sourcePath, targetPath);
console.log(`Instalador renomeado: ${sourceName} -> ${TARGET_NAME}`);
