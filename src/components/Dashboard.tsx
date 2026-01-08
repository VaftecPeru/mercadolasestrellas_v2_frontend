import { Box, Typography, Card, CardContent, Stack } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { NextWeek, Person, Wysiwyg } from "@mui/icons-material";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import useResponsive from "../hooks/Responsive/useResponsive";
import React, { useEffect, useState } from 'react';
import { manejarError, mostrarAlerta } from './Alerts/Registrar';

import apiClient from "../Utils/apliClient";
import { Api_Global_Reportes } from "../service/ReporteApi";

const COLORS = ['#82ca9d', '#8884d8'];

interface PieData {
  name: string;
  value: number;
}

interface HistoricoItem {
  name: string;
  pagos: number;
  deudas: number;
}

interface Resultado2 {
  acumulacion_deuda: string;
  acumulacion_pago: string;
  acumulacion_deuda_raw: number;
  acumulacion_pago_raw: number;
  cantidad_socios_activos: number;
  porcentajes: {
    pagos: number;
    deudas: number;
  };
  historico: HistoricoItem[];
}

const Dashboard: React.FC = () => {

  // Variables para el responsive
  const { isSmallLaptop, isTablet, isSmallTablet, isMobile, isSmallMobile } = useResponsive();

  const [itemData, setItemData] = React.useState<PieData | null>(null);
  const formatTooltipValue = (value: number) => `${value}%`;
  const [resultado2, setResultado2] = useState<Resultado2>({
    acumulacion_deuda: "0.00",
    acumulacion_pago: "0.00",
    acumulacion_deuda_raw: 0,
    acumulacion_pago_raw: 0,
    cantidad_socios_activos: 0,
    porcentajes: {
      pagos: 0,
      deudas: 0
    },
    historico: []
  });

  // reporte dashboard
  const reporteDashboard = async () => {

    try {
      const response = await apiClient.get(Api_Global_Reportes.reportes.dashboard());

      if (response.status === 200) {
        setResultado2(response.data);
      } else {
        mostrarAlerta("Error");
      }
    } catch (error) {
      manejarError(error);
    }
  };

  // Obtener datos
  useEffect(() => {
    reporteDashboard();
  }, []);

  const chartData = [
    { name: 'Deudores', value: resultado2.porcentajes.deudas },
    { name: 'Pago', value: resultado2.porcentajes.pagos }
  ];

  return (
    <Box
      sx={{
        flexGrow: 1,
        p: isSmallMobile ? 3 : 5,
        pt: 10,
        mt: isSmallTablet ? 10 : isSmallMobile ? 8 : isMobile ? 10 : 5,
        backgroundColor: "#f0f0f0",
        minHeight: "93vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile || isSmallLaptop ? "column" : "row",
          flexWrap: isMobile ? "nowrap" : "wrap",
          justifyContent: "space-between",
          mb: 3,
          gap: "1rem",
        }}
      >
        <Box
          sx={{
            backgroundColor: "#ffffff",
            color: "black",
            "&:hover": {
              backgroundColor: "#008001",
              color: "white",
              "& .MuiSvgIcon-root.icon-main": {
                color: "white",
                backgroundColor: "rgba(255,255,255,0.2)"
              }
            },
            padding: "1rem",
            borderRadius: "30px",
            width: isSmallLaptop || isTablet || isMobile ? "100%" : "32%",
            textAlign: "left",
            position: "relative",
            transition: "all 0.3s ease",
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <NextWeek className="icon-main"
                sx={{
                  fontSize: "35px",
                  marginRight: "20px",
                  borderRadius: "25%",
                  padding: "10px",
                  backgroundColor: "#f0f0f0",
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                  color: "green",
                  transition: "all 0.3s ease",
                }} />
              <Box>
                <Typography variant="h6">Reporte de Pago</Typography>
                <Typography variant="subtitle2" sx={{ fontSize: '12px', color: 'gray' }}>
                  Pagos del mes
                </Typography>
              </Box>
            </Box>
            <ExpandMoreIcon sx={{ fontSize: "24px" }} />
          </Box>

          <Typography variant="h4" sx={{ marginTop: '20px', fontWeight: 'bold' }}>
            S/{resultado2.acumulacion_pago}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
            <TrendingUpIcon sx={{ fontSize: "20px", color: "inherit" }} />
            <Typography variant="subtitle2" sx={{ marginLeft: "5px", color: "inherit" }}>
              +15.6%
            </Typography>
            <Typography variant="subtitle2" sx={{ marginLeft: "auto", marginRight: "10px", color: 'gray' }}>
              Consolidado mensual
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            backgroundColor: "#ffffff",
            color: "black",
            "&:hover": {
              backgroundColor: "#008001",
              color: "white",
              "& .MuiSvgIcon-root.icon-main": {
                color: "white",
                backgroundColor: "rgba(255,255,255,0.2)"
              }
            },
            padding: "1rem",
            borderRadius: "30px",
            width: isSmallLaptop || isTablet || isMobile ? "100%" : "32%",
            textAlign: "left",
            position: "relative",
            transition: "all 0.3s ease",
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Person className="icon-main" sx={{
                fontSize: "35px",
                marginRight: "20px",
                borderRadius: "25%",
                padding: "10px",
                backgroundColor: "#f0f0f0",
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                color: "green",
                transition: "all 0.3s ease",
              }} />
              <Box>
                <Typography variant="h6">Reporte de Deuda</Typography>
                <Typography variant="subtitle2" sx={{ fontSize: '12px', color: 'gray' }}>
                  Deudas del mes
                </Typography>
              </Box>
            </Box>
            <ExpandMoreIcon sx={{ fontSize: "24px" }} />
          </Box>
          <Typography variant="h4" sx={{ marginTop: '20px', fontWeight: 'bold' }}>
            S/{resultado2.acumulacion_deuda}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
            <TrendingUpIcon sx={{ fontSize: "20px", color: "inherit" }} />
            <Typography variant="subtitle2" sx={{ marginLeft: "5px", color: "inherit" }}>
              +5.2%
            </Typography>
            <Typography variant="subtitle2" sx={{ marginLeft: "auto", marginRight: "10px", color: 'gray' }}>
              Proyección anual
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            backgroundColor: "#ffffff",
            color: "black",
            "&:hover": {
              backgroundColor: "#008001",
              color: "white",
              "& .MuiSvgIcon-root.icon-main": {
                color: "white",
                backgroundColor: "rgba(255,255,255,0.2)"
              }
            },
            padding: "1rem",
            borderRadius: "30px",
            width: isSmallLaptop || isTablet || isMobile ? "100%" : "32%",
            textAlign: "left",
            position: "relative",
            transition: "all 0.3s ease",
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Wysiwyg className="icon-main" sx={{
                fontSize: "35px",
                marginRight: "20px",
                borderRadius: "25%",
                padding: "10px",
                backgroundColor: "#f0f0f0",
                color: "green",
                transition: "all 0.3s ease",
              }} />
              <Box>
                <Typography variant="h6">Lista de Socios</Typography>
                <Typography variant="subtitle2" sx={{ fontSize: '12px', color: 'gray' }}>
                  {resultado2.cantidad_socios_activos} Activos
                </Typography>
              </Box>
            </Box>
            <ExpandMoreIcon sx={{ fontSize: "24px" }} />
          </Box>
          <Typography variant="h4" sx={{ marginTop: '20px', fontWeight: 'bold' }}>
            +{resultado2.cantidad_socios_activos}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
            <TrendingUpIcon sx={{ fontSize: "20px", color: "inherit" }} />
            <Typography variant="subtitle2" sx={{ marginLeft: "5px", color: "inherit" }}>
              En crecimiento
            </Typography>
            <Typography variant="subtitle2" sx={{ marginLeft: "auto", marginRight: "10px", color: 'gray' }}>
              Ver más
            </Typography>
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          mb: 3,
          gap: "1rem",
        }}
      >
        <Card sx={{
          width: isSmallLaptop || isTablet || isMobile ? "100%" : "70%",
          padding: isMobile ? "0" : "20px",
          borderRadius: '30px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        }}>
          <CardContent>
            <Box sx={{ textAlign: 'left', mb: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', marginLeft: "10px", marginTop: isMobile ? "10px" : "0" }}>
                Rendimiento Histórico
              </Typography>
            </Box>
            <ResponsiveContainer width="100%" height={300} style={{ marginLeft: "-25px" }}>
              <LineChart data={resultado2.historico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="pagos" stroke="#82ca9d" name="Pagos (S/)" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="deudas" stroke="#8884d8" name="Deudas (S/)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card
          sx={{
            width: isSmallLaptop || isTablet || isMobile ? "100%" : "28%",
            borderRadius: '30px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          <CardContent>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Resumen del Mes
              </Typography>
            </Box>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label={({ value }) => `${value}%`}
                  onClick={(clickedData) => setItemData(clickedData.payload as PieData)}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={formatTooltipValue} />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 2 }}>
              <Stack direction="column" sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                  <Box sx={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: COLORS[0], mr: 1 }} />
                  <Typography variant="subtitle2">Deudas ({resultado2.porcentajes.deudas}%)</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Box sx={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: COLORS[1], mr: 1 }} />
                  <Typography variant="subtitle2">Pagos ({resultado2.porcentajes.pagos}%)</Typography>
                </Box>
              </Stack>
            </Box>
            {itemData && (
              <Box sx={{ mt: 2, p: 2, border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {itemData.name}: {itemData.value}%
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Dashboard;
