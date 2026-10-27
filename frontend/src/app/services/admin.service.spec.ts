import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminService } from './admin.service';
import { environment } from '../../environments/environment';

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('createUser envía los datos del nuevo usuario por POST a /admin/users', () => {
    const data = {
      name: 'Nuevo Técnico',
      email: 'nuevo@soporte.local',
      password: 'Tecnico123!',
      password_confirmation: 'Tecnico123!',
      role_id: 2,
      is_active: true,
    };

    service.createUser(data).subscribe((res) => {
      expect(res.user.email).toBe('nuevo@soporte.local');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/users`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(data);
    req.flush({ message: 'Usuario creado correctamente.', user: { id: 10, email: 'nuevo@soporte.local' } });
  });
});
