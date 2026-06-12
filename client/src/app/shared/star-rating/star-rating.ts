import { Component, computed, input } from '@angular/core';

/** Mostra uma classificação de 0 a 5 em estrelas (com meia-estrela). */
@Component({
  selector: 'app-stars',
  template: `@for (s of estrelas; track s) {
      <i
        class="bi"
        [class.bi-star-fill]="s <= cheias()"
        [class.bi-star-half]="s === meia()"
        [class.bi-star]="s > cheias() && s !== meia()"
        style="color: #f59e0b"
      ></i>
    }
    @if (count() !== null) {
      <span class="text-muted small ms-1">{{
        count() ? '(' + count() + ')' : 'sem avaliações'
      }}</span>
    }`,
  host: { class: 'd-inline-flex align-items-center gap-0' },
})
export class Stars {
  readonly value = input(0);
  readonly count = input<number | null>(null);

  protected readonly estrelas = [1, 2, 3, 4, 5];
  protected readonly cheias = computed(() => Math.floor(this.value()));
  protected readonly meia = computed(() =>
    this.value() % 1 >= 0.5 ? Math.floor(this.value()) + 1 : 0,
  );
}
