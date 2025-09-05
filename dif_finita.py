def diferencias_finitas_centrales(f, x, h=0.001, orden=1):
    """
    Calcula la derivada aproximada usando diferencias finitas centrales.
    
    Parámetros:
    - f: función a derivar
    - x: punto donde evaluar la derivada
    - h: paso (por defecto 0.001)
    - orden: orden de la derivada (1 o 2)
    
    Fórmulas:
    - Primera derivada: f'(x) ≈ [f(x+h) - f(x-h)] / (2h)
    - Segunda derivada: f''(x) ≈ [f(x+h) - 2f(x) + f(x-h)] / h²
    """
    
    if orden == 1:
        # Primera derivada central
        derivada = (f(x + h) - f(x - h)) / (2 * h)
        return derivada
    
    elif orden == 2:
        # Segunda derivada central
        derivada = (f(x + h) - 2*f(x) + f(x - h)) / (h**2)
        return derivada
    
    else:
        raise ValueError("Solo se admiten derivadas de orden 1 y 2")


def diferencias_finitas_progresivas(f, x, h=0.001, orden=1):
    """
    Calcula la derivada aproximada usando diferencias finitas progresivas (hacia adelante).
    
    Parámetros:
    - f: función a derivar
    - x: punto donde evaluar la derivada
    - h: paso (por defecto 0.001)
    - orden: orden de la derivada (1 o 2)
    
    Fórmulas:
    - Primera derivada: f'(x) ≈ [f(x+h) - f(x)] / h
    - Segunda derivada: f''(x) ≈ [f(x+2h) - 2f(x+h) + f(x)] / h²
    """
    
    if orden == 1:
        # Primera derivada progresiva
        derivada = (f(x + h) - f(x)) / h
        return derivada
    
    elif orden == 2:
        # Segunda derivada progresiva
        derivada = (f(x + 2*h) - 2*f(x + h) + f(x)) / (h**2)
        return derivada
    
    else:
        raise ValueError("Solo se admiten derivadas de orden 1 y 2")


def diferencias_finitas_regresivas(f, x, h=0.001, orden=1):
    """
    Calcula la derivada aproximada usando diferencias finitas regresivas (hacia atrás).
    
    Parámetros:
    - f: función a derivar
    - x: punto donde evaluar la derivada
    - h: paso (por defecto 0.001)
    - orden: orden de la derivada (1 o 2)
    
    Fórmulas:
    - Primera derivada: f'(x) ≈ [f(x) - f(x-h)] / h
    - Segunda derivada: f''(x) ≈ [f(x) - 2f(x-h) + f(x-2h)] / h²
    """
    
    if orden == 1:
        # Primera derivada regresiva
        derivada = (f(x) - f(x - h)) / h
        return derivada
    
    elif orden == 2:
        # Segunda derivada regresiva
        derivada = (f(x) - 2*f(x - h) + f(x - 2*h)) / (h**2)
        return derivada
    
    else:
        raise ValueError("Solo se admiten derivadas de orden 1 y 2")


def tabla_diferencias_finitas(f, x_vals, h=0.001):
    """
    Calcula una tabla con valores de la función y sus derivadas aproximadas
    en varios puntos usando diferencias finitas centrales.
    """
    print("=" * 70)
    print("TABLA DE DIFERENCIAS FINITAS CENTRALES")
    print("=" * 70)
    print(f"{'x':>10} {'f(x)':>15} {'f\'(x)':>15} {'f\'\'(x)':>15}")
    print("-" * 70)
    
    for x in x_vals:
        try:
            fx = f(x)
            fpx = diferencias_finitas_centrales(f, x, h, orden=1)
            fppx = diferencias_finitas_centrales(f, x, h, orden=2)
            
            print(f"{x:>10.4f} {fx:>15.6f} {fpx:>15.6f} {fppx:>15.6f}")
        except:
            print(f"{x:>10.4f} {'ERROR':>15} {'ERROR':>15} {'ERROR':>15}")
    
    print("=" * 70)


def tabla_comparacion_metodos(f, x_vals, h=0.001):
    """
    Compara los tres métodos de diferencias finitas para la primera derivada.
    """
    print("=" * 90)
    print("COMPARACIÓN DE MÉTODOS DE DIFERENCIAS FINITAS - PRIMERA DERIVADA")
    print("=" * 90)
    print(f"{'x':>8} {'f(x)':>12} {'Progresiva':>15} {'Regresiva':>15} {'Central':>15}")
    print("-" * 90)
    
    for x in x_vals:
        try:
            fx = f(x)
            fp_prog = diferencias_finitas_progresivas(f, x, h, orden=1)
            fp_regr = diferencias_finitas_regresivas(f, x, h, orden=1)
            fp_cent = diferencias_finitas_centrales(f, x, h, orden=1)
            
            print(f"{x:>8.4f} {fx:>12.6f} {fp_prog:>15.6f} {fp_regr:>15.6f} {fp_cent:>15.6f}")
        except:
            print(f"{x:>8.4f} {'ERROR':>12} {'ERROR':>15} {'ERROR':>15} {'ERROR':>15}")
    
    print("=" * 90)


# Ejemplo de uso
if __name__ == "__main__":
    import math
    
    # Función de prueba: f(x) = x^3 + 2x^2 - x + 1
    def f_test(x):
        return x**3 + 2*x**2 - x + 1
    
    # Derivadas exactas para comparación:
    # f'(x) = 3x^2 + 4x - 1
    # f''(x) = 6x + 4
    
    print("Ejemplo con f(x) = x³ + 2x² - x + 1")
    print("Derivadas exactas: f'(x) = 3x² + 4x - 1, f''(x) = 6x + 4")
    
    # Evaluar en x = 1
    x = 1
    f_exacta = f_test(x)
    fp_exacta = 3*x**2 + 4*x - 1  # = 6
    fpp_exacta = 6*x + 4          # = 10
    
    fp_aprox = diferencias_finitas_centrales(f_test, x, orden=1)
    fpp_aprox = diferencias_finitas_centrales(f_test, x, orden=2)
    
    print(f"\nEn x = {x}:")
    print(f"f({x}) = {f_exacta}")
    print(f"f'({x}) exacta = {fp_exacta}, aproximada = {fp_aprox:.6f}")
    print(f"f''({x}) exacta = {fpp_exacta}, aproximada = {fpp_aprox:.6f}")
    
    # Tabla para varios puntos
    x_vals = [0, 0.5, 1, 1.5, 2]
    tabla_diferencias_finitas(f_test, x_vals)
    
    print("\n")
    # Comparación de métodos
    tabla_comparacion_metodos(f_test, x_vals)
    
    print("\nEjemplos individuales:")
    x = 1.5
    print(f"\nEn x = {x}:")
    print(f"Progresiva: f'({x}) ≈ {diferencias_finitas_progresivas(f_test, x, orden=1):.6f}")
    print(f"Regresiva:  f'({x}) ≈ {diferencias_finitas_regresivas(f_test, x, orden=1):.6f}")
    print(f"Central:    f'({x}) ≈ {diferencias_finitas_centrales(f_test, x, orden=1):.6f}")
    print(f"Exacta:     f'({x}) = {3*x**2 + 4*x - 1:.6f}")

