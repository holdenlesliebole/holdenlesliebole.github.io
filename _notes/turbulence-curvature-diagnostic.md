---
title: "A curvature-like diagnostic for wall-bounded turbulence"
date: 2025-07-15
tags: [theory, turbulence, fluid-dynamics]
summary: "Repackaging the Reynolds-stress divergence as a curvature-like scalar, with inversions for log-law, Reichardt, Spalding, and pipe-flow profiles."
math: true
---

*Filed under theory notes. This is a side project that I wrote to explore a question inspired by some observations of turbulent flow regimes via subaqueous PUV instruments.*

## Overview

I define a scalar diagnostic \\(\kappa(y)\\) for steady, fully developed wall-bounded turbulence by rewriting the streamwise Reynolds-averaged momentum balance as

$$
\nu\,\overline{U}''(y) \;-\; \kappa(y)\,\overline{U}^{2}(y) \;=\; -\frac{G}{\rho},
\qquad G = -\frac{d\bar p}{dx} > 0.
$$

Equivalently,

$$
\kappa(y) \;=\; \frac{\nu\,\overline{U}''(y) + G/\rho}{\overline{U}^{2}(y)}
\;=\; \frac{1}{\overline{U}^{2}(y)}\,\frac{d\overline{u'v'}}{dy}.
$$

This is an exact diagnostic reparametrisation of the Reynolds-stress divergence, **not** a turbulence closure. It is motivated by the form of the geometric acceleration term \\(\Gamma^{a}_{bc} u^{b} u^{c}\\) that appears in curvilinear coordinates, but the scalar introduced here should be interpreted as an effective connection coefficient unless an explicit coordinate map is separately supplied. The note derives \\(\kappa\\) for:

- laminar Poiseuille flow (gives \\(\kappa = 0\\)),
- the inner log law,
- Reichardt's composite wall law,
- Spalding's implicit wall law,
- laminar pipe flow,
- and turbulent pipe-flow analogues,

with careful treatment of signs, near-wall singular behaviour, wall-unit scaling, and limitations.

## Motivation

I was thinking about this for two reasons. First, the unclosed Reynolds-stress divergence has units of acceleration, and it is thus natural to ask what scalar field it resembles if we factor out a kinematic envelope. Second, the geometric form \\(\Gamma^{a}_{bc} u^{b} u^{c}\\) from general relativity and continuum mechanics sits in an interesting analogy. What would it mean for the stress-gradient contribution in a Cartesian frame to *formally* resemble a connection-coefficient term? This analogy does break down in the simple shear map.

## Downloads

- **Full PDF note.** <a href="/assets/notes/turbulence-curvature-diagnostic.pdf">Download PDF</a> <span class="note-tag">pending compile</span>

## Future directions

A few next steps I'm working on:

1. Applying this framework to channel-flow DNS (e.g.\ Lee & Moser 2015) across \\(\mathrm{Re}_{\tau}\\) and test inner-layer collapse.
2. Repeating it for pipe and boundary-layer datasets and testing if the inner diagnostic collapses while the outer diagnostic separates by geometry.
3. Defining a regularised \\(\widetilde{\kappa}\\) that avoids the no-slip parametrisation singularity (e.g. \\(\widetilde{\kappa} = (d\overline{u'v'}/dy)/u_{\tau}^{2}\\)).
4. Trying out a forward closure experiment with a simple universal form for \\(\kappa^{+}(y^{+})\\).
5. Revisiting the geometric foundations regarding whether there exists a physically meaningful non-Levi-Civita effective connection that reproduces \\(\kappa\\) without contradicting coordinate-invariance of Navier–Stokes.
