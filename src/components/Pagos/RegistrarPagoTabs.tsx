import React, { useState, useEffect, useCallback } from "react";
import ContenedorModal from "../Shared/ContenedorModal";
import { AgregarProps } from "../../interface/Pagos/Pagos";
import {
  Socio,
  Puesto,
  Deuda,
  DeudaPendiente,
  FormRegistroBase,
  RegistroPagoCompartido,
} from "../../interface/Pagos/RegistrarPagos";
import RegistrarPago from "./RegistrarPago";
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';
import RegistrarPagoBanco from "./RegistrarPagoBanco";
import { Api_Global_Pagos } from "../../service/PagoApi";
import apiClient from "../../Utils/apliClient";

const RegistrarPagoTabs: React.FC<AgregarProps> = ({ open, handleClose, pago }) => {
  const [activeStep, setActiveStep] = React.useState(0);

  // Estado compartido entre "Pago en efectivo" y "Pago en banco"
  const [socios, setSocios] = useState<Socio[]>([]);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [idSocioSeleccionado, setIdSocioSeleccionado] = useState("");
  const [idPuestoSeleccionado, setIdPuestoSeleccionado] = useState("");
  const [deudas, setDeudas] = useState<DeudaPendiente[]>([]);
  const [filasSeleccionadas, setFilasSeleccionadas] = useState<{ [key: string]: boolean }>({});
  const [montoPagar, setMontoPagar] = useState<{ [key: number]: number }>({});
  const [totalPagar, setTotalPagar] = useState(0);
  const [valueAC, setValueAC] = useState<Socio | null>(null);
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState<FormRegistroBase>({
    id_socio: "",
    nombre_socio: "",
    nombre_block: "",
    numero_puesto: "",
    deudas: [{
      id_deuda_cuota: 0,
      importe: 0,
      servicio: "",
    }]
  });

  const handleStep = (step: number) => () => {
    setActiveStep(step);
  };

  // Obtener Lista Socios
  useEffect(() => {
    const fetchSocios = async () => {
      try {
        const response = await apiClient.get(Api_Global_Pagos.socios.listar());
        const data = response.data.data.map((item: Socio) => ({
          id_socio: item.id_socio,
          nombre_completo: item.nombre_completo,
        }));
        setSocios(data);
      } catch (error) {
      }
    };

    fetchSocios();
  }, []);

  // Sincronizar con el pago cuando se recibe para edición
  useEffect(() => {
    if (pago && socios.length > 0) {
      const idSocioNum = Number(pago.id_socio);
      const socioEncontrado = socios.find(s => s.id_socio === idSocioNum);
      if (socioEncontrado) {
        setValueAC(socioEncontrado);
        const socioId = String(socioEncontrado.id_socio);
        setIdSocioSeleccionado(socioId);
        setFormData(prev => ({
          ...prev,
          id_socio: socioId,
          nombre_socio: socioEncontrado.nombre_completo
        }));
        fetchPuestos(socioId);
      }
      if (pago.fecha_registro) {
        setFechaPago(pago.fecha_registro.split(' ')[0]);
      }
    }
  }, [pago, socios]);

  // Obtener Lista Puestos
  const fetchPuestos = async (idSocio: string) => {
    try {
      const response = await apiClient.get(Api_Global_Pagos.puestos.listarPorSocio(idSocio));
      const data = response.data.data.map((item: Puesto) => ({
        id_puesto: item.id_puesto,
        numero_puesto: item.numero_puesto,
        block: {
          nombre: item.block.nombre,
        },
      }));
      setPuestos(data);
    } catch (error) {
    }
  };

  // Obtener deuda cuota por puesto
  const fetchDeudaPuesto = async (idSocio: string, idPuesto: string) => {
    try {
      const response = await apiClient.get(
        Api_Global_Pagos.cuotas.pendientesPorPuesto(idSocio, idPuesto)
      );
      const data = response.data.data.map((item: Deuda) => ({
        id_deuda: item.id_deuda,
        id_deuda_cuota: item.id_deuda_cuota,
        total: item.total,
        servicio_descripcion: item.nombre_servicio,
        anio: item.anio,
        mes: item.mes,
        a_cuenta: item.a_cuenta,
        deuda: item.por_pagar,
        checked: false,
      }));
      setDeudas(data);
    } catch (error) {
      console.error("Error al obtener las deudas", error);
    }
  };

  // Calcular el total de la deuda de las filas seleccionadas
  const calcularTotalDeudaSeleccionado = useCallback(() => {
    let total = 0;
    deudas.forEach((deuda) => {
      if (deuda.checked) {
        total += parseFloat(deuda.total) - parseFloat(deuda.a_cuenta);
      }
    });
    // setTotalDeuda(total); // totalDeuda is unused
  }, [deudas]);

  // Calcular el total a pagar de las filas seleccionadas
  const calcularTotalSeleccionado = useCallback(() => {
    let total = 0;
    Object.keys(filasSeleccionadas).forEach((id_deuda) => {
      if (filasSeleccionadas[id_deuda]) {
        // Obtener el elemento del TextField que corresponde a esta deuda
        const inputElement = document.getElementById(
          `pago-${id_deuda}`
        ) as HTMLInputElement;
        // Si el elemento existe, tomar su valor actual
        if (inputElement) {
          const montoActual = parseFloat(inputElement.value) || 0;
          total += montoActual;
        }
      }
    });
    setTotalPagar(total);
  }, [filasSeleccionadas]);

  useEffect(() => {
    calcularTotalDeudaSeleccionado();
    calcularTotalSeleccionado();
  }, [filasSeleccionadas, calcularTotalDeudaSeleccionado, calcularTotalSeleccionado]);

  // Manejar las filas seleccionadas
  const handleCheckBoxChange = (
    seleccionado: boolean,
    idDeuda: number,
    idDeudaCuota: number,
    servicioDescripcion: string,
    montoPagar: number,
    montoInicial: number
  ) => {
    const updateDeudas = deudas.map(deuda => {
      if (deuda.id_deuda_cuota === idDeudaCuota) {
        // Return a new circle 50px below
        return {
          ...deuda,
          checked: seleccionado,
        };
      } else {
        return deuda;
      }
    });
    setDeudas(updateDeudas);

    // Manejamos las filas seleccionadas
    setFilasSeleccionadas((estadoPrevio) => ({
      ...estadoPrevio,
      [idDeudaCuota]: seleccionado,
    }));

    if (seleccionado) {
      // Para almacenar el arreglo de deudas en el formulario
      setFormData((prevFormData) => ({
        ...prevFormData,
        deudas: [
          // Evitamos que las deudas se repitan
          ...prevFormData.deudas.filter((deuda) => deuda.id_deuda_cuota !== idDeudaCuota),
          // Agregamos la nuevas deudas y su monto a pagar
          { id_deuda_cuota: idDeudaCuota, importe: montoPagar, servicio: servicioDescripcion },
        ],
      }));
      // }
    } else {
      // Al deseleccionar, eliminamos la deuda correspondiente
      setFormData((prevFormData) => ({
        ...prevFormData,
        deudas: prevFormData.deudas.filter(
          (deuda) => deuda.id_deuda_cuota !== idDeudaCuota
        ),
      }));

      setMontoPagar((prevMonto) => {
        const nuevoMonto = { ...prevMonto };
        delete nuevoMonto[idDeuda];
        return nuevoMonto;
      });
    }

    // Eliminamos el valor por defecto
    setFormData((prevFormData) => ({
      ...prevFormData,
      deudas: prevFormData.deudas.filter(
        (deuda) => deuda.id_deuda_cuota !== 0 && deuda.importe !== 0
      ),
    }));

    calcularTotalDeudaSeleccionado();
    calcularTotalSeleccionado();
  };

  // Actualizar el monto a pagar de cada cuota
  const actualizarMontoPagar = (
    idDeudaCuota: number,
    nuevoMonto: number,
    montoInicial: number
  ) => {
    // Validamos que el monto no sea mayor al inicial
    const validarMonto = Math.min(nuevoMonto, montoInicial) | 0;

    setMontoPagar((prevMonto) => ({
      ...prevMonto,
      // Actualizamos el monto para la deuda seleccionada
      [idDeudaCuota]: validarMonto,
    }));

    const updateDeudas = deudas.map(deudaUdp => {
      if (deudaUdp.id_deuda_cuota === idDeudaCuota) {
        return {
          ...deudaUdp,
          deuda: validarMonto,
        };
      } else {
        return deudaUdp;
      }
    });
    setDeudas(updateDeudas);

    // Actualizamos los valores
    setFormData((prevFormData) => ({
      ...prevFormData,
      deudas: prevFormData.deudas.map(
        (deuda) =>
          deuda.id_deuda_cuota === idDeudaCuota
            ? { ...deuda, importe: validarMonto } // Actualizar el importe
            : deuda // Mantener la deuda sin cambios
      ),
    }));

    calcularTotalSeleccionado();
  };

  // Limpiar modal
  const limpiarCampos = () => {
    // Reiniciar las filas seleccionadas
    setFilasSeleccionadas({});

    // Reiniciamos los select
    setIdPuestoSeleccionado("");
    setIdSocioSeleccionado("");
    setPuestos([]);
    setValueAC(null);

    // Limpiar formulario
    setFormData((prevFormData) => ({
      ...prevFormData,
      // id_socio: "",
      nombre_socio: "",
      nombre_block: "",
      numero_puesto: "",
      deudas: [
        {
          id_deuda_cuota: 0,
          importe: 0,
          servicio: "",
        },
      ],
    }));

    // Limpiar la tabla
    setDeudas([]);
  };

  // Cerrar modal: se limpia el estado compartido solo al cerrar
  const handleCloseModal = () => {
    setActiveStep(0);
    setMontoPagar({});
    limpiarCampos();
    handleClose();
  };

  const compartido: RegistroPagoCompartido = {
    socios,
    setSocios,
    puestos,
    setPuestos,
    idSocioSeleccionado,
    setIdSocioSeleccionado,
    idPuestoSeleccionado,
    setIdPuestoSeleccionado,
    valueAC,
    setValueAC,
    deudas,
    setDeudas,
    filasSeleccionadas,
    setFilasSeleccionadas,
    montoPagar,
    setMontoPagar,
    totalPagar,
    setTotalPagar,
    fechaPago,
    setFechaPago,
    formData,
    setFormData,
    fetchPuestos,
    fetchDeudaPuesto,
    handleCheckBoxChange,
    actualizarMontoPagar,
    calcularTotalSeleccionado,
    limpiarCampos,
    handleCloseModal,
  };

  return (
    <ContenedorModal
      ancho="650px"
      alto="auto"
      abrir={open}
      cerrar={handleCloseModal}
      loading={false}
      titulo="Registrar Pago"
      botones={null}
    >
      <Stepper nonLinear activeStep={activeStep}>
        <Step key={'Pago en efectivo'}>
          <StepButton color="inherit" onClick={handleStep(0)}>
            {'Pago en efectivo'}
          </StepButton>
        </Step>
        <Step key={'Pago en banco'}>
          <StepButton color="inherit" onClick={handleStep(1)}>
            {'Pago en banco'}
          </StepButton>
        </Step>
      </Stepper>
      <div>
        {activeStep === 0 ? (
          <React.Fragment>
            <RegistrarPago {...compartido} open={true} handleClose={handleClose} pago={pago}></RegistrarPago>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <RegistrarPagoBanco {...compartido} open={true} handleClose={handleClose} pago={pago}></RegistrarPagoBanco>
          </React.Fragment>
        )}
      </div>
    </ContenedorModal>
  );
};

export default RegistrarPagoTabs;
