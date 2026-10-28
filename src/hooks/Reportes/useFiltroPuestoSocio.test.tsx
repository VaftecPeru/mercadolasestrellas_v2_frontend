import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import useFiltroPuestoSocio from './useFiltroPuestoSocio';
import apiClient from '../../Utils/apliClient';
import { Puesto, Socio } from '../../interface/ReporteDeudas/deudas';

jest.mock('../../Utils/apliClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

let mockUsuario: any = { id_usuario: 1, id_rol: 1, nombre_usuario: 'admin' };

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    usuario: mockUsuario,
  }),
}));

const mockPuestos: Puesto[] = [
  { id_puesto: '1', numero_puesto: 'P-01', id_socio: '10' },
  { id_puesto: '2', numero_puesto: 'P-02', id_socio: '20' },
  { id_puesto: '3', numero_puesto: 'P-03', id_socio: '20' }, // Socio 20 tiene 2 puestos (2 y 3)
  { id_puesto: '4', numero_puesto: 'P-04', id_socio: '40' },
];

const mockSocios: Socio[] = [
  { id_socio: '10', nombre_completo: 'Socio Un Puesto' },
  { id_socio: '20', nombre_completo: 'Socio Multiples Puestos' },
  { id_socio: '30', nombre_completo: 'Socio Sin Puestos' },
  { id_socio: '40', nombre_completo: 'Socio Cuatro' },
];

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/reportes']}>{children}</MemoryRouter>
);

