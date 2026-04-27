---
title: "The Korteweg–de Vries equation: nonlinearity balances dispersion in shallow water"
date: 2023-07-15
tags: [theory, fluid-dynamics, nonlinear-waves, solitons]
summary: "Deriving the KdV equation from the shallow-water Euler equations, and the sech² soliton that emerges as the exact balance between nonlinear steepening and linear dispersion."
math: true
---

*Filed under theory notes. The original handwritten version was written in 2022; this is a clean re-write from July 2023.*

## Overview

In August 1834, the Scottish engineer John Scott Russell was riding alongside the Union Canal near Edinburgh when a boat being towed by horses suddenly stopped. The displaced bow water did not break or disperse. Instead, as Russell later wrote, it *"rolled forward with great velocity, assuming the form of a large solitary elevation, a rounded, smooth, and well-defined heap of water, which continued its course along the channel apparently without change of form or diminution of speed."* He chased it on horseback for a mile or two before he lost it in a bend of the canal.

The puzzle was sharp. Water waves are supposed either to spread (long components travel faster than short ones, so a localised pulse should disperse) or to steepen and break (higher water travels faster than lower water, so a smooth profile should sharpen at the front). Russell's wave did neither.

Sixty years later, Diederik Korteweg and Gustav de Vries showed that for a shallow basin, the two tendencies can balance exactly. The resulting equation, in canonical non-dimensional form, is

$$
\eta_t + 6\,\eta\,\eta_x + \eta_{xxx} = 0.
$$

The nonlinear term causes peaks to move faster than troughs. The third-derivative term causes long wavelengths to move faster than short ones. Russell's solitary wave is the sech² profile that emerges as the exact equilibrium between the two.

The note works through the chain Euler → linear shallow-water → KdV, with one perturbation expansion at each arrow. Topics covered:

- the two small parameters \\(\epsilon = h_0/\lambda\\) (shallowness) and \\(\delta = a/h_0\\) (amplitude), and the KdV scaling \\(\delta = O(\epsilon^2)\\);
- non-dimensionalisation of the incompressible Euler equations with three boundary conditions (bed, kinematic, dynamic);
- leading order: hydrostatic pressure and the linear shallow-water equations;
- the non-hydrostatic pressure correction at next order, and how the third-derivative term enters;
- the depth-averaged Boussinesq pair, and reduction to the unidirectional KdV equation;
- the sech² soliton solution by ODE methods, and the amplitude-speed relation \\(c = 2A\\);
- a brief note on integrability and the GGKM inverse-scattering result.

## Motivation

I wrote this for myself in 2022 and tried (and gave up on) cleaning it up several times since. The version posted here is a 2023 re-write of the original handwritten notes, with the algebra at the next-order step shown explicitly rather than skipped. The crux is the moment in §4 where the dispersive term emerges from the non-hydrostatic pressure correction at \\(O(\epsilon^2)\\); textbooks often hand-wave through this, and I wanted to write it down once.

The note is written for a reader who has multivariable calculus, ODEs and PDEs, and exposure to fluid mechanics at the level of incompressible Euler. The two small parameters and the perturbation expansion are introduced as we go.

## Where this leads

The derivation here is for surface waves on a single homogeneous fluid layer. The same machinery (small-amplitude, long-wavelength, balance of nonlinearity and dispersion) extends to internal waves in a stratified ocean, to interfacial waves between layers of different density, and to long waves on a sheared mean flow. The resulting evolution equations are KdV, the Gardner equation (when the quadratic nonlinear coefficient vanishes), the Benjamin–Ono equation (when the wave sits on a deep stratified layer), or the intermediate long-wave (ILW) equation (for finite stratified depth). A separate note on those extensions, drawn from material in Falk Feddersen's advanced nonlinear-waves class at SIO, is in preparation.

## Downloads

- **Full PDF note.** <a href="/assets/notes/kdv-shallow-water.pdf">Download PDF</a> (6 pp.)
