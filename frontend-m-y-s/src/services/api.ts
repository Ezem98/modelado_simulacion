import { useState } from "react";

// Configuración base de la API
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://rsutll09m9.execute-api.sa-east-1.amazonaws.com/dev/modelado";

// Tipos para los métodos numéricos
export interface BinarySearchRequest {
  func: string;
  a: number;
  b: number;
  tol: number;
  max_iter: number;
}

export interface FixedPointRequest {
  g: string;
  x0: number;
  tol: number;
  max_iter: number;
  habilitar_aikten?: boolean;
}

export interface NewtonRaphsonRequest {
  func: string;
  df: string;
  x0: number;
  tol: number;
  max_iter: number;
  graph_mode: string;
  x_min: number;
  x_max: number;
  samples: number;
}

export interface BinarySearchResponse {
  resultado: {
    raiz: number;
    iteraciones: {
      iteracion: number;
      a: number;
      b: number;
      fa: number;
      fb: number;
      media: number;
      fmedia: number;
      error_absoluto: number;
      error_relativo: number;
    }[];
    motivo?: string;
  };
}

export interface FixedPointResponse {
  resultado: {
    raiz: number;
    iteraciones: {
      iteracion: number;
      x0: number;
      x1: number;
      error_absoluto: number;
      error_relativo: number;
      residuo: number;
    }[];
    motivo?: string;
  };
  detalles: {
    convergio: boolean;
    n_iter: number;
    g_evaluaciones: number;
    tol: number;
    criterio: string;
    x0_inicial: number;
  };
  extras: {
    grafico: {
      x_range: [number, number];
      g_curve: {
        x: number;
        y: number;
      }[];
      cobweb: {
        x: number;
        y: number;
      }[];
    };
    aitken: {
      habilitado: boolean;
      usos: number;
      descartes: number;
      eps_denom: number;
    };
  };
}

export interface NewtonRaphsonResponse {
  resultado: {
    raiz: number;
    iteraciones: {
      iteracion: number;
      x0: number;
      x1: number;
      error_absoluto: number;
      error_relativo: number;
      residuo: number;
    }[];
    motivo?: string;
  };
  detalles: {
    convergio: boolean;
    n_iter: number;
    x0: number;
    f_evaluaciones: number;
    df_evaluaciones: number;
    tol: number;
    criterio: string;
  };
  extras: {
    grafico: {
      x_range: [number, number];
      f_curve: {
        x: number;
        y: number;
      }[];
      segmentos: {
        desde: {
          x: number;
          y: number;
        };
        hasta: {
          x: number;
          y: number;
        };
      }[];
      raiz: {
        x: number;
        y: number;
      };
      raiz_en_curva: {
        x: number;
        y: number;
      };
    };
  };
}

// Función genérica para hacer requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
}

// Métodos específicos para cada algoritmo
export const numericMethodsAPI = {
  // Búsqueda Binaria
  binarySearch: async (
    data: BinarySearchRequest
  ): Promise<BinarySearchResponse> => {
    return apiRequest<BinarySearchResponse>("", {
      method: "POST",
      body: JSON.stringify({ ...data, metodo: "biseccion" }),
    });
  },

  // Punto Fijo
  fixedPoint: async (data: FixedPointRequest): Promise<FixedPointResponse> => {
    return apiRequest<FixedPointResponse>("", {
      method: "POST",
      body: JSON.stringify({ ...data, metodo: "punto_fijo" }),
    });
  },

  // Newton-Raphson
  newtonRaphson: async (
    data: NewtonRaphsonRequest
  ): Promise<NewtonRaphsonResponse> => {
    return apiRequest("", {
      method: "POST",
      body: JSON.stringify({ ...data, metodo: "newton_raphson" }),
    });
  },
};

// Hook personalizado para manejar estados de loading
export function useApiCall<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = async (apiCall: () => Promise<T>) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, data, execute };
}
