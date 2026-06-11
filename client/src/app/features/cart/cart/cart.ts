import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { CartService } from '../../../core/services/cart.service';
import { imageUrl } from '../../../core/config';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './cart.html',
})
export class Cart {
  protected readonly cart = inject(CartService);
  img = imageUrl;

  setQty(id: string, value: string): void {
    this.cart.setQuantidade(id, Number(value));
  }
}
