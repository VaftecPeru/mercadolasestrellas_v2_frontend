import { renderHook, act } from '@testing-library/react';
import useConsultaDocumento from './useConsultaDocumento';
import apiClient from '../../Utils/apliClient';
import { mostrarAlerta } from '../../components/Alerts/Registrar';

jest.mock('../../Utils/apliClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('../../components/Alerts/Registrar', () => ({
  mostrarAlerta: jest.fn(),
}));

const persona = {
  dni: '46027897',
  nombres: 'ROXANA KARINA',
  apellido_paterno: 'DELGADO',
  apellido_materno: 'HUAMANI',
  nombre_completo: 'ROXANA KARINA DELGADO HUAMANI',
};

const errorAxios = (message?: string) =>
  Object.assign(new Error('Request failed'), {
    isAxiosError: true,
    response: message ? { data: { message } } : undefined,
  });

describe('useConsultaDocumento', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('No consulta cuando el DNI no tiene exactamente 8 dígitos', async () => {
    const { result } = renderHook(() => useConsultaDocumento());

    let respuesta: unknown;
    await act(async () => {
      respuesta = await result.current.consultarDni('1234567');
    });

    expect(respuesta).toBeNull();
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(result.current.consultando).toBe(false);
  });

  test('Devuelve los datos de la persona cuando el DNI es válido', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { success: true, fuente: 'reniec', data: persona } });
    const { result } = renderHook(() => useConsultaDocumento());

    let respuesta: unknown;
    await act(async () => {
      respuesta = await result.current.consultarDni('46027897');
    });

    expect(apiClient.get).toHaveBeenCalledWith('/consultas/dni/46027897');
    expect(respuesta).toEqual(persona);
    expect(result.current.consultando).toBe(false);
  });

  test('No repite la consulta de un DNI ya obtenido', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { success: true, fuente: 'reniec', data: persona } });
    const { result } = renderHook(() => useConsultaDocumento());

    await act(async () => {
      await result.current.consultarDni('46027897');
    });
    let segunda: unknown;
    await act(async () => {
      segunda = await result.current.consultarDni('46027897');
    });

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(segunda).toEqual(persona);
  });

  test('Si el DNI no existe muestra el mensaje del backend y permite continuar manualmente', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(
      errorAxios('El DNI ingresado no fue encontrado en RENIEC. Ingrese los datos manualmente.')
    );
    const { result } = renderHook(() => useConsultaDocumento());

    let respuesta: unknown;
    await act(async () => {
      respuesta = await result.current.consultarDni('00000000');
    });

    expect(respuesta).toBeNull();
    expect(mostrarAlerta).toHaveBeenCalledWith(
      'Consulta de DNI',
      'El DNI ingresado no fue encontrado en RENIEC. Ingrese los datos manualmente.',
      'warning'
    );
    expect(result.current.consultando).toBe(false);
  });

  test('Ante un error de red muestra el mensaje por defecto', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(errorAxios());
    const { result } = renderHook(() => useConsultaDocumento());

    await act(async () => {
      await result.current.consultarDni('46027897');
    });

    expect(mostrarAlerta).toHaveBeenCalledWith(
      'Consulta de DNI',
      'No se pudo consultar el DNI. Ingrese los datos manualmente.',
      'warning'
    );
  });

  test('Descarta la respuesta si el DNI cambió mientras se consultaba', async () => {
    let resolverConsulta: (valor: unknown) => void = () => {};
    (apiClient.get as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolverConsulta = resolve;
      })
    );
    const { result } = renderHook(() => useConsultaDocumento());

    let pendiente: Promise<unknown> = Promise.resolve(null);
    act(() => {
      pendiente = result.current.consultarDni('46027897');
    });
    expect(result.current.consultando).toBe(true);

    // El usuario modifica el DNI antes de recibir la respuesta
    await act(async () => {
      await result.current.consultarDni('4602789');
    });
    expect(result.current.consultando).toBe(false);

    let respuesta: unknown;
    await act(async () => {
      resolverConsulta({ data: { success: true, fuente: 'reniec', data: persona } });
      respuesta = await pendiente;
    });
    expect(respuesta).toBeNull();
    expect(result.current.consultando).toBe(false);
  });

  describe('consultarRuc', () => {
    const contribuyente = {
      ruc: '20100070970',
      razon_social: 'SUPERMERCADOS PERUANOS SOCIEDAD ANONIMA O S.P.S.A.',
      estado: 'ACTIVO',
      condicion: 'HABIDO',
      direccion: 'CAL. MORELLI NRO. 181 INT. P-2',
    };

    test('No consulta cuando el RUC no tiene exactamente 11 dígitos', async () => {
      const { result } = renderHook(() => useConsultaDocumento());

      let respuesta: unknown;
      await act(async () => {
        respuesta = await result.current.consultarRuc('2010007097');
      });

      expect(respuesta).toBeNull();
      expect(apiClient.get).not.toHaveBeenCalled();
      expect(result.current.consultando).toBe(false);
    });

    test('Devuelve los datos de la empresa cuando el RUC es válido', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, fuente: 'sunat', data: contribuyente },
      });
      const { result } = renderHook(() => useConsultaDocumento());

      let respuesta: unknown;
      await act(async () => {
        respuesta = await result.current.consultarRuc('20100070970');
      });

      expect(apiClient.get).toHaveBeenCalledWith('/consultas/ruc/20100070970');
      expect(respuesta).toEqual(contribuyente);
      expect(result.current.consultando).toBe(false);
    });

    test('No repite la consulta de un RUC ya obtenido', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, fuente: 'sunat', data: contribuyente },
      });
      const { result } = renderHook(() => useConsultaDocumento());

      await act(async () => {
        await result.current.consultarRuc('20100070970');
      });
      let segunda: unknown;
      await act(async () => {
        segunda = await result.current.consultarRuc('20100070970');
      });

      expect(apiClient.get).toHaveBeenCalledTimes(1);
      expect(segunda).toEqual(contribuyente);
    });

    test('Si el RUC no existe muestra alerta y permite continuar manualmente', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(
        errorAxios('El RUC ingresado no fue encontrado en SUNAT. Ingrese los datos manualmente.')
      );
      const { result } = renderHook(() => useConsultaDocumento());

      let respuesta: unknown;
      await act(async () => {
        respuesta = await result.current.consultarRuc('00000000000');
      });

      expect(respuesta).toBeNull();
      expect(mostrarAlerta).toHaveBeenCalledWith(
        'Consulta de RUC',
        'El RUC ingresado no fue encontrado en SUNAT. Ingrese los datos manualmente.',
        'warning'
      );
      expect(result.current.consultando).toBe(false);
    });
  });
});
