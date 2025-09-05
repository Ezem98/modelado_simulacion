import math

def lagrange_bases(pares):
    """
    Recibe una lista de pares (x, y) y construye las bases de Lagrange L_i(x).
    Imprime cada base como una función simbólica en términos de x.
    """
    from sympy import symbols, simplify, expand, pprint
    x = symbols('x')
    n = len(pares)
    xs = [p[0] for p in pares]
    bases = []
    
    print("=" * 50)
    print("BASES DE LAGRANGE")
    print("=" * 50)
    
    for i in range(n):
        numerador = 1
        denominador = 1
        for j in range(n):
            if i != j:
                numerador *= (x - xs[j])
                denominador *= (xs[i] - xs[j])
        Li = numerador / denominador
        Li_expanded = simplify(expand(Li))
        bases.append(Li_expanded)
        print(f"\nL_{i}(x) =")
        
        # Mostrar en forma de factor * polinomio expandido
        from sympy import factor, collect, Rational, cancel
        
        # Obtener numerador y denominador por separado
        Li_simplified = cancel(Li)
        num = Li_simplified.as_numer_denom()[0]
        den = Li_simplified.as_numer_denom()[1]
        
        # Si el denominador es un número, mostrar como factor * polinomio
        if den.is_number and den != 1:
            factor_coeff = Rational(1, den)
            expanded_num = expand(num)
            # Reemplazar ** con ^
            expanded_str = str(expanded_num).replace('**', '^')
            print(f"{factor_coeff} * ({expanded_str})")
        else:
            # Reemplazar ** con ^ en la salida normal también
            Li_str = str(Li_expanded).replace('**', '^')
            print(Li_str)
    
    print("\n" + "=" * 50)
    return bases

