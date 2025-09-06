import tkinter as tk
from tkinter import ttk, messagebox
import math
import matplotlib
matplotlib.use('TkAgg')
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import numpy as np
import random
from numeric_methods import aitken, derivada_numerica, newton_raphson

# Función para calcular t crítico sin scipy
def t_critical(alpha, df):
    """Aproximación del valor crítico t usando la distribución normal para df grandes"""
    if df >= 30:
        # Para df >= 30, usar aproximación normal
        z_values = {0.10: 1.645, 0.05: 1.96, 0.01: 2.576}
        return z_values.get(alpha, 1.96)
    else:
        # Valores aproximados de t para df pequeños (95% confianza)
        t_table = {
            1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
            6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
            15: 2.131, 20: 2.086, 25: 2.060, 29: 2.045
        }
        # Buscar el valor más cercano
        if df in t_table:
            return t_table[df]
        else:
            # Interpolación simple
            keys = sorted(t_table.keys())
            for i, key in enumerate(keys):
                if df <= key:
                    return t_table[key]
            return 2.045  # Valor por defecto para df > 29
try:
    from sympy import symbols, simplify, expand, lambdify, factorial, diff, log, gcd, Rational, cancel
except ImportError:
    messagebox.showerror("Error", "Se requiere sympy para la interpolación de Lagrange. Instale con: pip install sympy")
    import sys
    sys.exit(1)

def safe_lambda(expr):
    allowed_names = {k: getattr(math, k) for k in dir(math) if not k.startswith("__")}
    allowed_names.update({"abs": abs, "pow": pow})
    code = compile(expr, '<string>', 'eval')
    return lambda x: eval(code, {"__builtins__": {}}, {**allowed_names, 'x': x})

