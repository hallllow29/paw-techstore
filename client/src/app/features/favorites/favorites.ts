import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FavoriteService } from '../../core/services/favorite.service';
import { Product } from '../../core/models/catalog.model';
import { imageUrl } from '../../core/config';

@Component({
  selector: 'app-favorites',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './favorites.html',
})
export class Favorites implements OnInit {
  protected readonly favorites = inject(FavoriteService);

  readonly items = signal<Product[]>([]);
  readonly loading = signal(true);
  img = imageUrl;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.favorites.list().subscribe({
      next: (res) => {
        this.items.set(res.favoritos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  remover(p: Product): void {
    this.favorites.toggle(p._id);
    this.items.update((list) => list.filter((x) => x._id !== p._id));
  }
}