def lagrange_interpolante(pares, graficar=True, fx=None):
    """
    Recibe una lista de pares (x, y) y construye el polinomio interpolante de Lagrange.
    Imprime el polinomio simbólicamente y opcionalmente lo grafica.
    Si se proporciona fx (función original), calcula el error global usando el polinomio de productos.
    """
    from sympy import symbols, simplify, expand, pprint, lambdify, factorial, diff
    import matplotlib.pyplot as plt
    import numpy as np
    
    x = symbols('x')
    ys = [p[1] for p in pares]
    bases = lagrange_bases(pares)
    P = sum(y*b for y, b in zip(ys, bases))
    P = simplify(expand(P))
    
    print("\nPOLINOMIO INTERPOLANTE DE LAGRANGE")
    print("=" * 50)
    print("P(x) =")
    
    # Mostrar en formato factor * polinomio si es posible
    from sympy import Rational, cancel, gcd, collect
    
    # Intentar extraer factor común de los coeficientes
    coeffs = [P.coeff(x, i) for i in range(P.as_poly(x).degree() + 1)]
    coeffs = [c for c in coeffs if c != 0]  # Eliminar coeficientes cero
    
    if coeffs:
        # Encontrar el GCD de los coeficientes
        common_factor = coeffs[0]
        for c in coeffs[1:]:
            common_factor = gcd(common_factor, c)
        
        if common_factor != 1 and common_factor != 0:
            factored_poly = P / common_factor
            # Reemplazar ** con ^
            factored_str = str(factored_poly).replace('**', '^')
            print(f"{common_factor} * ({factored_str})")
        else:
            # Reemplazar ** con ^ en la salida normal también
            P_str = str(P).replace('**', '^')
            print(P_str)
    else:
        pprint(P, use_unicode=False)
    
    print("=" * 50)
    
    # Calcular error global si se proporciona la función original
    if fx is not None:
        print("\nCÁLCULO DEL ERROR GLOBAL")
        print("=" * 50)
        
        # Polinomio de productos: π(x) = (x-x0)(x-x1)...(x-xn)
        xs_data = [p[0] for p in pares]
        n = len(xs_data)
        
        # Construir el polinomio de productos
        pi_x = 1
        for xi in xs_data:
            pi_x *= (x - xi)
        
        print(f"Polinomio de productos π(x) = {str(pi_x).replace('**', '^')}")
        
        # Calcular la derivada de orden n de fx (no n+1)
        fx_sym = fx(x)  # Asumiendo que fx es una función simbólica
        derivada_n = diff(fx_sym, x, n)
        print(f"f^({n})(x) = {str(derivada_n).replace('**', '^')}")
        
        # Error teórico: E(x) = f^(n)(ξ) * π(x) / n!
        error_formula = derivada_n * pi_x / factorial(n)
        print(f"Error teórico: E(x) = f^({n})(ξ) * π(x) / {n}!")
        print(f"E(x) = {str(simplify(error_formula)).replace('**', '^')}")
        
        # Calcular error máximo en el intervalo
        x_min = min(xs_data)
        x_max = max(xs_data)
        
        # Para el error global, necesitamos el máximo de |f^(n)(ξ)| en el intervalo
        # y el máximo de |π(x)| en el intervalo
        derivada_func = lambdify(x, abs(derivada_n), 'numpy')
        pi_func = lambdify(x, abs(pi_x), 'numpy')
        
        x_test = np.linspace(x_min, x_max, 1000)
        
        try:
            # Máximo de |f^(n)(x)| en el intervalo
            max_derivada = np.max(derivada_func(x_test))
            # Máximo de |π(x)| en el intervalo  
            max_pi = np.max(pi_func(x_test))
            
            # Error global máximo
            error_global = max_derivada * max_pi / factorial(n)
            
            print(f"Máximo de |f^({n})(x)| en [{x_min}, {x_max}]: {max_derivada:.6f}")
            print(f"Máximo de |π(x)| en [{x_min}, {x_max}]: {max_pi:.6f}")
            print(f"Error global máximo: {error_global:.4f}")
        except:
            print("No se pudo calcular el error global numéricamente")
        
        print("=" * 50)
    
    # Graficar si se solicita
    if graficar:
        # Convertir el polinomio simbólico a función numérica
        P_func = lambdify(x, P, 'numpy')
        
        # Determinar rango de graficación
        xs_data = [p[0] for p in pares]
        x_min = min(xs_data) - 1
        x_max = max(xs_data) + 1
        
        # Generar puntos para la curva suave
        x_vals = np.linspace(x_min, x_max, 1000)
        y_vals = P_func(x_vals)
        
        # Crear el gráfico
        plt.figure(figsize=(10, 6))
        plt.plot(x_vals, y_vals, 'b-', linewidth=2, label='Polinomio de Lagrange')
        
        # Marcar los puntos de interpolación
        xs_data = [p[0] for p in pares]
        ys_data = [p[1] for p in pares]
        plt.plot(xs_data, ys_data, 'ro', markersize=8, label='Puntos de interpolación')
        
        # Configurar el gráfico
        plt.grid(True, alpha=0.3)
        plt.xlabel('x')
        plt.ylabel('y')
        plt.title('Polinomio Interpolante de Lagrange')
        plt.legend()
        plt.axhline(y=0, color='k', linestyle='-', alpha=0.3)
        plt.axvline(x=0, color='k', linestyle='-', alpha=0.3)
        
        # Mostrar el gráfico
        plt.show()
    
    return P

# Definir la función original (exponencial)
from sympy import symbols, log
def fx_logaritmica(x):
    return log(x+1)

pares = [(0, fx_logaritmica(0)), (0.6, fx_logaritmica(0.6)), (0.9, fx_logaritmica(0.9))]

P = lagrange_interpolante(pares, fx=fx_logaritmica)

# Verificación: evaluar P(x) en cada punto
print("\nVerificación:")
for x_val, y_val in pares:
    resultado = P.subs('x', x_val)
    print(f"P({x_val}) = {resultado} (esperado: {y_val})")