class ModeladoSimulacionGUI:
    def __init__(self, master):
        self.master = master
        master.title("Métodos de Modelado y Simulación")
        
        # Crear notebook para pestañas
        self.notebook = ttk.Notebook(master)
        self.notebook.pack(fill='both', expand=True, padx=10, pady=10)
        
        # Pestaña de métodos de raíces
        self.raices_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.raices_frame, text="Métodos de Raíces")
        
        # Pestaña de interpolación de Lagrange
        self.lagrange_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.lagrange_frame, text="Interpolación de Lagrange")
        
        # Pestaña de integración numérica
        self.integracion_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.integracion_frame, text="Integración Numérica")
        
        # Inicializar pestañas
        self.init_raices_tab()
        self.init_lagrange_tab()
        self.init_integracion_tab()

    def init_raices_tab(self):
        self.method = tk.StringVar(value="newton")
        frm = ttk.Frame(self.raices_frame, padding=10)
        frm.grid(row=0, column=0, sticky='nsew')
        # Método selector
        ttk.Label(frm, text="Método:").grid(row=0, column=0, sticky='w')
        ttk.Radiobutton(frm, text="Newton-Raphson", variable=self.method, value="newton", command=self._update_fields).grid(row=0, column=1)
        ttk.Radiobutton(frm, text="Aitken", variable=self.method, value="aitken", command=self._update_fields).grid(row=0, column=2)

        # Entradas
        self.fx_var = tk.StringVar(value="x**3-2*x-5")
        self.dfx_var = tk.StringVar(value="")
        self.gx_var = tk.StringVar(value="")
        self.x0_var = tk.StringVar(value="1.5")
        self.tol_var = tk.StringVar(value="1e-8")
        self.max_iter_var = tk.StringVar(value="50")

        ttk.Label(frm, text="f(x):").grid(row=1, column=0, sticky='w')
        self.fx_entry = ttk.Entry(frm, textvariable=self.fx_var, width=30)
        self.fx_entry.grid(row=1, column=1, columnspan=2, sticky='we')

        ttk.Label(frm, text="f'(x) (Newton, opcional):").grid(row=2, column=0, sticky='w')
        self.dfx_entry = ttk.Entry(frm, textvariable=self.dfx_var, width=30)
        self.dfx_entry.grid(row=2, column=1, columnspan=2, sticky='we')

        ttk.Label(frm, text="g(x) (Aitken):").grid(row=3, column=0, sticky='w')
        self.gx_entry = ttk.Entry(frm, textvariable=self.gx_var, width=30)
        self.gx_entry.grid(row=3, column=1, columnspan=2, sticky='we')

        ttk.Label(frm, text="x0:").grid(row=4, column=0, sticky='w')
        ttk.Entry(frm, textvariable=self.x0_var, width=10).grid(row=4, column=1)
        ttk.Label(frm, text="tol:").grid(row=4, column=2, sticky='w')
        ttk.Entry(frm, textvariable=self.tol_var, width=10).grid(row=4, column=3)
        ttk.Label(frm, text="max_iter:").grid(row=4, column=4, sticky='w')
        ttk.Entry(frm, textvariable=self.max_iter_var, width=10).grid(row=4, column=5)

        ttk.Button(frm, text="Calcular", command=self.run_method).grid(row=5, column=0, columnspan=2, pady=5)
        ttk.Button(frm, text="Limpiar", command=self.clear_all).grid(row=5, column=2, columnspan=2, pady=5)

        # Tabla de resultados
        cols = ("n", "xn", "f(xn)", "f'(xn)", "Error Abs", "Error Rel (%)")
        self.tree = ttk.Treeview(frm, columns=cols, show='headings', height=10)
        for c in cols:
            self.tree.heading(c, text=c)
            self.tree.column(c, width=100, anchor='center')
        self.tree.grid(row=6, column=0, columnspan=6, pady=10)

        self.result_var = tk.StringVar(value="Resultado: -")
        ttk.Label(frm, textvariable=self.result_var).grid(row=7, column=0, columnspan=6, sticky='w')

        # Gráfico
        self.fig, self.ax = plt.subplots(figsize=(5, 3))
        self.canvas = FigureCanvasTkAgg(self.fig, master=frm)
        self.canvas.get_tk_widget().grid(row=8, column=0, columnspan=6)

        self._update_fields()
    
    def init_lagrange_tab(self):
        """Inicializar la pestaña de interpolación de Lagrange"""
        frm = ttk.Frame(self.lagrange_frame, padding=10)
        frm.grid(row=0, column=0, sticky='nsew')
        
        # Título
        ttk.Label(frm, text="Interpolación Polinomial de Lagrange", font=('Arial', 12, 'bold')).grid(row=0, column=0, columnspan=4, pady=5)
        
        # Entrada de puntos
        ttk.Label(frm, text="Puntos (x,y) separados por comas:").grid(row=1, column=0, sticky='w', pady=5)
        ttk.Label(frm, text="Ejemplo: (0,1), (1,2), (2,5)").grid(row=1, column=1, sticky='w', pady=5)
        
        self.puntos_var = tk.StringVar(value="(0,1), (1,2), (2,5)")
        self.puntos_entry = ttk.Entry(frm, textvariable=self.puntos_var, width=50)
        self.puntos_entry.grid(row=2, column=0, columnspan=3, sticky='we', pady=5)
        
        # Función original (opcional)
        ttk.Label(frm, text="Función original f(x) (opcional):").grid(row=3, column=0, sticky='w', pady=5)
        self.fx_original_var = tk.StringVar(value="log(x+1)")
        self.fx_original_entry = ttk.Entry(frm, textvariable=self.fx_original_var, width=30)
        self.fx_original_entry.grid(row=3, column=1, columnspan=2, sticky='we', pady=5)
        
        # Botones
        ttk.Button(frm, text="Calcular Interpolación", command=self.calcular_lagrange).grid(row=4, column=0, pady=10)
        ttk.Button(frm, text="Limpiar", command=self.limpiar_lagrange).grid(row=4, column=1, pady=10)
        
        # Área de resultados
        self.resultado_text = tk.Text(frm, height=15, width=80, wrap=tk.WORD)
        scrollbar = ttk.Scrollbar(frm, orient="vertical", command=self.resultado_text.yview)
        self.resultado_text.configure(yscrollcommand=scrollbar.set)
        
        self.resultado_text.grid(row=5, column=0, columnspan=3, pady=10, sticky='nsew')
        scrollbar.grid(row=5, column=3, sticky='ns', pady=10)
        
        # Gráfico para Lagrange
        self.fig_lagrange, self.ax_lagrange = plt.subplots(figsize=(8, 4))
        self.canvas_lagrange = FigureCanvasTkAgg(self.fig_lagrange, master=frm)
        self.canvas_lagrange.get_tk_widget().grid(row=6, column=0, columnspan=4, pady=10)
        
        # Configurar redimensionamiento
        frm.columnconfigure(0, weight=1)
        frm.rowconfigure(5, weight=1)

    def _update_fields(self):
        method = self.method.get()
        if method == "newton":
            self.fx_entry.config(state='normal')
            self.dfx_entry.config(state='normal')
            self.gx_entry.config(state='disabled')
        else:
            self.fx_entry.config(state='normal')
            self.dfx_entry.config(state='disabled')
            self.gx_entry.config(state='normal')

    def clear_all(self):
        for row in self.tree.get_children():
            self.tree.delete(row)
        self.result_var.set("Resultado: -")
        self.ax.clear()
        self.canvas.draw()

    def run_method(self):
        method = self.method.get()
        try:
            x0 = float(self.x0_var.get())
            tol = float(self.tol_var.get())
            max_iter = int(self.max_iter_var.get())
            fx = safe_lambda(self.fx_var.get())
        except Exception as e:
            messagebox.showerror("Error", f"Error en parámetros: {e}")
            return
        if method == "newton":
            try:
                dfx = safe_lambda(self.dfx_var.get()) if self.dfx_var.get() else lambda x: derivada_numerica(fx, x)
                root, hist = newton_raphson(x0, tol, fx, dfx, max_iter)
            except Exception as e:
                messagebox.showerror("Error", f"Newton-Raphson: {e}")
                return
            self._populate_table(hist)
            self.result_var.set(f"Resultado: {root}" if root else "No convergió")
            self._plot_newton(hist, fx, dfx)
        else:
            try:
                gx = safe_lambda(self.gx_var.get())
                root, hist = aitken(x0, tol, gx, fx, max_iter)
            except Exception as e:
                messagebox.showerror("Error", f"Aitken: {e}")
                return
            self._populate_table_aitken(hist)
            self.result_var.set(f"Resultado: {root}" if root else "No convergió")
            self._plot_aitken(hist, fx, gx)

    def _populate_table(self, history):
        for row in self.tree.get_children():
            self.tree.delete(row)
        for rec in history:
            n, xn, fxn, dfxn, abs_err, rel_err = rec
            rel_err_pct = rel_err * 100 if rel_err != float('inf') else float('inf')
            self.tree.insert('', 'end', values=(n, f"{xn:.6g}", f"{fxn:.6g}", f"{dfxn:.6g}", f"{abs_err:.2e}", f"{rel_err_pct:.6f}"))

    def _populate_table_aitken(self, history):
        for row in self.tree.get_children():
            self.tree.delete(row)
        for rec in history:
            n, xn, xn1, xn2, x_acc = rec
            # No error info, solo los valores
            self.tree.insert('', 'end', values=(n, f"{xn:.6g}", f"{xn1:.6g}", f"{xn2:.6g}", f"{x_acc:.6g}", "-"))

    def _plot_newton(self, history, fx, dfx):
        # Siempre mostrar el rango estándar para comparar con GeoGebra
        xmin, xmax = -2.5, 2.5
        xs = np.linspace(xmin, xmax, 2000)
        ys_fx = [fx(x) for x in xs]
        self.ax.clear()
        self.ax.plot(xs, ys_fx, color='red', linewidth=2)
        self.ax.axhline(0, color='black', linestyle='-', linewidth=1)
        self.ax.axvline(0, color='black', linestyle='-', linewidth=1)
        self.ax.set_xlim(xmin, xmax)
        self.ax.set_ylim(-4, 4)
        self.ax.set_title("f(x)")
        self.ax.grid(True, which='both', linestyle='--', linewidth=0.7, alpha=0.9)
        self.canvas.draw()


    def _plot_aitken(self, history, fx, gx):
        iter_xs = [row[1] for row in history if isinstance(row[1], (float, int))]
        if iter_xs:
            xmin = min(iter_xs) - 1
            xmax = max(iter_xs) + 1
        else:
            xmin, xmax = -2, 2
        xs = np.linspace(xmin, xmax, 800)
        ys_fx = [fx(x) for x in xs]
        ys_gx = [gx(x) for x in xs]
        self.ax.clear()
        self.ax.plot(xs, ys_fx, label='f(x)')
        self.ax.plot(xs, ys_gx, label='g(x)', color='orange')
        self.ax.axhline(0, color='gray', linestyle='--')
        # Solo marcar la última raíz (solución final)
        if history:
            r = history[-1][4]
            self.ax.plot(r, fx(r), 'ro', label='Raíz')
        self.ax.set_xlim(xmin, xmax)
        self.ax.set_ylim(
            min(min(ys_fx), min(ys_gx)) - 1,
            max(max(ys_fx), max(ys_gx)) + 1
        )
        self.ax.set_title('f(x) y g(x)')
        self.ax.legend()
        self.canvas.draw()
    
    def parsear_puntos(self, texto):
        """Parsear texto de puntos en formato (x,y), (x,y), ..."""
        try:
            # Remover espacios y dividir por comas
            texto = texto.replace(' ', '')
            # Encontrar todos los pares (x,y)
            import re
            patron = r'\(([^,]+),([^)]+)\)'
            matches = re.findall(patron, texto)
            
            puntos = []
            for match in matches:
                x = float(eval(match[0]))  # eval para manejar expresiones como 1/2
                y = float(eval(match[1]))
                puntos.append((x, y))
            
            return puntos
        except Exception as e:
            raise ValueError(f"Error al parsear puntos: {e}")
    
    def lagrange_bases(self, pares):
        """Calcular las bases de Lagrange"""
        x = symbols('x')
        n = len(pares)
        xs = [p[0] for p in pares]
        bases = []
        resultado = "BASES DE LAGRANGE\n" + "="*50 + "\n\n"
        
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
            
            # Formatear salida
            Li_simplified = cancel(Li)
            num = Li_simplified.as_numer_denom()[0]
            den = Li_simplified.as_numer_denom()[1]
            
            resultado += f"L_{i}(x) = "
            if den.is_number and den != 1:
                factor_coeff = Rational(1, den)
                expanded_num = expand(num)
                expanded_str = str(expanded_num).replace('**', '^')
                resultado += f"{factor_coeff} * ({expanded_str})\n\n"
            else:
                Li_str = str(Li_expanded).replace('**', '^')
                resultado += f"{Li_str}\n\n"
        
        return bases, resultado
    
    def lagrange_interpolante(self, pares, fx_original=None):
        """Calcular el polinomio interpolante de Lagrange"""
        x = symbols('x')
        ys = [p[1] for p in pares]
        bases, bases_text = self.lagrange_bases(pares)
        P = sum(y*b for y, b in zip(ys, bases))
        P = simplify(expand(P))
        
        resultado = bases_text + "\n" + "="*50 + "\n"
        resultado += "POLINOMIO INTERPOLANTE DE LAGRANGE\n" + "="*50 + "\n\n"
        resultado += "P(x) = "
        
        # Formatear polinomio
        try:
            coeffs = [P.coeff(x, i) for i in range(P.as_poly(x).degree() + 1)]
            coeffs = [c for c in coeffs if c != 0]
            
            if coeffs:
                common_factor = coeffs[0]
                for c in coeffs[1:]:
                    common_factor = gcd(common_factor, c)
                
                if common_factor != 1 and common_factor != 0:
                    factored_poly = P / common_factor
                    factored_str = str(factored_poly).replace('**', '^')
                    resultado += f"{common_factor} * ({factored_str})\n\n"
                else:
                    P_str = str(P).replace('**', '^')
                    resultado += f"{P_str}\n\n"
            else:
                resultado += f"{str(P).replace('**', '^')}\n\n"
        except:
            resultado += f"{str(P).replace('**', '^')}\n\n"
        
        # Verificación
        resultado += "\nVerificación:\n"
        for x_val, y_val in pares:
            resultado_eval = float(P.subs(x, x_val))
            resultado += f"P({x_val}) = {resultado_eval:.6f} (esperado: {y_val})\n"
        
        # Calcular error si se proporciona función original
        if fx_original:
            try:
                resultado += self.calcular_error_lagrange(pares, P, fx_original)
            except Exception as e:
                resultado += f"\nError al calcular error global: {e}\n"
        
        return P, resultado
    
    def calcular_error_lagrange(self, pares, P, fx_original):
        """Calcular error global para interpolación de Lagrange"""
        x = symbols('x')
        xs_data = [p[0] for p in pares]
        n = len(xs_data)
        
        resultado = "\n" + "="*50 + "\n"
        resultado += "CÁLCULO DEL ERROR GLOBAL\n" + "="*50 + "\n\n"
        
        # Polinomio de productos
        pi_x = 1
        for xi in xs_data:
            pi_x *= (x - xi)
        
        resultado += f"Polinomio de productos π(x) = {str(pi_x).replace('**', '^')}\n\n"
        
        # Función simbólica
        if fx_original == "log(x+1)":
            fx_sym = log(x + 1)
        else:
            # Intentar evaluar la función
            try:
                fx_sym = eval(fx_original.replace('^', '**'))
            except:
                return "\nNo se pudo evaluar la función original\n"
        
        # Derivada de orden n
        derivada_n = diff(fx_sym, x, n)
        resultado += f"f^({n})(x) = {str(derivada_n).replace('**', '^')}\n\n"
        
        # Error teórico
        error_formula = derivada_n * pi_x / factorial(n)
        resultado += f"Error teórico: E(x) = f^({n})(ξ) * π(x) / {n}!\n"
        resultado += f"E(x) = {str(simplify(error_formula)).replace('**', '^')}\n\n"
        
        # Calcular error máximo numéricamente
        try:
            x_min = min(xs_data)
            x_max = max(xs_data)
            
            derivada_func = lambdify(x, abs(derivada_n), 'numpy')
            pi_func = lambdify(x, abs(pi_x), 'numpy')
            
            x_test = np.linspace(x_min, x_max, 1000)
            
            max_derivada = np.max(derivada_func(x_test))
            max_pi = np.max(pi_func(x_test))
            
            error_global = max_derivada * max_pi / factorial(n)
            
            resultado += f"Máximo de |f^({n})(x)| en [{x_min}, {x_max}]: {max_derivada:.6f}\n"
            resultado += f"Máximo de |π(x)| en [{x_min}, {x_max}]: {max_pi:.6f}\n"
            resultado += f"Error global máximo: {error_global:.6f}\n"
        except Exception as e:
            resultado += f"No se pudo calcular el error global numéricamente: {e}\n"
        
        return resultado
    
    def graficar_lagrange(self, pares, P):
        """Graficar el polinomio de Lagrange"""
        x = symbols('x')
        P_func = lambdify(x, P, 'numpy')
        
        # Determinar rango
        xs_data = [p[0] for p in pares]
        ys_data = [p[1] for p in pares]
        x_min = min(xs_data) - 1
        x_max = max(xs_data) + 1
        
        # Generar puntos
        x_vals = np.linspace(x_min, x_max, 1000)
        y_vals = P_func(x_vals)
        
        # Limpiar y graficar
        self.ax_lagrange.clear()
        self.ax_lagrange.plot(x_vals, y_vals, 'b-', linewidth=2, label='Polinomio de Lagrange')
        self.ax_lagrange.plot(xs_data, ys_data, 'ro', markersize=8, label='Puntos de interpolación')
        
        # Configurar gráfico
        self.ax_lagrange.grid(True, alpha=0.3)
        self.ax_lagrange.set_xlabel('x')
        self.ax_lagrange.set_ylabel('y')
        self.ax_lagrange.set_title('Polinomio Interpolante de Lagrange')
        self.ax_lagrange.legend()
        self.ax_lagrange.axhline(y=0, color='k', linestyle='-', alpha=0.3)
        self.ax_lagrange.axvline(x=0, color='k', linestyle='-', alpha=0.3)
        
        self.canvas_lagrange.draw()
    
    def calcular_lagrange(self):
        """Función principal para calcular interpolación de Lagrange"""
        try:
            # Parsear puntos
            puntos_texto = self.puntos_var.get()
            pares = self.parsear_puntos(puntos_texto)
            
            if len(pares) < 2:
                messagebox.showerror("Error", "Se necesitan al menos 2 puntos")
                return
            
            # Función original (opcional)
            fx_original = self.fx_original_var.get().strip() if self.fx_original_var.get().strip() else None
            
            # Calcular interpolación
            P, resultado_texto = self.lagrange_interpolante(pares, fx_original)
            
            # Mostrar resultados
            self.resultado_text.delete(1.0, tk.END)
            self.resultado_text.insert(tk.END, resultado_texto)
            
            # Graficar
            self.graficar_lagrange(pares, P)
            
        except Exception as e:
            messagebox.showerror("Error", f"Error en el cálculo: {e}")
    
    def limpiar_lagrange(self):
        """Limpiar resultados de Lagrange"""
        self.resultado_text.delete(1.0, tk.END)
        self.ax_lagrange.clear()
        self.canvas_lagrange.draw()
    
    def init_integracion_tab(self):
        """Inicializar la pestaña de integración numérica"""
        main_frame = ttk.Frame(self.integracion_frame, padding=10)
        main_frame.grid(row=0, column=0, sticky='nsew')
        
        # Configurar grid
        self.integracion_frame.columnconfigure(0, weight=1)
        self.integracion_frame.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        
        # Panel izquierdo - Parámetros
        left_frame = ttk.LabelFrame(main_frame, text="Parámetros de Integración", padding=10)
        left_frame.grid(row=0, column=0, sticky='nsew', padx=(0, 10))
        
        # Variables para detectar cambios
        self.ultimo_metodo = None
        self.ultimos_parametros = {}
        
        # Función
        ttk.Label(left_frame, text="Función f(x):").grid(row=0, column=0, sticky='w', pady=2)
        self.fx_integ_var = tk.StringVar(value="x**2")
        self.fx_integ_var.trace('w', self.on_parameter_change)
        ttk.Entry(left_frame, textvariable=self.fx_integ_var, width=20).grid(row=0, column=1, sticky='ew', pady=2)
        
        # Límites
        ttk.Label(left_frame, text="Límite inferior (a):").grid(row=1, column=0, sticky='w', pady=2)
        self.a_var = tk.StringVar(value="0")
        self.a_var.trace('w', self.on_parameter_change)
        ttk.Entry(left_frame, textvariable=self.a_var, width=10).grid(row=1, column=1, sticky='w', pady=2)
        
        ttk.Label(left_frame, text="Límite superior (b):").grid(row=2, column=0, sticky='w', pady=2)
        self.b_var = tk.StringVar(value="1")
        self.b_var.trace('w', self.on_parameter_change)
        ttk.Entry(left_frame, textvariable=self.b_var, width=10).grid(row=2, column=1, sticky='w', pady=2)
        
        # Subdivisiones
        ttk.Label(left_frame, text="Subdivisiones (n):").grid(row=3, column=0, sticky='w', pady=2)
        self.n_var = tk.StringVar(value="1000")
        self.n_var.trace('w', self.on_parameter_change)
        ttk.Entry(left_frame, textvariable=self.n_var, width=10).grid(row=3, column=1, sticky='w', pady=2)
        
        # Tolerancia
        ttk.Label(left_frame, text="Tolerancia (adaptativo):").grid(row=4, column=0, sticky='w', pady=2)
        self.tol_integ_var = tk.StringVar(value="1e-6")
        self.tol_integ_var.trace('w', self.on_parameter_change)
        ttk.Entry(left_frame, textvariable=self.tol_integ_var, width=10).grid(row=4, column=1, sticky='w', pady=2)
        
        # Semilla Monte Carlo
        ttk.Label(left_frame, text="Semilla (Monte Carlo):").grid(row=5, column=0, sticky='w', pady=2)
        self.semilla_var = tk.StringVar(value="42")
        self.semilla_var.trace('w', self.on_parameter_change)
        ttk.Entry(left_frame, textvariable=self.semilla_var, width=10).grid(row=5, column=1, sticky='w', pady=2)
        
        # Iteraciones Monte Carlo
        ttk.Label(left_frame, text="Iteraciones (Monte Carlo):").grid(row=6, column=0, sticky='w', pady=2)
        self.iter_mc_var = tk.StringVar(value="10000")
        self.iter_mc_var.trace('w', self.on_parameter_change)
        ttk.Entry(left_frame, textvariable=self.iter_mc_var, width=10).grid(row=6, column=1, sticky='w', pady=2)
        
        # Métodos de integración
        methods_frame = ttk.LabelFrame(left_frame, text="Métodos de Integración", padding=5)
        methods_frame.grid(row=7, column=0, columnspan=2, sticky='ew', pady=10)
        
        # Botones de métodos
        ttk.Button(methods_frame, text="Rectángulo\n(Grado 0)", command=lambda: self.calcular_integracion('rectangulo')).grid(row=0, column=0, padx=2, pady=2)
        ttk.Button(methods_frame, text="Trapezoidal\n(Grado 1)", command=lambda: self.calcular_integracion('trapezoidal')).grid(row=0, column=1, padx=2, pady=2)
        ttk.Button(methods_frame, text="Simpson 1/3\n(Grado 2)", command=lambda: self.calcular_integracion('simpson13')).grid(row=0, column=2, padx=2, pady=2)
        
        ttk.Button(methods_frame, text="Simpson 3/8\n(Grado 3)", command=lambda: self.calcular_integracion('simpson38')).grid(row=1, column=0, padx=2, pady=2)
        ttk.Button(methods_frame, text="Boole\n(Grado 4)", command=lambda: self.calcular_integracion('boole')).grid(row=1, column=1, padx=2, pady=2)
        ttk.Button(methods_frame, text="Romberg\n(Simpson)", command=lambda: self.calcular_integracion('romberg')).grid(row=1, column=2, padx=2, pady=2)
        
        ttk.Button(methods_frame, text="Monte Carlo\n(Estocástico)", command=lambda: self.calcular_integracion('montecarlo'), width=15).grid(row=2, column=0, columnspan=3, pady=5)
        
        # Botones de control
        control_frame = ttk.Frame(left_frame)
        control_frame.grid(row=8, column=0, columnspan=2, pady=10)
        ttk.Button(control_frame, text="Limpiar Tabla", command=self.limpiar_integracion).grid(row=0, column=0, padx=5)
        ttk.Button(control_frame, text="Ver Fórmulas", command=self.mostrar_formulas).grid(row=0, column=1, padx=5)
        ttk.Button(control_frame, text="Comparar Métodos", command=self.comparar_metodos).grid(row=0, column=2, padx=5)
        
        # Panel derecho - Visualización y resultados
        right_frame = ttk.Frame(main_frame)
        right_frame.grid(row=0, column=1, sticky='nsew')
        right_frame.columnconfigure(0, weight=1)
        right_frame.rowconfigure(1, weight=1)
        
        # Gráfico
        graph_frame = ttk.LabelFrame(right_frame, text="Visualización Gráfica", padding=5)
        graph_frame.grid(row=0, column=0, sticky='ew', pady=(0, 10))
        
        self.fig_integ, self.ax_integ = plt.subplots(figsize=(8, 4))
        self.canvas_integ = FigureCanvasTkAgg(self.fig_integ, master=graph_frame)
        self.canvas_integ.get_tk_widget().pack(fill='both', expand=True)
        
        # Tabla de resultados y estadísticas
        results_frame = ttk.LabelFrame(right_frame, text="Resultados Detallados - Monte Carlo", padding=5)
        results_frame.grid(row=1, column=0, sticky='nsew')
        results_frame.columnconfigure(0, weight=1)
        results_frame.rowconfigure(0, weight=1)
        
        # Notebook para organizar resultados
        self.results_notebook = ttk.Notebook(results_frame)
        self.results_notebook.pack(fill='both', expand=True)
        
        # Pestaña de puntos muestreados
        puntos_frame = ttk.Frame(self.results_notebook)
        self.results_notebook.add(puntos_frame, text="Puntos Muestreados")
        
        columns = ('i', 'x_i', 'f(x_i)')
        self.tree_integ = ttk.Treeview(puntos_frame, columns=columns, show='headings', height=10)
        
        self.tree_integ.heading('i', text='i')
        self.tree_integ.heading('x_i', text='x_i')
        self.tree_integ.heading('f(x_i)', text='f(x_i)')
        
        self.tree_integ.column('i', width=50, anchor='center')
        self.tree_integ.column('x_i', width=120, anchor='center')
        self.tree_integ.column('f(x_i)', width=120, anchor='center')
        
        scrollbar_integ = ttk.Scrollbar(puntos_frame, orient="vertical", command=self.tree_integ.yview)
        self.tree_integ.configure(yscrollcommand=scrollbar_integ.set)
        
        self.tree_integ.pack(side='left', fill='both', expand=True)
        scrollbar_integ.pack(side='right', fill='y')
        
        # Pestaña de estadísticas
        stats_frame = ttk.Frame(self.results_notebook)
        self.results_notebook.add(stats_frame, text="Análisis Estadístico")
        
        self.stats_text = tk.Text(stats_frame, height=10, wrap=tk.WORD, font=('Courier', 10))
        stats_scrollbar = ttk.Scrollbar(stats_frame, orient="vertical", command=self.stats_text.yview)
        self.stats_text.configure(yscrollcommand=stats_scrollbar.set)
        
        self.stats_text.pack(side='left', fill='both', expand=True)
        stats_scrollbar.pack(side='right', fill='y')
        
        # Resultado final
        self.resultado_integ_var = tk.StringVar(value="Resultado: -")
        ttk.Label(right_frame, textvariable=self.resultado_integ_var, font=('Arial', 10, 'bold')).grid(row=2, column=0, pady=5)
        
        # Inicializar estado
        self.actualizar_parametros_guardados()
    
    def rectangulo_simple(self, f, a, b, n):
        """Método del rectángulo (punto medio)"""
        h = (b - a) / n
        suma = 0
        for i in range(n):
            x_medio = a + (i + 0.5) * h
            suma += f(x_medio)
        return h * suma
    
    def trapezoidal_simple(self, f, a, b, n):
        """Método trapezoidal"""
        h = (b - a) / n
        suma = f(a) + f(b)
        for i in range(1, n):
            suma += 2 * f(a + i * h)
        return (h / 2) * suma
    
    def simpson_13(self, f, a, b, n):
        """Método de Simpson 1/3"""
        if n % 2 != 0:
            n += 1  # Asegurar que n sea par
        h = (b - a) / n
        suma = f(a) + f(b)
        
        for i in range(1, n):
            if i % 2 == 0:
                suma += 2 * f(a + i * h)
            else:
                suma += 4 * f(a + i * h)
        
        return (h / 3) * suma
    
    def simpson_38(self, f, a, b, n):
        """Método de Simpson 3/8"""
        while n % 3 != 0:
            n += 1  # Asegurar que n sea múltiplo de 3
        h = (b - a) / n
        suma = f(a) + f(b)
        
        for i in range(1, n):
            if i % 3 == 0:
                suma += 2 * f(a + i * h)
            else:
                suma += 3 * f(a + i * h)
        
        return (3 * h / 8) * suma
    
    def boole(self, f, a, b, n):
        """Método de Boole"""
        while n % 4 != 0:
            n += 1  # Asegurar que n sea múltiplo de 4
        h = (b - a) / n
        suma = 7 * (f(a) + f(b))
        
        for i in range(1, n):
            if i % 4 == 0:
                suma += 14 * f(a + i * h)
            elif i % 2 == 0:
                suma += 12 * f(a + i * h)
            else:
                suma += 32 * f(a + i * h)
        
        return (2 * h / 45) * suma
    
    def monte_carlo(self, f, a, b, n, semilla=None):
        """Método de Monte Carlo con análisis estadístico"""
        if semilla:
            random.seed(semilla)
        
        puntos = []
        valores_fx = []
        suma = 0
        
        for i in range(n):
            x = random.uniform(a, b)
            fx = f(x)
            valores_fx.append(fx)
            suma += fx
            if i < 10:  # Guardar primeros 10 puntos para mostrar
                puntos.append((i+1, x, fx))
        
        # Cálculos estadísticos
        integral_estimada = (b - a) * suma / n
        media_fx = suma / n
        
        # Desviación estándar de f(x)
        varianza_fx = sum((fx - media_fx)**2 for fx in valores_fx) / (n - 1)
        desviacion_estandar = math.sqrt(varianza_fx)
        
        # Error estándar de la integral
        error_estandar = (b - a) * desviacion_estandar / math.sqrt(n)
        
        # Intervalo de confianza (95% por defecto)
        nivel_confianza = 0.95
        alpha = 1 - nivel_confianza
        t_critico = t_critical(alpha/2, n - 1)
        
        margen_error = t_critico * error_estandar
        intervalo_inferior = integral_estimada - margen_error
        intervalo_superior = integral_estimada + margen_error
        
        estadisticas = {
            'integral_estimada': integral_estimada,
            'desviacion_estandar': desviacion_estandar,
            'error_estandar': error_estandar,
            'intervalo_confianza': (intervalo_inferior, intervalo_superior),
            'nivel_confianza': nivel_confianza,
            'n_muestras': n
        }
        
        return integral_estimada, puntos, estadisticas
    
    def calcular_integracion(self, metodo):
        """Calcular integración según el método seleccionado"""
        try:
            # Obtener parámetros
            fx_expr = self.fx_integ_var.get()
            a = float(self.a_var.get())
            b = float(self.b_var.get())
            n = int(self.n_var.get())
            
            # Crear función
            f = safe_lambda(fx_expr)
            
            # Calcular según método
            if metodo == 'rectangulo':
                resultado = self.rectangulo_simple(f, a, b, n)
                metodo_nombre = "Rectángulo (Punto Medio)"
            elif metodo == 'trapezoidal':
                resultado = self.trapezoidal_simple(f, a, b, n)
                metodo_nombre = "Trapezoidal"
            elif metodo == 'simpson13':
                resultado = self.simpson_13(f, a, b, n)
                metodo_nombre = "Simpson 1/3"
            elif metodo == 'simpson38':
                resultado = self.simpson_38(f, a, b, n)
                metodo_nombre = "Simpson 3/8"
            elif metodo == 'boole':
                resultado = self.boole(f, a, b, n)
                metodo_nombre = "Boole"
            elif metodo == 'montecarlo':
                semilla = int(self.semilla_var.get()) if self.semilla_var.get() else None
                n_mc = int(self.iter_mc_var.get())
                resultado, puntos, estadisticas = self.monte_carlo(f, a, b, n_mc, semilla)
                metodo_nombre = "Monte Carlo"
                self.mostrar_puntos_mc(puntos)
                self.mostrar_estadisticas_mc(estadisticas, fx_expr)
            else:
                resultado = 0
                metodo_nombre = "Desconocido"
            
            # Mostrar resultado
            if metodo == 'montecarlo':
                self.resultado_integ_var.set(f"∫ {fx_expr} dx = {resultado:.6f} ± {estadisticas['error_estandar']:.6f} ({metodo_nombre})")
            else:
                self.resultado_integ_var.set(f"∫ {fx_expr} dx = {resultado:.6f} ({metodo_nombre})")
                # Limpiar análisis estadístico para métodos no Monte Carlo
                self.limpiar_estadisticas_no_mc(metodo_nombre, fx_expr, resultado)
            
            # Actualizar estado después del cálculo
            self.ultimo_metodo = metodo_nombre
            self.actualizar_parametros_guardados()
            
            # Graficar
            self.graficar_integracion(f, a, b, n, metodo, fx_expr)
            
        except Exception as e:
            messagebox.showerror("Error", f"Error en el cálculo: {e}")
    
    def mostrar_puntos_mc(self, puntos):
        """Mostrar puntos de Monte Carlo en la tabla"""
        # Limpiar tabla
        for item in self.tree_integ.get_children():
            self.tree_integ.delete(item)
        
        # Agregar puntos
        for i, x, fx in puntos:
            self.tree_integ.insert('', 'end', values=(i, f"{x:.6f}", f"{fx:.6f}"))
    
    def mostrar_estadisticas_mc(self, estadisticas, fx_expr):
        """Mostrar análisis estadístico de Monte Carlo"""
        self.stats_text.delete(1.0, tk.END)
        
        stats_info = f"""ANÁLISIS ESTADÍSTICO - MONTE CARLO
{'='*50}

Función: {fx_expr}
Número de muestras: {estadisticas['n_muestras']:,}
Nivel de confianza: {estadisticas['nivel_confianza']*100:.1f}%

RESULTADOS:
{'-'*30}
Integral estimada: {estadisticas['integral_estimada']:.8f}
Desviación estándar: {estadisticas['desviacion_estandar']:.8f}
Error estándar: {estadisticas['error_estandar']:.8f}

INTERVALO DE CONFIANZA ({estadisticas['nivel_confianza']*100:.1f}%):
{'-'*30}
Límite inferior: {estadisticas['intervalo_confianza'][0]:.8f}
Límite superior: {estadisticas['intervalo_confianza'][1]:.8f}
Margen de error: ±{estadisticas['error_estandar']:.8f}

INTERPRETACIÓN:
{'-'*30}
Con un {estadisticas['nivel_confianza']*100:.1f}% de confianza, el valor real de la integral
está entre {estadisticas['intervalo_confianza'][0]:.6f} y {estadisticas['intervalo_confianza'][1]:.6f}.

Precisión relativa: {(estadisticas['error_estandar']/abs(estadisticas['integral_estimada'])*100):.4f}%
"""
        
        self.stats_text.insert(tk.END, stats_info)
        self.stats_text.config(state='disabled')
    
    def limpiar_estadisticas_no_mc(self, metodo_nombre, fx_expr, resultado):
        """Mostrar información para métodos determinísticos"""
        self.stats_text.delete(1.0, tk.END)
        
        info_deterministica = f"""MÉTODO DETERMINÍSTICO - {metodo_nombre.upper()}
{'='*50}

Función: {fx_expr}
Método: {metodo_nombre}
Resultado: {resultado:.8f}

CARACTERÍSTICAS:
{'-'*30}
• Este es un método determinístico
• No hay variabilidad aleatoria
• El resultado es exacto para el método usado
• No se requiere análisis estadístico

PARA ANÁLISIS ESTADÍSTICO:
{'-'*30}
Use el método Monte Carlo para obtener:
• Desviación estándar
• Error estándar  
• Intervalo de confianza
• Análisis de incertidumbre

PRECISIÓN:
{'-'*30}
La precisión depende del número de subdivisiones (n)
y del método seleccionado. Métodos de mayor grado
(como Simpson o Boole) son más precisos para
funciones suaves.
"""
        
        self.stats_text.insert(tk.END, info_deterministica)
        self.stats_text.config(state='disabled')
    
    def on_parameter_change(self, *args):
        """Detectar cambios en parámetros y limpiar resultados obsoletos"""
        parametros_actuales = self.obtener_parametros_actuales()
        
        # Si hay un método ejecutado y los parámetros cambiaron
        if self.ultimo_metodo and parametros_actuales != self.ultimos_parametros:
            self.mostrar_parametros_cambiados()
    
    def obtener_parametros_actuales(self):
        """Obtener parámetros actuales como diccionario"""
        try:
            return {
                'fx': self.fx_integ_var.get(),
                'a': self.a_var.get(),
                'b': self.b_var.get(),
                'n': self.n_var.get(),
                'tol': self.tol_integ_var.get(),
                'semilla': self.semilla_var.get(),
                'iter_mc': self.iter_mc_var.get()
            }
        except:
            return {}
    
    def actualizar_parametros_guardados(self):
        """Actualizar parámetros guardados después de un cálculo"""
        self.ultimos_parametros = self.obtener_parametros_actuales()
    
    def mostrar_parametros_cambiados(self):
        """Mostrar mensaje cuando los parámetros han cambiado"""
        self.stats_text.delete(1.0, tk.END)
        
        mensaje_cambio = f"""PARÁMETROS MODIFICADOS
{'='*50}

Los parámetros han cambiado desde el último cálculo.
Los resultados mostrados pueden no ser válidos.

ÚLTIMO MÉTODO EJECUTADO: {self.ultimo_metodo}

PARA ACTUALIZAR RESULTADOS:
{'-'*30}
• Presione el botón del método deseado para recalcular
• Los nuevos parámetros se aplicarán automáticamente

PARÁMETROS ACTUALES:
{'-'*30}
• Función: {self.fx_integ_var.get()}
• Límite inferior: {self.a_var.get()}
• Límite superior: {self.b_var.get()}
• Subdivisiones: {self.n_var.get()}
• Iteraciones MC: {self.iter_mc_var.get()}
• Semilla MC: {self.semilla_var.get()}

NOTA: Los gráficos y tablas también pueden estar obsoletos.
"""
        
        self.stats_text.insert(tk.END, mensaje_cambio)
        self.stats_text.config(state='disabled')
        
        # Cambiar color del resultado para indicar que está obsoleto
        self.resultado_integ_var.set(f"{self.resultado_integ_var.get()} [PARÁMETROS MODIFICADOS]")
    
    def graficar_integracion(self, f, a, b, n, metodo, fx_expr):
        """Graficar función y método de integración"""
        self.ax_integ.clear()
        
        # Generar puntos para la función
        x_vals = np.linspace(a, b, 1000)
        y_vals = [f(x) for x in x_vals]
        
        # Graficar función
        self.ax_integ.plot(x_vals, y_vals, 'b-', linewidth=2, label=f'f(x) = {fx_expr}')
        
        # Área bajo la curva
        self.ax_integ.fill_between(x_vals, y_vals, alpha=0.3, color='lightblue')
        
        # Mostrar subdivisiones para métodos determinísticos
        if metodo != 'montecarlo':
            h = (b - a) / n
            x_points = [a + i * h for i in range(n + 1)]
            
            if metodo == 'rectangulo':
                # Mostrar rectángulos (solo algunos para no saturar)
                step = max(1, n // 20)
                for i in range(0, n, step):
                    x_mid = a + (i + 0.5) * h
                    height = f(x_mid)
                    self.ax_integ.bar(x_mid, height, width=h*0.8, alpha=0.5, color='red', edgecolor='darkred')
            
            elif metodo == 'trapezoidal':
                # Mostrar trapezoides (solo algunos)
                step = max(1, n // 20)
                for i in range(0, n, step):
                    x1, x2 = a + i * h, a + (i + 1) * h
                    y1, y2 = f(x1), f(x2)
                    self.ax_integ.plot([x1, x2, x2, x1, x1], [0, 0, y2, y1, 0], 'r-', alpha=0.7)
        
        else:
            # Para Monte Carlo, mostrar algunos puntos aleatorios
            random.seed(int(self.semilla_var.get()) if self.semilla_var.get() else None)
            x_random = [random.uniform(a, b) for _ in range(min(50, int(self.iter_mc_var.get())))]
            y_random = [f(x) for x in x_random]
            self.ax_integ.scatter(x_random, y_random, c='red', s=10, alpha=0.6, label='Puntos Monte Carlo')
        
        # Configurar gráfico
        self.ax_integ.set_xlabel('x')
        self.ax_integ.set_ylabel('f(x)')
        self.ax_integ.set_title(f'Integración Numérica - {metodo.title()}')
        self.ax_integ.grid(True, alpha=0.3)
        self.ax_integ.legend()
        self.ax_integ.axhline(y=0, color='k', linestyle='-', alpha=0.3)
        
        self.canvas_integ.draw()
    
    def limpiar_integracion(self):
        """Limpiar resultados de integración"""
        for item in self.tree_integ.get_children():
            self.tree_integ.delete(item)
        self.stats_text.delete(1.0, tk.END)
        self.stats_text.insert(tk.END, "Seleccione un método de integración para ver los resultados aquí.")
        self.stats_text.config(state='disabled')
        self.resultado_integ_var.set("Resultado: -")
        self.ax_integ.clear()
        self.canvas_integ.draw()
    
    def mostrar_formulas(self):
        """Mostrar fórmulas de integración"""
        formulas = """
FÓRMULAS DE INTEGRACIÓN NUMÉRICA

1. Rectángulo (Punto Medio):
   ∫[a,b] f(x)dx ≈ h * Σf(xi + h/2)
   donde h = (b-a)/n

2. Trapezoidal:
   ∫[a,b] f(x)dx ≈ (h/2)[f(a) + 2Σf(xi) + f(b)]

3. Simpson 1/3:
   ∫[a,b] f(x)dx ≈ (h/3)[f(a) + 4Σf(x_impar) + 2Σf(x_par) + f(b)]

4. Simpson 3/8:
   ∫[a,b] f(x)dx ≈ (3h/8)[f(a) + 3Σf(x_no_múltiplo_3) + 2Σf(x_múltiplo_3) + f(b)]

5. Monte Carlo:
   ∫[a,b] f(x)dx ≈ (b-a) * (1/N) * Σf(xi)
   donde xi son puntos aleatorios en [a,b]
"""
        
        # Crear ventana de fórmulas
        formula_window = tk.Toplevel(self.master)
        formula_window.title("Fórmulas de Integración")
        formula_window.geometry("600x500")
        
        text_widget = tk.Text(formula_window, wrap=tk.WORD, padx=10, pady=10)
        text_widget.pack(fill='both', expand=True)
        text_widget.insert(tk.END, formulas)
        text_widget.config(state='disabled')
    
    def comparar_metodos(self):
        """Comparar todos los métodos de integración"""
        try:
            fx_expr = self.fx_integ_var.get()
            a = float(self.a_var.get())
            b = float(self.b_var.get())
            n = int(self.n_var.get())
            f = safe_lambda(fx_expr)
            
            # Calcular con todos los métodos
            resultados = {}
            resultados['Rectángulo'] = self.rectangulo_simple(f, a, b, n)
            resultados['Trapezoidal'] = self.trapezoidal_simple(f, a, b, n)
            resultados['Simpson 1/3'] = self.simpson_13(f, a, b, n)
            resultados['Simpson 3/8'] = self.simpson_38(f, a, b, n)
            resultados['Boole'] = self.boole(f, a, b, n)
            
            # Monte Carlo (promedio de 5 ejecuciones)
            mc_results = []
            for _ in range(5):
                resultado, _, _ = self.monte_carlo(f, a, b, int(self.iter_mc_var.get()))
                mc_results.append(resultado)
            resultados['Monte Carlo (promedio)'] = np.mean(mc_results)
            resultados['Monte Carlo (desv. std)'] = np.std(mc_results)
            
            # Mostrar comparación
            comp_text = f"COMPARACIÓN DE MÉTODOS\nFunción: {fx_expr}\nIntervalo: [{a}, {b}]\n\n"
            for metodo, valor in resultados.items():
                comp_text += f"{metodo:20}: {valor:.8f}\n"
            
            # Crear ventana de comparación
            comp_window = tk.Toplevel(self.master)
            comp_window.title("Comparación de Métodos")
            comp_window.geometry("400x300")
            
            text_widget = tk.Text(comp_window, wrap=tk.WORD, padx=10, pady=10)
            text_widget.pack(fill='both', expand=True)
            text_widget.insert(tk.END, comp_text)
            text_widget.config(state='disabled')
            
        except Exception as e:
            messagebox.showerror("Error", f"Error en la comparación: {e}")


import sys

def main():
    root = tk.Tk()
    def on_closing():
        root.destroy()
        sys.exit(0)
    root.protocol("WM_DELETE_WINDOW", on_closing)
    ModeladoSimulacionGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()
