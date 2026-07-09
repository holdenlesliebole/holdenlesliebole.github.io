---
title: "A validated browser CFD solver: four canonical flows in lattice-Boltzmann"
date: 2026-07-08
tags: [computational, fluid-dynamics, lattice-boltzmann]
summary: "A dependency-free lattice-Boltzmann solver that runs in the browser, with each of four canonical flows checked against an exact solution or a published correlation and its accuracy envelope stated."
math: true
---

*The solver runs live in the browser: [**launch the four cases &rarr;**]({{ '/projects/browser-cfd/' | relative_url }}). Each case animates a flow next to the panel that compares it against a known answer.*

## Summary

This is a fluid-dynamics solver that runs inside a web browser, written in plain
JavaScript with no libraries and no build step. It simulates four textbook flows: shear
between two plates, pressure-driven flow in a channel, flow past a cylinder, and the
transient growth of a small disturbance in a stable shear. Each one is solved by the same
430-line lattice-Boltzmann engine, and each is shown next to a panel that compares the
simulation against a known answer and states where the model stops being trustworthy.

The organizing decision is that the comparison, not the animation, is the deliverable. A
browser fluid demo that only renders a pretty velocity field says nothing about whether
the numbers mean anything. Every case here carries a reference solution and an explicit
envelope: an exact formula where one exists, a published correlation where the geometry is
harder, and a stated reason whenever the simulation and the reference disagree.

## Why build it this way

Browser-based CFD demos are common and almost always silent about accuracy. They show a
swirling field and move on. The question a working engineer asks first, *how wrong is it,
and where*, usually has no answer in the page. The aim here was a clickable solver that
answers that question for every case it shows, and that keeps the same standard of proof a
modeling group would expect from an offline code.

The four cases were chosen so that each adds exactly one new piece of machinery to the
solver and is checked before the next piece is added. The sequence runs from a flow with an
exact closed-form solution to one where the only available reference is an empirical fit,
and finally to a flow where the quantity of interest, how much a disturbance grows, has no
simple closed form in the geometry being simulated. The accuracy claims weaken in a
controlled way down that sequence, and this note is explicit about where and why.

## The method: lattice-Boltzmann

Most CFD solves the Navier–Stokes equations directly: it tracks pressure and velocity on a
mesh and, at every timestep, solves a global system for the pressure that enforces
incompressibility. That global solve is the expensive, awkward part, and it is what makes a
direct solver hard to run interactively in a browser.

Lattice-Boltzmann takes a different route. Rather than the velocity field, it tracks
populations of fictitious particles that sit on a uniform grid and can move along a small,
fixed set of directions. In two dimensions the standard choice is nine directions per cell
(the D2Q9 stencil): rest, four along the axes, four along the diagonals. Each cell stores
nine numbers \\(f_i\\), the amount of fluid currently heading in direction \\(i\\). The
ordinary fluid quantities are recovered as sums over these populations: density
\\(\rho = \sum_i f_i\\), and momentum \\(\rho\mathbf{u} = \sum_i f_i \mathbf{c}_i\\), where
\\(\mathbf{c}_i\\) is the lattice velocity of direction \\(i\\). The macroscopic
Navier–Stokes behavior emerges from the populations in the aggregate, which can be shown
formally through the Chapman–Enskog expansion. The method is neither finite-volume nor
finite-difference nor spectral. It is a lattice-kinetic scheme, closest in structure to
finite differences on a uniform Cartesian grid, with the velocity directions chosen by a
Gauss–Hermite quadrature.

Each timestep is two operations.

**Collision** is local to a cell. The populations relax toward an equilibrium set by the
local density and velocity:

$$
f_i^{\mathrm{eq}} = w_i\,\rho\left[\,1 + 3\,(\mathbf{c}_i\!\cdot\!\mathbf{u}) + \tfrac{9}{2}(\mathbf{c}_i\!\cdot\!\mathbf{u})^2 - \tfrac{3}{2}\,\lvert\mathbf{u}\rvert^2\,\right],
\qquad
f_i \leftarrow f_i + \tfrac{1}{\tau}\left(f_i^{\mathrm{eq}} - f_i\right).
$$

