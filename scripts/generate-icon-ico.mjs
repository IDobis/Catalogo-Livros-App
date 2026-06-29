import { writeFileSync } from "node:fs";
import { join } from "node:path";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const iconsDir = join(process.cwd(), "src-tauri", "icons");

async function toSquarePng(input, size) {
  return sharp(join(iconsDir, input))
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

const sq32 = await toSquarePng("a32.png", 32);
const sq128 = await toSquarePng("a126.png", 128);
const sq256 = await toSquarePng("a256.png", 256);

const ico = await pngToIco([sq32, sq128, sq256]);
writeFileSync(join(iconsDir, "icon.ico"), ico);

const square256Path = join(iconsDir, "icon-square-256.png");
writeFileSync(square256Path, sq256);

console.log("icon.ico gerado a partir de a32, a126 e a256");
