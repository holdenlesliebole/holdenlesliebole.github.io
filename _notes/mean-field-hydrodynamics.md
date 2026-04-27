---
title: "A mean-field theory derivation from the Liouville equation to hydrodynamics"
date: 2024-06-02
tags: [theory, statistical-mechanics, kinetic-theory, hydrodynamics]
summary: "Working through the chain Hamilton → Liouville → BBGKY → Vlasov → Euler, flagging the assumption made at each step."
math: true
---

## Overview
Here's a puzzle that I find interesting: how do you get from the microscopic description of a system of \\(N\\) interacting particles to a macroscopic description in terms of a few fields? 

Imagine we have a system of interacting particles in a fluid. This could be, for example, the \\(\sim 10^{23}\\) water molecules in a glass of water, the air in a room, or the electrons and ions in a plasma. 

If we look at the scale of individual molecules, they generally bouncing around randomly, moving and interacting with each other in ways governed by Newton's laws. Each molecule's trajectory is complicated and sensitive to everything around it.

If, instead, we zoom out to the scale of the glass of water, we stop caring about the exact path of any one particle and start caring more about fluid medium fields such as pressure and density, which are the aggregate behavior of a great many molecules. How do we get from a list of positions and momenta to smooth equations on space?

Microscopically, the state is described by writing down the position and momentum of each of the \\(N\\) particles, evolved by Hamilton's equations. Macroscopically, the same systems are described by a small number of fields on three-dimensional space governed by PDEs. Each particle follows Newton's laws, but the full system is too messy to track particle by particle for very long. Where in between \\(N \sim 1\\) and \\(N \to \infty\\) does one scale become difficult to maintain and another scale become a better paradigm?

When we have enough particles, we can make some approximations that allow us to move from the microscopic to the macroscopic description. The first is that in a dense system, any one particle actually feels the average influence of all the others rather than their individual forces. This is exact in the limit $N \to \infty$. As such, we can replace collisions with a smooth, self-consistent field, as suggested by **mean-field theory**. Second, we can stop tracking individual particle velocities. Instead of asking "where is particle $i$?", we ask, "what is the density and average velocity at location $x$?" When we compress the wild and varying molecular kinetic behavior into these macroscopic quantities, we recover familiar equations for continuity, momentum balance, and so forth.

The derivation sequence is:
$$
\text{Hamilton} \to \text{Liouville} \to \text{BBGKY} \to \text{Vlasov} \to \text{Euler}
$$

Beyond canonical fluids, this in fact also applies to plasmas, self-gravitating systems, and dilute gases, but the only difference is the form of interaction between particles.


See the attached PDF for more. Topics covered:

- the Vlasov scaling \\(V \to V/N\\) and what other scalings select;
- Liouville's theorem as incompressibility of the Hamiltonian flow in phase space;
- the BBGKY hierarchy and propagation of chaos as the closure mechanism;
- the self-consistent mean-field potential \\(\Phi(x,t) = \int V(\lvert x-y \rvert)\,\rho(y,t)\,dy\\);
- the Vlasov equation and how the Boltzmann equation differs;
- 0th and 1st velocity moments giving continuity and a momentum equation with an unclosed pressure tensor;
- closures: cold limit, local thermodynamic equilibrium, Chapman–Enskog;
- example PDEs that fall out for Coulomb, Newtonian gravity, and short-range kernels.

## Downloads

- **Full PDF note.** <a href="/assets/notes/mean-field-hydrodynamics.pdf">Download PDF</a> (6 pp.)