describe('useFiltroPuestoSocio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsuario = { id_usuario: 1, id_rol: 1, nombre_usuario: 'admin' };
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/puestos')) {
        return Promise.resolve({ data: { data: mockPuestos } });
      }
      if (url.includes('/socios')) {
        return Promise.resolve({ data: { data: mockSocios } });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  test('Carga puestos y socios ordenados al inicializar', async () => {
    const { result } = renderHook(() => useFiltroPuestoSocio(), { wrapper });

    await waitFor(() => {
      expect(result.current.puestos.length).toBe(4);
      expect(result.current.socios.length).toBe(4);
    });

    expect(result.current.puestoSeleccionado).toBe(0);
    expect(result.current.socioSeleccionado).toBeNull();
    expect(result.current.tieneFiltrosActivos).toBe(false);
  });

  test('Socio con un solo puesto: auto-selecciona su puesto y filtra puestosDisponibles', async () => {
    const onFiltrosChange = jest.fn();
    const { result } = renderHook(() => useFiltroPuestoSocio({ onFiltrosChange }), { wrapper });

    await waitFor(() => {
      expect(result.current.puestos.length).toBe(4);
      expect(result.current.socios.length).toBe(4);
    });

    act(() => {
      result.current.handleSocioChange(mockSocios[0]); // Socio 10 (tiene puesto 1)
    });

    expect(result.current.socioSeleccionado?.id_socio).toBe('10');
    expect(result.current.puestoSeleccionado).toBe(1);
    expect(result.current.puestosDisponibles.length).toBe(1);
    expect(result.current.puestosDisponibles[0].id_puesto).toBe('1');
    expect(result.current.tieneFiltrosActivos).toBe(true);
    expect(onFiltrosChange).toHaveBeenCalled();
  });

  test('Socio con múltiples puestos: NO auto-selecciona puesto y muestra solo sus puestos', async () => {
    const onFiltrosChange = jest.fn();
    const { result } = renderHook(() => useFiltroPuestoSocio({ onFiltrosChange }), { wrapper });

    await waitFor(() => {
      expect(result.current.puestos.length).toBe(4);
      expect(result.current.socios.length).toBe(4);
    });

    act(() => {
      result.current.handleSocioChange(mockSocios[1]); // Socio 20 (tiene puestos 2 y 3)
    });

    expect(result.current.socioSeleccionado?.id_socio).toBe('20');
    expect(result.current.puestoSeleccionado).toBe(0); // No debe auto-seleccionar
    expect(result.current.puestosDisponibles.length).toBe(2);
    expect(result.current.puestosDisponibles.map((p) => p.id_puesto)).toEqual(['2', '3']);
    expect(onFiltrosChange).toHaveBeenCalled();
  });

  test('Socio con múltiples puestos: conserva puesto actual si pertenece a ese socio', async () => {
    const { result } = renderHook(() => useFiltroPuestoSocio(), { wrapper });

    await waitFor(() => {
      expect(result.current.puestos.length).toBe(4);
      expect(result.current.socios.length).toBe(4);
    });

    // Primero se selecciona el puesto 2
    act(() => {
      result.current.handlePuestoChange(mockPuestos[1]); // Puesto 2 (de socio 20)
    });
    expect(result.current.puestoSeleccionado).toBe(2);
    expect(result.current.socioSeleccionado?.id_socio).toBe('20');

    // Luego se selecciona explícitamente el socio 20: debe conservar puesto 2
    act(() => {
      result.current.handleSocioChange(mockSocios[1]);
    });
    expect(result.current.puestoSeleccionado).toBe(2);
  });

  test('Socio con múltiples puestos: resetea puesto si el seleccionado pertenecía a otro socio', async () => {
    const { result } = renderHook(() => useFiltroPuestoSocio(), { wrapper });

    await waitFor(() => {
      expect(result.current.puestos.length).toBe(4);
      expect(result.current.socios.length).toBe(4);
    });

    // Puesto 1 (pertenece a socio 10)
    act(() => {
      result.current.handlePuestoChange(mockPuestos[0]);
    });
    expect(result.current.puestoSeleccionado).toBe(1);

    // Cambiar a socio 20 (puestos 2 y 3): puesto 1 no le pertenece, debe resetearse a 0
    act(() => {
      result.current.handleSocioChange(mockSocios[1]);
    });
    expect(result.current.puestoSeleccionado).toBe(0);
  });

  test('Socio con 0 puestos: limpia puesto seleccionado y puestosDisponibles queda vacío', async () => {
    const { result } = renderHook(() => useFiltroPuestoSocio(), { wrapper });

    await waitFor(() => {
      expect(result.current.puestos.length).toBe(4);
      expect(result.current.socios.length).toBe(4);
    });

    act(() => {
      result.current.handleSocioChange(mockSocios[2]); // Socio 30 (sin puestos)
    });

    expect(result.current.socioSeleccionado?.id_socio).toBe('30');
    expect(result.current.puestoSeleccionado).toBe(0);
    expect(result.current.puestosDisponibles.length).toBe(0);
  });

  test('Selección de puesto auto-selecciona el socio dueño por id_socio', async () => {
    const onFiltrosChange = jest.fn();
    const { result } = renderHook(() => useFiltroPuestoSocio({ onFiltrosChange }), { wrapper });

    await waitFor(() => {
      expect(result.current.puestos.length).toBe(4);
      expect(result.current.socios.length).toBe(4);
    });

    act(() => {
      result.current.handlePuestoChange(mockPuestos[3]); // Puesto 4 (dueño socio 40)
    });

    expect(result.current.puestoSeleccionado).toBe(4);
    expect(result.current.socioSeleccionado?.id_socio).toBe('40');
    expect(onFiltrosChange).toHaveBeenCalled();
  });

  test('Limpiar puesto conserva el socio previamente seleccionado', async () => {
    const { result } = renderHook(() => useFiltroPuestoSocio(), { wrapper });

    await waitFor(() => {
      expect(result.current.puestos.length).toBe(4);
      expect(result.current.socios.length).toBe(4);
    });

    act(() => {
      result.current.handlePuestoChange(mockPuestos[0]);
    });
    expect(result.current.puestoSeleccionado).toBe(1);
    expect(result.current.socioSeleccionado?.id_socio).toBe('10');

    act(() => {
      result.current.handlePuestoChange(null);
    });
    expect(result.current.puestoSeleccionado).toBe(0);
    expect(result.current.socioSeleccionado?.id_socio).toBe('10'); // Socio se conserva para buscar globalmente
  });

  test('Limpiar socio resetea tanto socio como puesto', async () => {
    const { result } = renderHook(() => useFiltroPuestoSocio(), { wrapper });

    await waitFor(() => {
      expect(result.current.puestos.length).toBe(4);
      expect(result.current.socios.length).toBe(4);
    });

    act(() => {
      result.current.handlePuestoChange(mockPuestos[0]);
    });
    expect(result.current.puestoSeleccionado).toBe(1);
    expect(result.current.socioSeleccionado?.id_socio).toBe('10');

    act(() => {
      result.current.handleSocioChange(null);
    });
    expect(result.current.puestoSeleccionado).toBe(0);
    expect(result.current.socioSeleccionado).toBeNull();
  });

  test('limpiarFiltros resetea todos los estados e invoca onFiltrosChange', async () => {
    const onFiltrosChange = jest.fn();
    const { result } = renderHook(() => useFiltroPuestoSocio({ onFiltrosChange }), { wrapper });

    await waitFor(() => {
      expect(result.current.puestos.length).toBe(4);
      expect(result.current.socios.length).toBe(4);
    });

    act(() => {
      result.current.handlePuestoChange(mockPuestos[0]);
    });
    expect(result.current.tieneFiltrosActivos).toBe(true);

    act(() => {
      result.current.limpiarFiltros();
    });

    expect(result.current.puestoSeleccionado).toBe(0);
    expect(result.current.socioSeleccionado).toBeNull();
    expect(result.current.tieneFiltrosActivos).toBe(false);
    expect(onFiltrosChange).toHaveBeenCalled();
  });

  describe('Rol Socio (id_rol === 2)', () => {
    test('Auto-selecciona socio y puesto cuando el usuario socio tiene un solo puesto', async () => {
      mockUsuario = { id_usuario: 5, id_rol: 2, nombre_usuario: 'socio_user' };
      (apiClient.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/puestos')) {
          return Promise.resolve({ data: { data: [{ id_puesto: '1', numero_puesto: 'P-01', id_socio: '10' }] } });
        }
        if (url.includes('/socios')) {
          return Promise.resolve({ data: { data: [{ id_socio: '10', nombre_completo: 'Socio Unico' }] } });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const { result } = renderHook(() => useFiltroPuestoSocio(), { wrapper });

      await waitFor(() => {
        expect(result.current.socioSeleccionado?.id_socio).toBe('10');
        expect(result.current.puestoSeleccionado).toBe(1);
      });
    });

    test('Auto-selecciona socio pero no puesto cuando el usuario socio tiene múltiples puestos', async () => {
      mockUsuario = { id_usuario: 5, id_rol: 2, nombre_usuario: 'socio_user' };
      (apiClient.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/puestos')) {
          return Promise.resolve({
            data: {
              data: [
                { id_puesto: '2', numero_puesto: 'P-02', id_socio: '20' },
                { id_puesto: '3', numero_puesto: 'P-03', id_socio: '20' },
              ],
            },
          });
        }
        if (url.includes('/socios')) {
          return Promise.resolve({ data: { data: [{ id_socio: '20', nombre_completo: 'Socio Multi' }] } });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const { result } = renderHook(() => useFiltroPuestoSocio(), { wrapper });

      await waitFor(() => {
        expect(result.current.socioSeleccionado?.id_socio).toBe('20');
        expect(result.current.puestoSeleccionado).toBe(0);
        expect(result.current.puestosDisponibles.length).toBe(2);
      });
    });

    test('limpiarFiltros en rol Socio preserva la identidad del socio', async () => {
      mockUsuario = { id_usuario: 5, id_rol: 2, nombre_usuario: 'socio_user' };
      (apiClient.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/puestos')) {
          return Promise.resolve({
            data: {
              data: [
                { id_puesto: '2', numero_puesto: 'P-02', id_socio: '20' },
                { id_puesto: '3', numero_puesto: 'P-03', id_socio: '20' },
              ],
            },
          });
        }
        if (url.includes('/socios')) {
          return Promise.resolve({ data: { data: [{ id_socio: '20', nombre_completo: 'Socio Multi' }] } });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const { result } = renderHook(() => useFiltroPuestoSocio(), { wrapper });

      await waitFor(() => {
        expect(result.current.socioSeleccionado?.id_socio).toBe('20');
      });

      // El socio selecciona uno de sus puestos
      act(() => {
        result.current.handlePuestoChange({ id_puesto: '2', numero_puesto: 'P-02', id_socio: '20' });
      });
      expect(result.current.puestoSeleccionado).toBe(2);

      // Limpia filtros: debe mantener su socio y resetear puesto a 0
      act(() => {
        result.current.limpiarFiltros();
      });
      expect(result.current.socioSeleccionado?.id_socio).toBe('20');
      expect(result.current.puestoSeleccionado).toBe(0);
    });
  });
});
