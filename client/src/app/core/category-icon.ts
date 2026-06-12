/**
 * Devolve a classe de um ícone Bootstrap adequado ao nome de uma categoria.
 * Usado no mega-menu e no mosaico de categorias da homepage.
 */
export function categoryIcon(nome: string): string {
  const n = (nome ?? '').toLowerCase();
  if (/(port[aá]t|laptop|notebook)/.test(n)) return 'bi-laptop';
  if (/(comput|desktop|torre|\bpc\b)/.test(n)) return 'bi-pc-display';
  if (/(compon|placa|cpu|gpu|gr[aá]fic|processador|motherboard|mem[oó]ria|\bram\b)/.test(n))
    return 'bi-cpu';
  if (/(monitor|ecr[aã]|display)/.test(n)) return 'bi-display';
  if (/(perif|rato|mouse|teclado)/.test(n)) return 'bi-keyboard';
  if (/(armazen|disco|ssd|hdd|\bpen\b|\busb\b)/.test(n)) return 'bi-device-hdd';
  if (/(rede|router|switch|wi-?fi)/.test(n)) return 'bi-router';
  if (/(gaming|consola|jogo|game)/.test(n)) return 'bi-controller';
  if (/(telem[oó]|smartphone|telefone)/.test(n)) return 'bi-phone';
  if (/([aá]udio|som|coluna|auscult|headph|phone)/.test(n)) return 'bi-headphones';
  if (/(impress|printer|tinteiro)/.test(n)) return 'bi-printer';
  if (/(cabo|adaptador|carreg)/.test(n)) return 'bi-plug';
  if (/(c[aâ]mara|webcam|foto|drone)/.test(n)) return 'bi-camera';
  return 'bi-tag';
}
