import tkinter as tk
from tkinter import messagebox
import math

# Algoritmo de búsqueda binaria (bisección)

def aitken(x0, tol, gx, fx, max_iter):
    history = []
    for n in range(max_iter):
        x1 = gx(x0)
        x2 = gx(x1)
        denom = x2 - 2 * x1 + x0
        if denom != 0:
            x_acc = x2 - (x2 - x1) ** 2 / denom
        else:
            x_acc = x2
        abs_err = abs(x_acc - x0)
        rel_err = abs_err / abs(x_acc) if x_acc != 0 else float('inf')
        history.append((n, x0, x1, x2, x_acc))
        if abs_err < tol:
            break
        x0 = x_acc
    if len(history) > 0:
        return history[-1][4], history
    else:
        return None, history

def newton_raphson(x0, tol, fx, dfx, max_iter):
    history = []
    for n in range(max_iter):
        f_xn = fx(x0)
        df_xn = dfx(x0)
        if abs(df_xn) < 1e-14:
            raise RuntimeError("Derivada cerca de cero; Newton puede fallar")
        x_next = x0 - f_xn / df_xn
        abs_err = abs(x_next - x0)
        rel_err = abs_err / abs(x_next) if x_next != 0 else float('inf')
        history.append((n, x0, f_xn, df_xn, abs_err, rel_err))
        if abs_err < tol:
            break
        x0 = x_next
    if len(history) > 0:
        return history[-1][1], history
    else:
        return None, history

def derivada_numerica(func, x, h=1e-6):
    return (func(x + h) - func(x - h)) / (2 * h)
