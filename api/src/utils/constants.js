// Métodos de entrega suportados pela plataforma
export const DELIVERY_METHODS = ['levantamento_loja', 'estafeta', 'transportadora'];

// Estados possíveis de uma encomenda (na ordem natural do fluxo)
export const ORDER_STATES = [
  'pendente',
  'confirmada',
  'em_preparacao',
  'em_entrega',
  'entregue',
  'cancelada',
];

// Janela (minutos) durante a qual o cliente pode cancelar após a confirmação
export const CANCEL_WINDOW_MIN = 10;
