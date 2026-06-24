import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AddressInput } from '../../../shared/address-input/address-input';
import { CartService } from '../../../core/services/cart.service';
import { OrderService } from '../../../core/services/order.service';
import { PaymentService } from '../../../core/services/payment.service';
import { StoreService } from '../../../core/services/store.service';
import { CouponService } from '../../../core/services/coupon.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  DeliveryMethod,
  DeliveryMethodConfig,
  METHOD_LABELS,
  PaymentMethod,
} from '../../../core/models/order.model';

const NOVA_MORADA = '__nova__';

@Component({
  selector: 'app-checkout',
  imports: [DecimalPipe, FormsModule, AddressInput],
  templateUrl: './checkout.html',
})
export class Checkout implements OnInit {
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  private readonly orders = inject(OrderService);
  private readonly payments = inject(PaymentService);
  private readonly store = inject(StoreService);
  private readonly coupons = inject(CouponService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly metodos = signal<DeliveryMethodConfig[]>([]);
  readonly selecionado = signal<DeliveryMethod | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly estafetas = signal<{ total: number; livres: number } | null>(null);
  readonly labels = METHOD_LABELS;

  // Morada de entrega
  readonly NOVA = NOVA_MORADA;
  readonly moradaOpcao = signal<string>('');
  protected novaMorada = '';
  protected guardarMorada = false;
  protected nif = '';
  /** Morada do perfil + moradas guardadas, sem duplicados. */
  readonly enderecos = computed(() => {
    const u = this.auth.user();
    if (!u) return [];
    return [...new Set([u.morada, ...(u.moradas ?? [])].filter(Boolean))];
  });

  // Pagamento
  readonly pagamento = signal<PaymentMethod>('mbway');
  readonly stripeAtivo = signal(false);
  readonly paypalAtivo = signal(false);
  protected telefoneMbway = '';
  protected cartaoNumero = '';
  protected cartaoValidade = '';
  protected cartaoCvc = '';

  // Cupão
  protected codigoCupao = '';
  readonly desconto = signal(0);
  readonly cupaoAplicado = signal<string | null>(null);
  readonly cupaoError = signal<string | null>(null);

  readonly custoEntrega = computed(() => {
    const m = this.metodos().find((x) => x.metodo === this.selecionado());
    return m?.custo ?? 0;
  });
  readonly total = computed(() =>
    Math.max(0, this.cart.subtotal() - this.desconto() + this.custoEntrega()),
  );

  ngOnInit(): void {
    if (this.cart.items().length === 0) {
      this.router.navigate(['/carrinho']);
      return;
    }
    const u = this.auth.user();
    this.moradaOpcao.set(u?.morada ?? NOVA_MORADA);
    this.telefoneMbway = u?.telefone ?? '';

    this.store.get().subscribe((res) => {
      const ativos = res.settings.metodosEntrega.filter((m) => m.ativo);
      this.metodos.set(ativos);
      if (ativos.length) this.selecionado.set(ativos[0].metodo);
    });
    this.store.couriers().subscribe((c) => this.estafetas.set(c));
    this.payments.config().subscribe((c) => {
      this.stripeAtivo.set(c.enabled);
      this.paypalAtivo.set(c.paypal);
    });
  }

  aplicarCupao(): void {
    const codigo = this.codigoCupao.trim();
    if (!codigo) return;
    this.cupaoError.set(null);
    this.coupons.validate(codigo, this.cart.subtotal()).subscribe({
      next: (res) => {
        this.desconto.set(res.desconto);
        this.cupaoAplicado.set(res.codigo);
        this.toast.success(`Cupão ${res.codigo} aplicado`);
      },
      error: (err) => {
        this.desconto.set(0);
        this.cupaoAplicado.set(null);
        this.cupaoError.set(err?.error?.message ?? 'Cupão inválido');
      },
    });
  }

  removerCupao(): void {
    this.desconto.set(0);
    this.cupaoAplicado.set(null);
    this.codigoCupao = '';
    this.cupaoError.set(null);
  }

  /** Morada final tendo em conta a opção escolhida. */
  private moradaFinal(): string {
    return this.moradaOpcao() === NOVA_MORADA ? this.novaMorada.trim() : this.moradaOpcao();
  }

  confirmar(): void {
    const metodo = this.selecionado();
    if (!metodo) return;

    const morada = this.moradaFinal();
    if (!morada) {
      this.error.set('Indica uma morada de entrega');
      return;
    }
    if (this.pagamento() === 'mbway' && !this.telefoneMbway.trim()) {
      this.error.set('Indica o número de telemóvel para o MB WAY');
      return;
    }
    if (this.pagamento() === 'cartao' && !this.stripeAtivo() && !this.cartaoNumero.trim()) {
      this.error.set('Preenche os dados do cartão');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const ehNova = this.moradaOpcao() === NOVA_MORADA;
    this.orders
      .create({
        itens: this.cart.toOrderItems(),
        metodoEntrega: metodo,
        metodoPagamento: this.pagamento(),
        morada,
        guardarMorada: ehNova && this.guardarMorada,
        cupao: this.cupaoAplicado() ?? undefined,
        nif: this.nif.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.cart.clear();
          this.processarPagamento(res.order._id);
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Não foi possível criar a encomenda');
          this.loading.set(false);
        },
      });
  }

  /** Após criar a encomenda, encaminha conforme o método de pagamento. */
  private processarPagamento(orderId: string): void {
    const irParaEncomenda = (msg: string) => {
      this.toast.success(msg);
      this.router.navigate(['/encomendas', orderId]);
    };
    const falhaPagamento = () => {
      this.toast.info('Encomenda criada — podes concluir o pagamento na página da encomenda');
      this.router.navigate(['/encomendas', orderId]);
    };

    switch (this.pagamento()) {
      case 'mbway':
        this.payments.mbway(orderId, this.telefoneMbway.trim()).subscribe({
          next: () => irParaEncomenda('Pagamento MB WAY confirmado'),
          error: falhaPagamento,
        });
        break;
      case 'cartao':
        if (this.stripeAtivo()) {
          this.payments.checkout(orderId).subscribe({
            next: (r) => (globalThis.location.href = r.url),
            error: falhaPagamento,
          });
        } else {
          this.payments.cartao(orderId).subscribe({
            next: () => irParaEncomenda('Pagamento por cartão confirmado'),
            error: falhaPagamento,
          });
        }
        break;
      case 'paypal':
        if (this.paypalAtivo()) {
          this.payments.createPaypal(orderId).subscribe({
            next: (r) => (globalThis.location.href = r.url),
            error: falhaPagamento,
          });
        } else {
          this.payments.paypal(orderId).subscribe({
            next: () => irParaEncomenda('Pagamento PayPal confirmado'),
            error: falhaPagamento,
          });
        }
        break;
      case 'multibanco':
        irParaEncomenda('Encomenda criada — usa a referência Multibanco para pagar');
        break;
      default:
        irParaEncomenda('Encomenda criada com sucesso!');
    }
  }
}
