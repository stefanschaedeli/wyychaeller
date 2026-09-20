// Renders the app icon (a serif "W" on bordeaux) into the sizes phones ask for.
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const ICON_DIRECTORY = "public/icons";
const ICON_SIZES = [
  { fileName: "icon-192.png", size: 192 },
  { fileName: "icon-512.png", size: 512 },
  { fileName: "apple-touch-icon.png", size: 180 },
];

const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#7b2d3a"/>
  <rect x="36" y="36" width="440" height="440" fill="none" stroke="#f6f1e7" stroke-width="6"/>
  <text x="256" y="345" text-anchor="middle" font-family="Georgia, serif" font-style="italic"
        font-size="300" fill="#f6f1e7">W</text>
</svg>`;

await mkdir(ICON_DIRECTORY, { recursive: true });
for (const { fileName, size } of ICON_SIZES) {
  await sharp(Buffer.from(iconSvg))
    .resize(size, size)
    .png()
    .toFile(`${ICON_DIRECTORY}/${fileName}`);
}
console.warn(`Generated ${ICON_SIZES.length} icons in ${ICON_DIRECTORY}`);
