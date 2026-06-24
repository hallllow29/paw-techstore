import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

function limparSessao(): void {
  localStorage.clear();
  document.cookie = 'paw_token=; path=/; max-age=0';
}

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    limparSessao();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    limparSessao();
  });

  it('login guarda token e utilizador', () => {
    auth.login('ana@paw.pt', 'demo1234').subscribe();
    http
      .expectOne((r) => r.url.endsWith('/auth/login'))
      .flush({ success: true, token: 'tok123', user: { _id: '1', nome: 'Ana', role: 'cliente' } });

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.token).toBe('tok123');
    expect(auth.role()).toBe('cliente');
  });

  it('register NÃO inicia sessão (exige confirmar email)', () => {
    auth
      .register({
        nome: 'Novo',
        email: 'novo@paw.pt',
        password: 'demo1234',
        morada: 'Rua 1',
        telefone: '910000000',
      })
      .subscribe();
    http
      .expectOne((r) => r.url.endsWith('/auth/register'))
      .flush({
        success: true,
        message: 'confirma',
        user: { _id: '1', nome: 'Novo', role: 'cliente' },
      });

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.token).toBeNull();
  });

  it('hasRole reflete o papel do utilizador', () => {
    auth.login('loja@paw.pt', 'demo1234').subscribe();
    http
      .expectOne((r) => r.url.endsWith('/auth/login'))
      .flush({ success: true, token: 't', user: { _id: '1', nome: 'Loja', role: 'loja' } });

    expect(auth.hasRole('loja')).toBe(true);
    expect(auth.hasRole('admin')).toBe(false);
  });

  it('logout limpa a sessão', () => {
    auth.login('ana@paw.pt', 'demo1234').subscribe();
    http
      .expectOne((r) => r.url.endsWith('/auth/login'))
      .flush({ success: true, token: 't', user: { _id: '1', nome: 'Ana', role: 'cliente' } });

    auth.logout();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.token).toBeNull();
  });
});
