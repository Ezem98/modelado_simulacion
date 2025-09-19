import { IntegrationMethodSelectItem, MonteCarloSelectItem } from "@/types";

export const INTEGRATION_METHODS: IntegrationMethodSelectItem[] = [
  {
    label: "Rectangulo (Grado 0)",
    value: "rectangle",
  },
  {
    label: "Trapecio (Grado 1)",
    value: "trapezoid",
  },
  {
    label: "Simpson 1/3 (Grado 2)",
    value: "simpson_1_3",
  },
  {
    label: "Simpson 3/8 (Grado 3)",
    value: "simpson_3_8",
  },
  {
    label: "Boole (Grado 4)",
    value: "boole",
  },
  {
    label: "Gauss-Legendre",
    value: "gauss-legendre",
  },
];

export const MONTE_CARLO_TYPES: MonteCarloSelectItem[] = [
  {
    label: "Promedio",
    value: "average",
  },
  {
    label: "Confianza",
    value: "confidence",
  },
];
