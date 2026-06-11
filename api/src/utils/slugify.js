/**
 * Gera um slug URL-friendly a partir de um texto.
 * 'Portátil ASUS 15.6"' -> 'portatil-asus-15-6'
 */
export function slugify(text) {
  return String(text)
    .normalize('NFD') // separa acentos das letras
    .replace(/[̀-ͯ]/g, '') // remove os combining marks (acentos)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // não-alfanuméricos -> hífen
    .replace(/^-+|-+$/g, ''); // tira hífens nas pontas
}