The weights \\(w_i\\) (4/9 for rest, 1/9 for axial, 1/36 for diagonal) and the lattice sound
speed \\(c_s^2 = 1/3\\) come from the stencil. The single parameter \\(\tau\\), the
relaxation time, sets the kinematic viscosity through
\\(\nu = c_s^2(\tau - 1/2) = (\tau - 1/2)/3\\). Viscosity is not imposed on the velocity
field; it is a consequence of how quickly the populations relax.

**Streaming** moves each population to its neighbor in the matching direction. A population
heading right ends up in the cell to the right on the next step. This shift is exact: the
lattice spacing and timestep are one lattice unit each, so a population travels exactly one
cell per step.

That second point is the whole time integration. There is no Runge–Kutta step, no implicit
solve. The scheme looks first-order but is second-order accurate in space and time; the
discrete equation comes from integrating the continuous kinetic equation along
characteristics with the trapezoidal rule, and a change of variables absorbs the implicit
part into \\(\tau\\). There is no global pressure solve at any point, which is why the
method runs comfortably in a browser. The stability limits are the Mach number
\\(\mathrm{Ma} = U\sqrt{3}\\) (the method is weakly compressible, with error of order
\\(\mathrm{Ma}^2\\), so velocities are kept small) and the approach of \\(\tau\\) to 1/2,
where the single-relaxation collision loses stability.

The grid is a uniform Cartesian array. There is no mesh generation. Solid boundaries are
marked by per-node flags rather than a body-fitted mesh: a cell is fluid, a stationary
no-slip wall, or a wall moving at a prescribed velocity. A wall reflects populations back
the way they came (bounce-back). For a flat wall this places the no-slip surface halfway
between the last fluid node and the first solid node, which makes bounce-back second-order
accurate there. A moving wall adds a correction to the reflected populations that injects
the wall's momentum (the Ladd term). The whole engine reads from this flag array, so
changing the geometry from a channel to a cylinder is a change in which cells are flagged
solid, not a rewrite of the solver.

The four cases below add features to this core one at a time. Each feature is written so
that its inactive state leaves the previous cases numerically unchanged, which is checked by
re-running their tests after every engine change.

## Case 1 — plane Couette flow

The simplest shear flow: fluid between two plates, the bottom one fixed, the top one sliding
at speed \\(U\\). With no pressure gradient the steady solution is a straight line,
\\(u(\eta) = U\eta/H\\), where \\(\eta\\) is height above the bottom wall and \\(H\\) the
gap. This is the cleanest possible correctness check because the answer is exact and the
simulation should reproduce it to within discretization error.

A second, time-dependent check comes for free. If the top plate starts impulsively from
rest, the velocity profile fills in from a flat zero toward the final straight line, and that
startup is an exact Fourier series in time. Comparing the simulated profile to that series at
several instants tests the solver under unsteady conditions, not only at steady state.

A Node script runs the simulation on a 60×42 grid at Reynolds number 100
(\\(Re = UH/\nu\\), the ratio of inertial to viscous effects). Against the steady line the
maximum error is 0.039%. Against the startup series the maximum error is 0.068% early in the
transient, tightening to 0.011% as it converges. Both are at the level of the discretization
itself.

A property worth noting: the steady Couette profile does not depend on Reynolds number. It is
a straight line at every \\(Re\\). The Reynolds number only sets how long the startup
transient takes (the diffusive time \\(H^2/\nu\\)). The simulation reproduces that
independence.

<figure>
  <img src="{{ '/assets/notes/browser_cfd_couette.png' | relative_url }}" alt="Steady plane Couette velocity profile: lattice-Boltzmann points lying on the exact straight line from zero at the fixed wall to U at the moving wall." />
  <figcaption>Steady plane Couette velocity profile. Lattice-Boltzmann (points, mid-channel column) against the exact linear solution \(u/U = y/H\) (line). 120&times;80 lattice, \(Re = 100\).</figcaption>
</figure>

## Case 2 — plane Poiseuille flow

Now both walls are fixed and the flow is pushed along the channel by a pressure gradient. The
steady solution is a parabola, \\(u(\eta) = (4U/H^2)\,\eta(H - \eta)\\), with peak speed
\\(U\\) at the centerline. The startup from rest is again an exact series, this time over the
odd Fourier modes only.

