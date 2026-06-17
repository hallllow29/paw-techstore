import { User } from './user.model';

export type DeliveryMethod = 'levantamento_loja' | 'estafeta' | 'transportadora';
export type PaymentMethod = 'mbway' | 'multibanco' | 'cartao' | 'paypal' | 'entrega';

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  mbway: 'MB WAY',
  multibanco: 'Multibanco',
  cartao: 'Cartão',
  paypal: 'PayPal',
  entrega: 'Pagar na entrega',
};

export type OrderState =
  | 'pendente'
  | 'confirmada'
  | 'em_preparacao'
  | 'em_entrega'
  | 'entregue'
  | 'cancelada';

export interface OrderItem {
  produto: string;
  nome: string;
  preco: number;
  quantidade: number;
}

export interface Review {
  _id: string;
  order: string;
  ratingEncomenda: number;
  ratingEstafeta?: number | null;
  comentario: string;
  createdAt: string;
}

export interface Coupon {
  _id: string;
  codigo: string;
  tipo: 'percentagem' | 'valor';
  valor: number;
  minSubtotal: number;
  validoAte?: string | null;
  usosMax?: number | null;
  usos: number;
  ativo: boolean;
}

export interface Order {
  _id: string;
  cliente: string | User;
  itens: OrderItem[];
  subtotal: number;
  cupao?: string;
  desconto?: number;
  custoEntrega: number;
  total: number;
  metodoEntrega: DeliveryMethod;
  morada: string;
  estado: OrderState;
  estafeta?: string | User | null;
  confirmadaEm?: string | null;
  metodoPagamento?: PaymentMethod;
  pago?: boolean;
  multibanco?: { entidade: string; referencia: string };
  ultimaPosicao?: { lat: number | null; lng: number | null; em: string | null };
  historico: { estado: OrderState; em: string }[];
  createdAt: string;
}

export interface DeliveryMethodConfig {
  metodo: DeliveryMethod;
  ativo: boolean;
  custo: number;
}

export interface StoreSettings {
  nome: string;
  logotipo: string;
  horario: string;
  metodosEntrega: DeliveryMethodConfig[];
}

/** Rótulos legíveis para os estados e métodos. */
export const STATE_LABELS: Record<OrderState, string> = {
  pendente: 'Pendente',
  confirmada: 'Confirmada',
  em_preparacao: 'Em preparação',
  em_entrega: 'Em entrega',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
};

export const METHOD_LABELS: Record<DeliveryMethod, string> = {
  levantamento_loja: 'Levantamento em loja',
  estafeta: 'Entrega por estafeta',
  transportadora: 'Transportadora',
};

/** Classe de cor Bootstrap (text-bg-*) por estado. */
export const STATE_COLORS: Record<OrderState, string> = {
  pendente: 'secondary',
  confirmada: 'info',
  em_preparacao: 'primary',
  em_entrega: 'warning',
  entregue: 'success',
  cancelada: 'danger',
};
