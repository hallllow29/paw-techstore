import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { authGuard, roleGuard } from './auth.guard';
import { storeToken, clearToken } from '../config';

// Os guards são CanActivateFn; chamamos com argumentos vazios (não os usam).
const corre = (fn: () => unknown) => TestBed.runInInjectionContext(fn);
const rota = {} as never;

describe('auth.guard', () => {
  beforeEach(() => {
    clearToken();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  afterEach(() => clearToken());

  it('authGuard redireciona (UrlTree) quando não há sessão', () => {
    const r = corre(() => authGuard(rota, rota));
    expect(r instanceof UrlTree).toBe(true);
  });

  it('authGuard permite quando há token', () => {
    storeToken('tok');
    const r = corre(() => authGuard(rota, rota));
    expect(r).toBe(true);
  });

  it('roleGuard bloqueia (UrlTree) sem o papel exigido', () => {
    const guard = roleGuard(['admin']);
    const r = corre(() => guard(rota, rota));
    expect(r instanceof UrlTree).toBe(true);
  });
});