The new machinery is the forcing. A uniform pressure gradient enters lattice-Boltzmann as a
body force, and a naive addition of force biases the recovered velocity. The Guo scheme
corrects this in two places: the velocity used in the equilibrium carries a half-force shift,
\\(\mathbf{u} = (\sum_i f_i \mathbf{c}_i + \mathbf{F}/2)/\rho\\), and a source term is added
to the collision. With the force set to zero, both corrections vanish identically and the
collision reduces to the plain case from Case 1. After adding forcing to the shared engine,
the Couette test was re-run and returned byte-identical numbers, confirming the zero-force
path was untouched.

The body force is scaled with viscosity so that the centerline speed stays at \\(U\\) as the
Reynolds number changes. On the same 60×42 grid at \\(Re = 100\\), the steady parabola
matches to 0.124% maximum error and the startup transient to 0.060%. The measured centerline
speed lands within 0.19% of the target, which checks that the force calibration is right. The
steady error is larger than Couette's 0.039% for a concrete reason: the parabola has
curvature, so it exercises the spatial discretization more than a straight line does.

<figure>
  <img src="{{ '/assets/notes/browser_cfd_poiseuille.png' | relative_url }}" alt="Steady plane Poiseuille velocity profile: lattice-Boltzmann points lying on the exact parabola, peaking at U on the centerline." />
  <figcaption>Steady plane Poiseuille velocity profile. Lattice-Boltzmann (points) against the exact parabola \(u/U = 4(y/H)(1 - y/H)\) (line). 120&times;80 lattice, \(Re = 100\); the body force is scaled to hold the centerline speed at \(U\).</figcaption>
</figure>

## Case 3 — flow past a circular cylinder

This is the first case without an exact solution and the first with interesting time
behavior. Above a Reynolds number of about 47, the wake behind a cylinder stops being steady
and begins shedding vortices alternately from each side: the von Kármán street. The shedding
frequency \\(f\\) is reported as a dimensionless Strouhal number, \\(\mathrm{St} = fD/U\\),
with \\(D\\) the cylinder diameter. Williamson (1988) fit the laminar branch with

$$
\mathrm{St} = -\frac{3.3265}{Re} + 0.1816 + 1.6\times10^{-4}\,Re,
$$

valid roughly over \\(Re\\) 49 to 180. That fit is the reference.

Three pieces of machinery are added. The cylinder is a staircased disk of solid flagged cells
(every cell whose center falls inside the circle), handled by the same bounce-back as the
walls. The left edge is an inlet holding a uniform stream, the right edge is a zero-gradient
outflow, and a small transverse disturbance is placed behind the cylinder at the start so
that shedding begins promptly rather than waiting for round-off to break the symmetry. The
Strouhal number is measured live from the transverse velocity at a probe four diameters
downstream.

The first version used fixed-velocity top and bottom boundaries, and the measured Strouhal
number came out high: +13.5% at \\(Re\\) 60, falling to smaller offsets at higher \\(Re\\).
The shrinking of the error with Reynolds number is the signature of blockage: confining a
cylinder between nearby walls raises its shedding frequency, and the effect is strongest at
low \\(Re\\) where the wake is largest relative to the domain. The fix was to switch the top
and bottom to free-slip (specular reflection), the standard choice for approximating an
unbounded stream, which reduces the artificial confinement.

With free-slip boundaries, on a 320×140 grid with \\(D = 16\\) (blockage
\\(D/N_y = 0.114\\)):

| Re  | St (LBM) | Williamson | difference |
|-----|----------|-----------|------------|
| 60  | 0.1526   | 0.1358    | +12.4%     |
| 100 | 0.1756   | 0.1643    | +6.9%      |
| 140 | 0.1900   | 0.1802    | +5.4%      |
| 180 | 0.1992   | 0.1919    | +3.8%      |

The steady recirculation bubble behind the cylinder, measured at Reynolds numbers 20 and 40
where the wake is steady, has length 1.00 and 2.31 diameters against literature values of
0.93 and 2.13 (Coutanceau & Bouard).

The offset is systematic, positive, and shrinks with Reynolds number. Rather than report that
and stop, two convergence studies pin down its cause.

The first enlarges the domain at fixed \\(Re\\) 60. The offset falls and then settles: +12.4%
on the compact grid (blockage 0.114), +5.5% on a medium grid (blockage 0.080), +5.5% on a
large grid (blockage 0.057). The drop from 12.4% to 5.5% is blockage, removed by giving the
flow more room, and it converges. About seven points of the compact-domain offset is
therefore confinement.

