/**
 * Renders the PWA icons, favicon.ico, apple-touch-icon and the Open Graph share image.
 * Requires a running dev or preview server:
 *   npm run dev            (in another terminal)
 *   npm run assets         (optionally: URL=http://localhost:4173 PW_CHANNEL=chrome npm run assets)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const URL = process.env.URL ?? 'http://localhost:5173/';
const channel = process.env.PW_CHANNEL || undefined;
const svg = readFileSync('public/favicon.svg', 'utf8');

/** Wraps PNG bytes in a single-image .ico container (PNG-compressed ICO is supported everywhere). */
function pngToIco(png: Buffer, size: number): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const dir = Buffer.alloc(16);
  dir.writeUInt8(size >= 256 ? 0 : size, 0);
  dir.writeUInt8(size >= 256 ? 0 : size, 1);
  dir.writeUInt8(0, 2);
  dir.writeUInt8(0, 3);
  dir.writeUInt16LE(1, 4);
  dir.writeUInt16LE(32, 6);
  dir.writeUInt32LE(png.length, 8);
  dir.writeUInt32LE(6 + 16, 12);
  return Buffer.concat([header, dir, png]);
}

async function main() {
  const browser = await chromium.launch({ channel, args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] });
  mkdirSync('public/icons', { recursive: true });

  const icon = async (size: number, padding: number, bg: string) => {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<html><body style="margin:0;background:${bg};display:grid;place-items:center;width:${size}px;height:${size}px">
        <div style="width:${size - padding * 2}px;height:${size - padding * 2}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
      </body></html>`,
    );
    const png = await page.screenshot({ omitBackground: false });
    await page.close();
    return png;
  };
  writeFileSync('public/icons/icon-192.png', await icon(192, 0, '#121418'));
  writeFileSync('public/icons/icon-512.png', await icon(512, 0, '#121418'));
  writeFileSync('public/icons/icon-maskable-512.png', await icon(512, 80, '#121418'));
  writeFileSync('public/apple-touch-icon.png', await icon(180, 10, '#121418'));
  writeFileSync('public/favicon.ico', pngToIco(await icon(32, 0, '#121418'), 32));

  // Open Graph image: a live attract-mode frame with the logo on top.
  const game = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await game.goto(URL);
  await game.waitForTimeout(6000);
  await game.addStyleTag({ content: '#ui-root{display:none!important}.scanlines::after{display:none}' });
  await game.waitForTimeout(300);
  const frame = (await game.screenshot()).toString('base64');
  await game.close();
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await og.goto(URL);
  await og.evaluate(async () => document.fonts.ready);
  await og.setContent(
    `<html><head><link rel="stylesheet" href="${URL}src/ui/theme/global.css"></head>
    <body style="margin:0;width:1200px;height:630px;overflow:hidden;font-family:Rajdhani,'Arial Narrow',sans-serif">
      <div style="position:absolute;inset:0;background:url(data:image/png;base64,${frame}) center/cover;filter:saturate(1.1) brightness(0.8)"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,8,10,0.92) 0%,rgba(7,8,10,0.55) 55%,rgba(7,8,10,0.1))"></div>
      <div style="position:absolute;left:0;right:0;top:0;height:14px;background:repeating-linear-gradient(-45deg,#FFC21A 0 14px,#111 14px 28px)"></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:14px;background:repeating-linear-gradient(-45deg,#FFC21A 0 14px,#111 14px 28px)"></div>
      <div style="position:absolute;left:70px;top:150px;text-transform:uppercase;font-weight:700;line-height:0.85">
        <div style="font-size:120px;letter-spacing:4px;background:linear-gradient(180deg,#fff 0%,#c4cad4 45%,#6b7380 55%,#e8ebef 100%);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 5px 0 #000)">Ironclash</div>
        <div style="display:inline-block;margin-top:12px;padding:4px 22px;font-size:46px;letter-spacing:22px;color:#111;background:#FFC21A;clip-path:polygon(14px 0,100% 0,calc(100% - 14px) 100%,0 100%)">Arena</div>
        <div style="margin-top:34px;font-size:30px;letter-spacing:3px;color:#22D3EE">Bygg · Oppgrader · Knus</div>
      </div>
    </body></html>`,
  );
  await og.waitForTimeout(800);
  writeFileSync('public/og-image.jpg', await og.screenshot({ type: 'jpeg', quality: 86 }));
  await og.close();
  await browser.close();
  console.log('Assets written to public/');
}

void main();
