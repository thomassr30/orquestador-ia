#!/usr/bin/env node
// Convierte PDF / DOCX / TXT / MD / imágenes a Markdown.
// Uso: node to-md.js <entrada> <salida.md> [--append]
'use strict';
const fs = require('fs');
const path = require('path');

const [input, output] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const append = process.argv.includes('--append');
if (!input || !output) {
  console.error('Uso: node to-md.js <entrada> <salida.md> [--append]');
  process.exit(1);
}
if (!fs.existsSync(input)) { console.error(`No existe: ${input}`); process.exit(1); }

const ext = path.extname(input).toLowerCase();
const IMG = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];

function tryRequire(name) { try { return require(name); } catch { return null; } }

async function convert() {
  if (ext === '.pdf') {
    // 1) pdfjs-dist (instalado por install.js)  2) pdftotext (si existe)  3) lectura directa por el modelo
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(input)), useSystemFonts: true, isEvalSupported: false }).promise;
      const parts = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const tc = await page.getTextContent();
        let line = '', out = '', lastY = null;
        for (const it of tc.items) {
          const y = it.transform ? Math.round(it.transform[5]) : null;
          if (lastY !== null && y !== lastY) { out += line.trimEnd() + '\n'; line = ''; }
          line += it.str + (it.hasEOL ? '\n' : '');
          lastY = y;
        }
        out += line;
        parts.push(`<!-- página ${i} -->\n${out.trim()}`);
      }
      const text = parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
      const plain = text.replace(/<!-- página \d+ -->/g, '').trim();
      return { text, pages: doc.numPages, scanned: plain.length < 40 * doc.numPages };
    } catch (e) {
      const { spawnSync } = require('child_process');
      const r = spawnSync('pdftotext', ['-layout', input, '-'], { encoding: 'utf8' });
      if (r.status === 0 && r.stdout.trim()) return { text: r.stdout.trim(), pages: null, scanned: false };
      return { text: '', pages: 0, note: `No se pudo extraer texto (${e.message}). Lee el PDF directamente.`, scanned: true };
    }
  }
  if (ext === '.docx') {
    const mammoth = tryRequire('mammoth');
    if (!mammoth) return { text: '', pages: 0, note: 'mammoth no instalado: lee el DOCX directamente.', scanned: true };
    const r = await mammoth.extractRawText({ path: input });
    return { text: r.value.replace(/\n{3,}/g, '\n\n').trim(), pages: null, scanned: false };
  }
  if (['.txt', '.md', '.csv', '.json', '.log'].includes(ext)) {
    return { text: fs.readFileSync(input, 'utf8').trim(), pages: null, scanned: false };
  }
  if (IMG.includes(ext)) {
    return { text: `![${path.basename(input)}](${path.resolve(input).replace(/\\/g, '/')})\n\n> Imagen: describir su contenido relevante (pantalla, error, texto visible).`, pages: 1, scanned: true, image: true };
  }
  return { text: '', pages: 0, note: `Formato ${ext} no soportado: lee el archivo directamente.`, scanned: true };
}

convert().then(r => {
  const header = `\n## Fuente: ${path.basename(input)}\n_Convertido: ${new Date().toISOString()}${r.pages ? ` · páginas: ${r.pages}` : ''}_\n\n`;
  const body = r.note ? `> ${r.note}\n` : r.text + '\n';
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  const exists = fs.existsSync(output);
  if (append && exists) fs.appendFileSync(output, header + body);
  else fs.writeFileSync(output, `# Entrada del cambio\n${header}${body}`);
  console.log(JSON.stringify({ output, pages: r.pages, chars: r.text.length, scanned: !!r.scanned, image: !!r.image, note: r.note || null }));
}).catch(e => { console.error(`Error convirtiendo ${input}: ${e.message}`); process.exit(2); });