The second study tested whether the remaining 5.5% was the coarse staircased cylinder. It
refined the disk at fixed low blockage: \\(D\\) = 16, 24, 32 gave +5.5%, +6.3%, +5.3%, flat
within measurement noise. That falsified the resolution hypothesis. The residual is neither
domain size (already converged) nor cylinder resolution (flat under refinement). It is a
low-Reynolds-number effect: \\(Re\\) 60 sits close to the shedding onset near 47, where the
Williamson fit is least constrained, and the converged Strouhal number near 0.143 sits at the
upper edge of the published cylinder data. The first guess for the residual was wrong, the
refinement check said so, and the conclusion was corrected. At the high-Reynolds end, where
the flow is least confined and the correlation best constrained, the total offset is already
3.8%.

Drag is computed and displayed, by the momentum-exchange method on the bounce-back links, but
it is flagged as a diagnostic and never used to pass or fail the case. A browser-sized domain
confines the flow and inflates form drag, so the absolute drag coefficient is not a quantity
this simulation can claim. Strouhal number and wake length are; drag is shown as a trend with
that caveat stated on the page.

<figure>
  <img src="{{ '/assets/notes/browser_cfd_cylinder.png' | relative_url }}" alt="Vorticity field of the shed wake behind a cylinder: alternating red and blue vortices forming a von Karman street downstream of the gray cylinder." />
  <figcaption>Vorticity \(\omega = \partial_x v - \partial_y u\) of the shed wake at \(Re = 120\) (blue negative, red positive; cylinder in gray). The alternating vortices are the von K&aacute;rm&aacute;n street whose frequency sets the Strouhal number. 320&times;140 lattice, free-slip top and bottom, uniform inlet at left, zero-gradient outflow at right.</figcaption>
</figure>

## Case 4 — transient growth

The last case targets a counterintuitive result. Plane Couette flow is linearly stable at
every Reynolds number: every small disturbance, decomposed into the modes of the linearized
equations, has a decaying amplitude. Eigenvalue analysis predicts monotone decay. Yet a
suitably shaped disturbance can grow first, sometimes by a large factor, before it decays.
The reason is that the linearized operator is non-normal, its modes are not orthogonal, so a
combination of decaying modes can transiently reinforce before it falls apart. The energy
gain \\(G(t) = E(t)/E(0)\\) rises and then returns.

In two dimensions the mechanism is the Orr mechanism. A disturbance whose phase lines are
tilted against the shear is rotated by the mean flow toward the vertical. During that
rotation it extracts energy from the shear, peaking when the phase lines are vertical, then
losing energy as the shear tilts it the other way. This needs no new solver code: it runs on
the validated Couette base flow using two functions that were placed in the engine at the
start of the project, one to inject an initial velocity field and one to measure the energy
of the disturbance relative to the base.

The reference is the Kelvin shearing-wave solution, which is exact for a single Fourier
disturbance in unbounded constant shear. The streamwise wavenumber \\(k_x\\) is fixed while
the cross-stream wavenumber tilts, \\(k_y(t) = k_{y0} - S k_x t\\), with \\(S\\) the shear
rate. Inviscid theory gives the disturbance vorticity as conserved and the velocity energy as

$$
\frac{E(t)}{E_0} = \frac{\lvert\mathbf{k}_0\rvert^2}{\lvert\mathbf{k}(t)\rvert^2},
$$

which peaks when \\(k_y(t) = 0\\) at time \\(t^{*} = k_{y0}/(S k_x)\\), with peak gain
\\(G = 1 + (k_{y0}/k_x)^2\\). Viscosity multiplies this by a decay factor
\\(\exp(-2\nu I(t))\\), with \\(I(t)\\) the time integral of \\(\lvert\mathbf{k}(t)\rvert^2\\).
A tall domain spanning several disturbance wavelengths approximates the unbounded shear the
formula assumes.

On a 256×258 grid with \\(\tau = 0.52\\) and an initial tilt \\(k_{y0}/k_x = 2\\), the
disturbance energy grows to 2.50 times its initial value and then decays. The peak occurs at
step 10100; the Kelvin solution predicts the peak at step 10100. The timing matches to 0.0%.
That timing agreement is the quantitative result: the disturbance untilts at exactly the rate
the shear sets, so the mechanism is captured.

