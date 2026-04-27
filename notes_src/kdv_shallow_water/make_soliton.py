"""Generate the KdV soliton figure for the note. Outputs soliton.pdf."""

import numpy as np
import matplotlib.pyplot as plt

A = 1.0
c = 2.0 * A
k = np.sqrt(A / 2.0)

x = np.linspace(-12, 12, 600)
eta_t0 = A * (1.0 / np.cosh(k * (x + 5))) ** 2
eta_t1 = A * (1.0 / np.cosh(k * (x - 5))) ** 2

fig, ax = plt.subplots(figsize=(7.5, 3.0))
ax.plot(x, eta_t0, color="#1f4e79", lw=1.8, label=r"$t=0$")
ax.plot(x, eta_t1, color="#c0504d", lw=1.8, ls="--", label=r"$t=5$")

ax.set_xlim(-12, 12)
ax.set_ylim(0, 1.2)
ax.set_xlabel(r"$x$")
ax.set_ylabel(r"$\eta(x,t)$")
ax.grid(True, lw=0.4, color="0.85")
ax.legend(loc="upper right", frameon=False)

ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

fig.tight_layout()
fig.savefig("soliton.pdf", bbox_inches="tight")
print("wrote soliton.pdf")
