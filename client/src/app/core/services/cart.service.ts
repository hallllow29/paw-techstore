import { Injectable, computed, signal } from '@angular/core';
import { Product } from '../models/catalog.model';

export interface CartItem {
  produto: Product;
  quantidade: number;
}

const STORAGE_KEY = 'paw_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _items = signal<CartItem[]>(this.load());

  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().reduce((n, i) => n + i.quantidade, 0));
  readonly subtotal = computed(() =>
    this._items().reduce((s, i) => s + i.produto.preco * i.quantidade, 0),
  );

  /** Adiciona ao carrinho respeitando o stock disponível. */
  add(produto: Product, quantidade = 1): boolean {
    if (produto.stock <= 0) return false;
    const items = [...this._items()];
    const existing = items.find((i) => i.produto._id === produto._id);
    if (existing) {
      if (existing.quantidade + quantidade > produto.stock) return false;
      existing.quantidade += quantidade;
    } else {
      items.push({ produto, quantidade });
    }
    this.persist(items);
    return true;
  }

  setQuantidade(produtoId: string, quantidade: number): void {
    const items = this._items()
      .map((i) =>
        i.produto._id === produtoId
          ? { ...i, quantidade: Math.max(1, Math.min(quantidade, i.produto.stock)) }
          : i,
      )
      .filter((i) => i.quantidade > 0);
    this.persist(items);
  }

  remove(produtoId: string): void {
    this.persist(this._items().filter((i) => i.produto._id !== produtoId));
  }

  clear(): void {
    this.persist([]);
  }

  /** Itens no formato esperado pela API (produto + quantidade). */
  toOrderItems(): { produto: string; quantidade: number }[] {
    return this._items().map((i) => ({ produto: i.produto._id, quantidade: i.quantidade }));
  }

  private persist(items: CartItem[]): void {
    this._items.set(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  private load(): CartItem[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  }
}
