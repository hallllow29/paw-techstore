import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ProductService } from '../../../core/services/product.service';
import { CompareService } from '../../../core/services/compare.service';
import { CompareResponse, Product } from '../../../core/models/catalog.model';
import { imageUrl } from '../../../core/config';

@Component({
  selector: 'app-comparator',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './comparator.html',
})
export class Comparator implements OnInit {
  private readonly products = inject(ProductService);
  protected readonly compare = inject(CompareService);

  readonly data = signal<CompareResponse | null>(null);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const ids = this.compare.ids();
    if (ids.length < 2) {
      this.data.set(null);
      return;
    }
    this.loading.set(true);
    this.products.compare(ids).subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  remover(p: Product): void {
    this.compare.toggle(p);
    this.load();
  }

  img = imageUrl;
}
