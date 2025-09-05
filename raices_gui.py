import tkinter as tk
from tkinter import ttk, messagebox
import math
import matplotlib
matplotlib.use('TkAgg')
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import numpy as np
from numeric_methods import aitken, derivada_numerica, newton_raphson
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
        
        # Inicializar pestañas
        self.init_raices_tab()
        self.init_lagrange_tab()

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
