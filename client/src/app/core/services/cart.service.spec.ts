import { TestBed } from '@angular/core/testing';
import { CartService } from './cart.service';
import { Product } from '../models/catalog.model';

const prod = (over: Partial<Product> = {}): Product =>
  ({ _id: 'p1', nome: 'Produto', preco: 100, stock: 5, slug: 'produto', ...over }) as Product;

describe('CartService', () => {
  let cart: CartService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    cart = TestBed.inject(CartService);
  });

  it('não adiciona produtos sem stock', () => {
    expect(cart.add(prod({ stock: 0 }))).toBe(false);
    expect(cart.count()).toBe(0);
  });

  it('adiciona e calcula contagem e subtotal', () => {
    expect(cart.add(prod(), 2)).toBe(true);
    expect(cart.count()).toBe(2);
    expect(cart.subtotal()).toBe(200);
  });

  it('não ultrapassa o stock do mesmo produto', () => {
    cart.add(prod({ stock: 3 }), 2);
    expect(cart.add(prod({ stock: 3 }), 2)).toBe(false); // 2 + 2 > 3
    expect(cart.count()).toBe(2);
  });

  it('setQuantidade limita ao stock disponível', () => {
    cart.add(prod({ stock: 5 }), 1);
    cart.setQuantidade('p1', 99);
    expect(cart.count()).toBe(5);
  });

  it('remove e clear esvaziam o carrinho', () => {
    cart.add(prod(), 1);
    cart.remove('p1');
    expect(cart.count()).toBe(0);

    cart.add(prod(), 1);
    cart.clear();
    expect(cart.items().length).toBe(0);
  });

  it('toOrderItems devolve { produto, quantidade }', () => {
    cart.add(prod(), 3);
    expect(cart.toOrderItems()).toEqual([{ produto: 'p1', quantidade: 3 }]);
  });

  it('persiste no localStorage', () => {
    cart.add(prod(), 2);
    expect(JSON.parse(localStorage.getItem('paw_cart') ?? '[]')).toHaveLength(1);
  });
});
