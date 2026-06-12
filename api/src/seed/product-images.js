/* eslint-disable security/detect-non-literal-fs-filename -- script de seed: caminhos derivam de EAN controlado */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Product } from '../models/product.model.js';
import '../models/category.model.js'; // regista o modelo Category para o populate
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const ASSETS_DIR = path.join(__dirname, '..', '..', 'seed-assets');
const PHOTO_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'avif'];

const safe = (s) => String(s).replace(/[^a-zA-Z0-9._-]/g, '');

const esc = (s = '') =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** Foto real em seed-assets/<EAN>.<ext>, se existir. */
function findRealPhoto(ean) {
  for (const ext of PHOTO_EXTS) {
    const file = path.join(ASSETS_DIR, `${safe(ean)}.${ext}`);
    if (fs.existsSync(file)) return { file, ext };
  }
  return null;
}

/** Mapeia o nome da categoria a uma silhueta de dispositivo. */
function shapeFor(nome = '') {
  const n = nome.toLowerCase();
  if (/(port[aá]t|laptop|notebook)/.test(n)) return 'laptop';
  if (/(desktop|torre|comput)/.test(n)) return 'desktop';
  if (/(smartphone|telem|telefone)/.test(n)) return 'phone';
  if (/(monitor|ecr)/.test(n)) return 'monitor';
  if (/(teclado)/.test(n)) return 'keyboard';
  if (/(rato|mouse)/.test(n)) return 'mouse';
  return 'chip';
}

/** Devolve as formas SVG (sem preenchimento) da silhueta do dispositivo. */
function iconFor(shape) {
  switch (shape) {
    case 'laptop':
      return `<rect x="205" y="120" width="190" height="125" rx="10"/><path d="M180 250 h240 l22 30 H158 z"/>`;
    case 'desktop':
      return `<rect x="250" y="115" width="100" height="170" rx="12"/><circle cx="300" cy="150" r="9"/><line x1="278" y1="190" x2="322" y2="190"/><line x1="278" y1="218" x2="322" y2="218"/>`;
    case 'phone':
      return `<rect x="252" y="105" width="96" height="200" rx="18"/><line x1="286" y1="128" x2="314" y2="128"/><circle cx="300" cy="284" r="8"/>`;
    case 'monitor':
      return `<rect x="195" y="115" width="210" height="140" rx="10"/><line x1="300" y1="255" x2="300" y2="290"/><line x1="255" y1="292" x2="345" y2="292"/>`;
    case 'keyboard':
      return `<rect x="170" y="170" width="260" height="120" rx="14"/><line x1="200" y1="205" x2="400" y2="205"/><line x1="200" y1="235" x2="400" y2="235"/><line x1="245" y1="265" x2="355" y2="265"/>`;
    case 'mouse':
      return `<path d="M300 110 c-42 0 -66 32 -66 74 v52 c0 38 30 66 66 66 s66 -28 66 -66 v-52 c0 -42 -24 -74 -66 -74 z"/><line x1="300" y1="132" x2="300" y2="168"/>`;
    default:
      return `<rect x="225" y="135" width="150" height="150" rx="10"/><rect x="258" y="168" width="84" height="84" rx="6"/><line x1="255" y1="135" x2="255" y2="115"/><line x1="300" y1="135" x2="300" y2="115"/><line x1="345" y1="135" x2="345" y2="115"/><line x1="255" y1="285" x2="255" y2="305"/><line x1="300" y1="285" x2="300" y2="305"/><line x1="345" y1="285" x2="345" y2="305"/>`;
  }
}

/** SVG de placeholder on-brand (gradiente + silhueta + marca + categoria). */
function placeholderSvg(brand, categoria, shape) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450" role="img" aria-label="${esc(brand)} ${esc(categoria)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef3fb"/><stop offset="1" stop-color="#dbe6fb"/></linearGradient>
    <linearGradient id="ic" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#06b6d4"/></linearGradient>
  </defs>
  <rect width="600" height="450" fill="url(#bg)"/>
  <circle cx="545" cy="55" r="130" fill="#06b6d4" opacity="0.07"/>
  <g fill="none" stroke="url(#ic)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">${iconFor(shape)}</g>
  <text x="300" y="372" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="40" font-weight="700" fill="#0b1220">${esc(brand)}</text>
  <text x="300" y="404" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="20" fill="#64748b">${esc(categoria)}</text>
</svg>`;
}

/**
 * Garante uma imagem de destaque a cada produto:
 *  - foto real em seed-assets/<EAN>.<ext>, se existir (ganha sempre);
 *  - senão, um placeholder on-brand gerado.
 * Imagens carregadas manualmente na loja (nomes UUID) são preservadas.
 * Assume uma ligação à BD já aberta.
 */
export async function assignProductImages() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const produtos = await Product.find().populate('categoria', 'nome');
  let real = 0;
  let placeholders = 0;
  let mantidas = 0;

  for (const p of produtos) {
    const ean = safe(p.ean);
    const asset = findRealPhoto(p.ean);
    if (asset) {
      const dest = `prod-${ean}.${asset.ext}`;
      fs.copyFileSync(asset.file, path.join(UPLOAD_DIR, dest));
      p.imagemDestaque = `/uploads/${dest}`;
      await p.save();
      real++;
      continue;
    }

    const atual = p.imagemDestaque ?? '';
    const geravel =
      atual === '' || atual.includes('/uploads/ph-') || atual.includes('/uploads/prod-');
    if (!geravel) {
      mantidas++;
      continue;
    }

    const nomeCat = p.categoria?.nome ?? 'Produto';
    const svg = placeholderSvg(p.marca, nomeCat, shapeFor(nomeCat));
    const dest = `ph-${ean}.svg`;
    fs.writeFileSync(path.join(UPLOAD_DIR, dest), svg, 'utf8');
    p.imagemDestaque = `/uploads/${dest}`;
    await p.save();
    placeholders++;
  }

  logger.info(
    `Imagens de produtos: ${real} reais, ${placeholders} placeholders, ${mantidas} mantidas.`
  );
  return { real, placeholders, mantidas };
}
