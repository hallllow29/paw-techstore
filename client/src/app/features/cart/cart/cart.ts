import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { CartService, CartItem } from '../../../core/services/cart.service';
import { imageUrl } from '../../../core/config';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './cart.html',
})
export class Cart {
  protected readonly cart = inject(CartService);
  readonly img = imageUrl;

  setQty(id: string, value: string): void {
    this.cart.setQuantidade(id, Number(value));
  }
  inc(item: CartItem): void {
    this.cart.setQuantidade(item.produto._id, item.quantidade + 1);
  }
  dec(item: CartItem): void {
    this.cart.setQuantidade(item.produto._id, item.quantidade - 1);
  }
}
