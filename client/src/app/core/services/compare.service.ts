import { Injectable, computed, signal } from '@angular/core';
import { Product } from '../models/catalog.model';

const MAX = 3;

const categoriaId = (p: Product): string =>
  typeof p.categoria === 'string' ? p.categoria : p.categoria._id;

/**
 * Mantém a seleção de produtos para o comparador.
 * Regra: até 3 produtos, todos da mesma categoria.
 */
@Injectable({ providedIn: 'root' })
export class CompareService {
  private readonly _items = signal<Product[]>([]);
  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().length);
  readonly ids = computed(() => this._items().map((p) => p._id));

  isSelected(id: string): boolean {
    return this._items().some((p) => p._id === id);
  }

  /** Pode adicionar? Respeita o limite e a mesma categoria. */
  canAdd(product: Product): boolean {
    const items = this._items();
    if (items.length >= MAX) return false;
    if (items.length === 0) return true;
    return categoriaId(items[0]) === categoriaId(product);
  }

  toggle(product: Product): void {
    if (this.isSelected(product._id)) {
      this._items.update((list) => list.filter((p) => p._id !== product._id));
    } else if (this.canAdd(product)) {
      this._items.update((list) => [...list, product]);
    }
  }

  clear(): void {
    this._items.set([]);
  }
}
