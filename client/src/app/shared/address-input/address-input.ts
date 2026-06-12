import {
  Component,
  ElementRef,
  HostListener,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  Observable,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
} from 'rxjs';

interface NominatimResult {
  display_name: string;
  address?: {
    road?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
}

/** Constrói uma morada limpa a partir dos detalhes do Nominatim. */
function formatar(r: NominatimResult): string {
  const a = r.address ?? {};
  const rua = [a.road, a.house_number].filter(Boolean).join(' ');
  const local = [a.postcode, a.city || a.town || a.village || a.municipality]
    .filter(Boolean)
    .join(' ');
  const partes = [rua, local].filter(Boolean);
  return partes.length ? partes.join(', ') : r.display_name;
}

/**
 * Campo de morada com sugestões (OpenStreetMap / Nominatim, gratuito, sem chave).
 * Implementa ControlValueAccessor — funciona com formControlName e ngModel.
 */
@Component({
  selector: 'app-address-input',
  template: `<div class="position-relative">
    <input
      type="text"
      class="form-control"
      [placeholder]="placeholder()"
      [value]="value()"
      (input)="onInput($any($event.target).value)"
      (focus)="aberto.set(true)"
      autocomplete="off"
    />
    @if (aberto() && sugestoes().length > 0) {
      <div class="addr-menu list-group shadow-sm">
        @for (s of sugestoes(); track s) {
          <button
            type="button"
            class="list-group-item list-group-item-action py-2 small"
            (click)="escolher(s)"
          >
            <i class="bi bi-geo-alt text-brand me-1"></i>{{ s }}
          </button>
        }
      </div>
    }
  </div>`,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AddressInput), multi: true },
  ],
})
export class AddressInput implements ControlValueAccessor {
  private readonly http = inject(HttpClient);
  private readonly host = inject(ElementRef) as ElementRef<HTMLElement>;

  readonly placeholder = input('Rua, número, código postal, localidade');
  readonly value = signal('');
  readonly sugestoes = signal<string[]>([]);
  readonly aberto = signal(false);

  private readonly termo$ = new Subject<string>();
  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    this.termo$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((q) => (q.trim().length >= 4 ? this.buscar(q) : of([]))),
      )
      .subscribe((s) => this.sugestoes.set(s));
  }

  private buscar(q: string): Observable<string[]> {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5' +
      `&countrycodes=pt&accept-language=pt&q=${encodeURIComponent(q)}`;
    return this.http.get<NominatimResult[]>(url).pipe(
      map((rs) => [...new Set(rs.map(formatar))]),
      // Sem rede ou limite do Nominatim: simplesmente não sugere
      catchError(() => of<string[]>([])),
    );
  }

  onInput(v: string): void {
    this.value.set(v);
    this.onChange(v);
    this.aberto.set(true);
    this.termo$.next(v);
  }

  escolher(s: string): void {
    this.value.set(s);
    this.onChange(s);
    this.onTouched();
    this.sugestoes.set([]);
    this.aberto.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.aberto() && !this.host.nativeElement.contains(e.target as Node)) {
      this.aberto.set(false);
    }
  }

  // ── ControlValueAccessor ──
  writeValue(v: string): void {
    this.value.set(v ?? '');
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
