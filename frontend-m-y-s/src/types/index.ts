import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export type IntegrationMethodType =
  | "rectangle"
  | "trapezoid"
  | "simpson_1_3"
  | "simpson_3_8"
  | "boole"
  | "gauss-legendre";
export interface IntegrationMethodSelectItem {
  label: string;
  value: IntegrationMethodType;
}

export type MonteCarloType = "average" | "confidence";

export interface MonteCarloSelectItem {
  label: string;
  value: MonteCarloType;
}
