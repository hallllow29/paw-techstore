import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let theme: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-bs-theme');
    TestBed.configureTestingModule({});
    theme = TestBed.inject(ThemeService);
  });

  it('aplica um tema válido no <html> ao arrancar', () => {
    expect(['light', 'dark']).toContain(theme.theme());
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe(theme.theme());
  });

  it('set("dark") aplica e persiste', () => {
    theme.set('dark');
    expect(theme.dark()).toBe(true);
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
    expect(localStorage.getItem('paw_theme')).toBe('dark');
  });

  it('toggle alterna entre claro e escuro', () => {
    theme.set('dark');
    theme.toggle();
    expect(theme.dark()).toBe(false);
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
  });
});
