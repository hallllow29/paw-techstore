import { Injectable, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

const THEME_KEY = 'paw_theme';
type Theme = 'light' | 'dark';

/**
 * Gere o tema claro/escuro. Persiste a escolha em localStorage e aplica o
 * atributo `data-bs-theme` no <html> (Bootstrap 5.3 trata o resto nativamente).
 * Sem preferência guardada, segue a preferência do sistema operativo.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);

  readonly theme = signal<Theme>(this.inicial());
  readonly dark = computed(() => this.theme() === 'dark');

  constructor() {
    this.aplicar(this.theme());
  }

  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(t: Theme): void {
    this.theme.set(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* armazenamento indisponível — segue só em memória */
    }
    this.aplicar(t);
  }

  private aplicar(t: Theme): void {
    // dataset['bsTheme'] <-> atributo data-bs-theme (lido nativamente pelo
    // Bootstrap). Acesso por chave: o DOMStringMap usa index signature.
    this.doc.documentElement.dataset['bsTheme'] = t;
  }

  private inicial(): Theme {
    const guardado = this.lerGuardado();
    if (guardado) return guardado;
    const preferEscuro = this.doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return preferEscuro ? 'dark' : 'light';
  }

  private lerGuardado(): Theme | null {
    try {
      const v = localStorage.getItem(THEME_KEY);
      return v === 'dark' || v === 'light' ? v : null;
    } catch {
      return null;
    }
  }
}
