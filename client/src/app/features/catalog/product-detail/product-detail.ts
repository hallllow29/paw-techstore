import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ProductService } from '../../../core/services/product.service';
import { CompareService } from '../../../core/services/compare.service';
import { Product } from '../../../core/models/catalog.model';
import { imageUrl } from '../../../core/config';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './product-detail.html',
})
export class ProductDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly products = inject(ProductService);
  protected readonly compare = inject(CompareService);

  readonly product = signal<Product | null>(null);
  readonly loading = signal(true);
  readonly activeImage = signal('');

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.products.get(slug).subscribe({
      next: (res) => {
        this.product.set(res.product);
        this.activeImage.set(res.product.imagemDestaque);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  atributos(p: Product): { chave: string; valor: string }[] {
    return Object.entries(p.atributos ?? {}).map(([chave, valor]) => ({ chave, valor }));
  }

  img = imageUrl;
}
