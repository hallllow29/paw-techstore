import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/catalog.model';
import { imageUrl } from '../../../core/config';

@Component({
  selector: 'app-product-manage',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './product-manage.html',
})
export class ProductManage implements OnInit {
  private readonly products = inject(ProductService);

  readonly items = signal<Product[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.products.list({ limit: 50, sort: 'recentes' }).subscribe({
      next: (res) => {
        this.items.set(res.products);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  remover(p: Product): void {
    if (!confirm(`Eliminar "${p.nome}"?`)) return;
    this.products.remove(p._id).subscribe(() => this.load());
  }

  categoriaNome(p: Product): string {
    return typeof p.categoria === 'string' ? '' : p.categoria.nome;
  }

  img = imageUrl;
}
