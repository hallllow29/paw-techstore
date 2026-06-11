import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) =>
    cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});

// Só aceita imagens
function fileFilter(_req, file, cb) {
  if (file.mimetype.startsWith('image/')) return cb(null, true);
  cb(new Error('Apenas ficheiros de imagem são permitidos'));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB por imagem
});

/**
 * Aceita a imagem de destaque (1) + galeria (até 4) num pedido multipart.
 * Os ficheiros ficam em req.files.imagemDestaque / req.files.imagens.
 */
export const uploadProductImages = upload.fields([
  { name: 'imagemDestaque', maxCount: 1 },
  { name: 'imagens', maxCount: 4 },
]);

/** Converte um ficheiro multer no caminho público servido pela API. */
export const toPublicPath = (file) => `/uploads/${file.filename}`;
