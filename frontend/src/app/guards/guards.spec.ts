import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

function userWithRole(name: string): User {
  return { id: 1, name: 'Prueba', email: 'prueba@soporte.local', role: { id: 1, name }, is_active: true } as User;
}

describe('Guards de rutas', () => {
  let router: Router;
  let authService: AuthService;
  const state = { url: '/admin/users' } as RouterStateSnapshot;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  const runAuth = () => TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, state));
  const runRole = (roles: string[]) =>
    TestBed.runInInjectionContext(() =>
      roleGuard({ data: { roles } } as unknown as ActivatedRouteSnapshot, state),
    );

  it('authGuard redirige a login conservando la URL si no hay sesión', () => {
    expect(runAuth()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/admin/users' } });
  });

  it('authGuard permite el acceso con sesión iniciada', () => {
    authService.setUser(userWithRole('usuario'));
    expect(runAuth()).toBe(true);
  });

  it('roleGuard permite el acceso al rol autorizado', () => {
    authService.setUser(userWithRole('administrador'));
    expect(runRole(['administrador'])).toBe(true);
  });

  it('roleGuard redirige al dashboard a un rol no autorizado', () => {
    authService.setUser(userWithRole('operador'));
    expect(runRole(['administrador'])).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
