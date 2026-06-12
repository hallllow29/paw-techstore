import { Product } from '../models/product.model.js';
import { logger } from '../utils/logger.js';

/**
 * Especificações técnicas ricas, por EAN (fonte única).
 * Aplicadas no seed e via `npm run seed:specs` (não destrutivo).
 */
export const PRODUCT_SPECS = {
  // ASUS Vivobook 15 F1504VA
  4711636338417: {
    Ecrã: '15.6" Full HD (1920x1080)',
    Processador: 'Intel Core i7-150U',
    Gráfica: 'Intel Graphics',
    RAM: '16 GB DDR4',
    Armazenamento: '1 TB SSD NVMe',
    'Sistema Operativo': 'Windows 11 Home',
    Teclado: 'Português com teclado numérico',
    Conetividade: 'Wi-Fi 6, Bluetooth 5.1',
    Portas: 'USB-C, 2x USB-A, HDMI, jack 3.5mm',
    Webcam: 'HD 720p',
    Cor: 'Prateado',
    Peso: '1.7 kg',
    Garantia: '2 anos',
  },
  // HP 14-ha0003np
  '0199896577045': {
    Ecrã: '14" Full HD (1920x1080)',
    Processador: 'AMD Ryzen AI 7 350',
    Gráfica: 'AMD Radeon Graphics',
    RAM: '24 GB LPDDR5',
    Armazenamento: '1 TB SSD NVMe',
    'Sistema Operativo': 'Windows 11 Home',
    Conetividade: 'Wi-Fi 6E, Bluetooth 5.3',
    Portas: 'USB-C, 2x USB-A, HDMI',
    Cor: 'Prateado natural',
    Peso: '1.4 kg',
    Garantia: '2 anos',
  },
  // ACER Chromebook 315
  4711474460080: {
    Ecrã: '15.6" Full HD (1920x1080)',
    Processador: 'Intel Celeron N4500',
    RAM: '8 GB LPDDR4X',
    Armazenamento: '128 GB eMMC',
    'Sistema Operativo': 'ChromeOS',
    Autonomia: 'até 10 horas',
    Conetividade: 'Wi-Fi 6, Bluetooth 5.0',
    Portas: '2x USB-C, USB-A',
    Cor: 'Prateado',
    Peso: '1.7 kg',
    Garantia: '2 anos',
  },
  // Monitor Samsung Odyssey G5 27"
  8806094938247: {
    Tamanho: '27"',
    Resolução: '2560x1440 (QHD)',
    'Taxa de atualização': '165 Hz',
    'Tempo de resposta': '1 ms',
    Painel: 'VA curvo 1000R',
    HDR: 'HDR10',
    Ligações: 'HDMI, DisplayPort',
    'Suporte VESA': '75x75 mm',
    Cor: 'Preto',
    Garantia: '2 anos',
  },
  // Teclado Logitech MX Keys S
  5099206082434: {
    Tipo: 'Membrana retroiluminada (smart backlight)',
    Ligação: 'Bluetooth / recetor Logi Bolt USB',
    Layout: 'Português',
    Autonomia: 'até 10 dias com luz / 5 meses sem luz',
    Compatibilidade: 'Windows, macOS, Linux, iOS, Android',
    Carregamento: 'USB-C',
    Cor: 'Grafite',
    Peso: '810 g',
    Garantia: '2 anos',
  },
  // Rato Logitech MX Master 3S
  5099206099142: {
    Sensor: '8000 DPI (Darkfield)',
    Ligação: 'Bluetooth / recetor Logi Bolt USB',
    Botões: '7 programáveis',
    Scroll: 'MagSpeed eletromagnético',
    Autonomia: 'até 70 dias',
    Carregamento: 'USB-C',
    Compatibilidade: 'Windows, macOS, Linux',
    Cor: 'Grafite',
    Garantia: '2 anos',
  },
  // Smartphone Xiaomi Redmi Note 13
  6901443394746: {
    Ecrã: '6.67" AMOLED 120 Hz',
    RAM: '8 GB',
    Armazenamento: '256 GB',
    'Câmara principal': '108 MP',
    Bateria: '5000 mAh',
    Carregamento: '33W',
    'Sistema Operativo': 'Android (MIUI)',
    Resistência: 'IP54',
    Conetividade: '4G, Wi-Fi 5, Bluetooth 5.3',
    Cor: 'Preto meia-noite',
    Garantia: '2 anos',
  },
  // Desktop Lenovo IdeaCentre 3
  4711387431290: {
    Processador: 'Intel Core i5-13420H',
    Gráfica: 'Intel UHD Graphics',
    RAM: '16 GB DDR4',
    Armazenamento: '1 TB SSD',
    'Sistema Operativo': 'Windows 11',
    Conetividade: 'Wi-Fi 6, Bluetooth 5.1',
    Portas: 'USB-C 3.2, 4x USB-A, HDMI 2.1, VGA, RJ-45',
    Áudio: 'Combo 3.5mm',
    Cor: 'Cinzento',
    Peso: '3.59 kg',
    Garantia: '2 anos',
  },
};

/** Aplica as especificações aos produtos existentes, por EAN. */
export async function assignProductSpecs() {
  let n = 0;
  for (const [ean, atributos] of Object.entries(PRODUCT_SPECS)) {
    const p = await Product.findOne({ ean });
    if (!p) continue;
    p.atributos = atributos;
    await p.save();
    n++;
  }
  logger.info(`Especificações técnicas aplicadas: ${n} produtos.`);
  return n;
}
