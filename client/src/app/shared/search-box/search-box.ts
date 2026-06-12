import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/catalog.model';
import { imageUrl } from '../../core/config';

@Component({
  selector: 'app-search-box',
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './search-box.html',
  host: { class: 'd-block position-relative' },
})
export class SearchBox {
  private readonly products = inject(ProductService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef) as ElementRef<HTMLElement>;

  readonly termo = new FormControl('', { nonNullable: true });
  readonly sugestoes = signal<Product[]>([]);
  readonly populares = signal<Product[]>([]);
  readonly aberto = signal(false);
  readonly img = imageUrl;
  readonly tendencias = ['portátil', 'gaming', 'monitor', 'logitech', 'ssd'];

  constructor() {
    // Produtos populares (mostrados quando a caixa está vazia)
    this.products
      .list({ sort: 'recentes', limit: 6 })
      .subscribe((r) => this.populares.set(r.products));

    // Sugestões à medida que se escreve (com debounce)
    this.termo.valueChanges
      .pipe(
        debounceTime(220),
        distinctUntilChanged(),
        switchMap((q) =>
          q.trim().length >= 2 ? this.products.list({ q: q.trim(), limit: 6 }) : of(null),
        ),
      )
      .subscribe((r) => this.sugestoes.set(r?.products ?? []));
  }

  temTermo(): boolean {
    return this.termo.value.trim().length >= 2;
  }

  abrir(): void {
    this.aberto.set(true);
  }

  irProduto(slug: string): void {
    this.aberto.set(false);
    this.termo.setValue('', { emitEvent: false });
    this.router.navigate(['/produtos', slug]);
  }

  pesquisar(termoFixo?: string): void {
    if (termoFixo) this.termo.setValue(termoFixo);
    const q = this.termo.value.trim();
    this.aberto.set(false);
    this.router.navigate(['/produtos'], { queryParams: q ? { q } : {} });
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.aberto() && !this.host.nativeElement.contains(e.target as Node)) {
      this.aberto.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.aberto.set(false);
  }
}