The peak gain, 2.50, sits below both the inviscid ceiling \\(1 + (k_{y0}/k_x)^2 = 5\\) and the
viscous Kelvin value of 4.13. The deficit is present from early time (−7.5% by step 1000) and
grows, which points to dissipation rather than a peak-region wall effect. Two causes
contribute: the single-relaxation collision damps finite-wavelength modes slightly faster than
the nominal viscosity predicts, and the channel walls suppress the disturbance near them. The
unbounded Kelvin formula is therefore an upper reference that the bounded, viscous,
finite-resolution simulation approaches but does not reach. The exact timing is the validated
claim; the gain is reported with its gap explained.

One limit is stated plainly on the page. The transient growth famous from shear-flow
transition, where disturbances amplify by factors of a thousand, is the three-dimensional
lift-up mechanism: streamwise vortices that pump slow and fast fluid across the shear into
streaks. That mechanism is driven by vortex stretching, which is identically zero in two
dimensions. A 2D simulation can show only the weaker Orr growth. The factor-of-thousand result
is out of reach here by the dimensionality of the model, and the page says so.

<figure>
  <img src="{{ '/assets/notes/browser_cfd_transient.png' | relative_url }}" alt="Perturbation vorticity of a tilted disturbance in Couette flow: diagonal red and blue bands tilted against the shear, with thin wall layers top and bottom." />
  <figcaption>Perturbation vorticity (base shear removed) of the tilted disturbance partway through its growth, \(t \approx 0.3\,t^{*}\) (blue negative, red positive). The diagonal bands are tilted against the shear and rotate toward vertical as the energy grows; the thin bands at top and bottom are the no-slip wall layers. 256&times;160 lattice, \(\tau = 0.52\).</figcaption>
</figure>

## What the four cases establish

The accuracy claim is strongest where an exact solution exists and weakens, in a stated way,
as the geometry gets harder. Couette and Poiseuille match closed-form solutions to better than
0.13%. The cylinder matches a published correlation to 3.8% at the well-constrained end of its
range, with the larger low-Reynolds offset decomposed into a blockage part that is removed by
enlarging the domain and a residual that refinement showed is not numerical. Transient growth
reproduces the mechanism's exact timing while falling short of an unbounded-flow gain by a
margin attributed to dissipation.

Each case has a Node script that asserts its agreement and exits non-zero on failure, so the
validation is reproducible rather than a one-time screenshot. The gates test the physics that
should hold, a profile matching its formula, a frequency tracking a correlation, a disturbance
peaking at the predicted time, rather than an arbitrary tolerance tuned to pass. When the
cylinder offset exceeded a first guessed threshold, the threshold was not loosened to make it
pass; the offset was investigated and explained, and the gate was rewritten around the
quantities that actually indicate correctness.

## Scope and limits

The solver is two-dimensional and laminar by design. Turbulence is out of scope, and not as a
matter of resolution: three-dimensional turbulence is sustained by vortex stretching, which
vanishes in two dimensions, so no 2D simulation at any grid size is simulating 3D turbulence.
The cases were chosen to stay in regimes where a 2D laminar model is the correct model. The
cylinder band stops at \\(Re\\) 180 because the real wake becomes three-dimensional near
\\(Re\\) 190, which is also where the Williamson correlation ends.

The weak compressibility of the method bounds the usable velocity (error of order
\\(\mathrm{Ma}^2\\)), and the single-relaxation collision limits the reachable Reynolds number
before \\(\tau\\) approaches 1/2 and the field grows noisy. Absolute drag on the cylinder is
not a claimed quantity. The three-dimensional lift-up growth is not reachable.

## Implementation

The engine is about 430 lines of JavaScript operating on flat typed arrays, with no
dependencies. It is loaded as a classic script so the pages open directly from the file system
without a server. Each case is a self-contained HTML page that shares the engine and supplies
its own geometry, boundary conditions, reference functions, and field rendering. A selector
page presents the four together.

The validation discipline was applied to the code as well as the physics. Each page was run
through a headless test that executes its setup and several render frames before it was opened,
which caught two initialization-order bugs that a plain syntax check misses and that would
otherwise have produced a blank page.

A faster GPU compute backend and a three-dimensional extension (which would make the lift-up
growth reachable) are the natural next steps. Both are scoped but not built; the
three-dimensional renderer, rather than the solver, is the larger part of that work.
