// Regenera les icones PNG i el favicon.ico a partir dels SVG mestres d'/icons/ amb Edge o Chrome headless.
// Ús: node tools/fes-icones.mjs   (substitueix gen-icons.ps1, que replicava a mà la geometria del logo antic)
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
const nav = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
if (!nav) throw new Error('Cal Edge o Chrome');
const dir = mkdtempSync(join(tmpdir(), 'icones-'));
const png = (svg, mida, sortida, transparent) => {
  const html = join(dir, 'i.html');
  writeFileSync(html, `<html><body style="margin:0;background:transparent"><img src="${pathToFileURL(resolve(svg)).href}" width="${mida}" height="${mida}"></body></html>`);
  execFileSync(nav, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${mida},${mida}`, ...(transparent ? ['--default-background-color=00000000'] : []), `--screenshot=${resolve(sortida)}`, pathToFileURL(html).href], { stdio: 'ignore' });
};
png('icons/festuc-icon-any.svg', 192, 'icons/icon-192.png', true);
png('icons/festuc-icon-any.svg', 512, 'icons/icon-512.png', true);
png('icons/festuc-icon-maskable.svg', 192, 'icons/icon-maskable-192.png');
png('icons/festuc-icon-maskable.svg', 512, 'icons/icon-maskable-512.png');
png('icons/festuc-icon-maskable.svg', 180, 'icons/apple-touch-icon.png');
// favicon.ico amb PNG de 16, 32 i 48 a dins
const mides = [16, 32, 48], imgs = mides.map(m => { const f = join(dir, `f${m}.png`); png('icons/festuc-icon-any.svg', m, f, true); return readFileSync(f); });
const cap = Buffer.alloc(6 + 16 * mides.length); cap.writeUInt16LE(0, 0); cap.writeUInt16LE(1, 2); cap.writeUInt16LE(mides.length, 4);
let off = cap.length;
mides.forEach((m, i) => { const e = 6 + 16 * i; cap[e] = m; cap[e + 1] = m; cap.writeUInt16LE(1, e + 4); cap.writeUInt16LE(32, e + 6); cap.writeUInt32LE(imgs[i].length, e + 8); cap.writeUInt32LE(off, e + 12); off += imgs[i].length; });
writeFileSync('favicon.ico', Buffer.concat([cap, ...imgs]));
console.log('fet');
