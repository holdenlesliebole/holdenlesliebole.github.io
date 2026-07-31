---
title: "The California swell field: wave rays from CDIP's MOP model"
date: 2026-07-31
tags: [waves, visualization, cdip, mop, nearshore]
summary: "Two browser visualizations of CDIP's MOP nearshore wave model — a live 2-D field over sixteen grids, and the 2000–present alongshore hindcast as a two-layer coastal fringe. Notes on what the gridded and alongshore products can and cannot show."
math: true
---

*Both run live in the browser: [**the current field &rarr;**](https://holdenlesliebole.github.io/california-swell/) and [**twenty-six years of it &rarr;**](https://holdenlesliebole.github.io/california-swell/history.html). Source: [github.com/holdenlesliebole/california-swell](https://github.com/holdenlesliebole/california-swell).*

## Summary

CDIP's MOP model predicts nearshore waves along the whole California coast at
roughly 100 m alongshore spacing, updated hourly. It is the dataset I use most,
and it is almost always looked at as a time series at one site. These two pages
look at it as a field instead.

The first shows the current sea state as strands traced through the peak-direction
field, over CDIP's statewide grid and all fifteen county grids, so you can zoom
from the whole coast to ~100 m anywhere between the Mexican border and Oregon.
The second shows the alongshore hindcast — 11,594 sites, hourly, back to
2000 — as a fringe along the coast, with swell and sea drawn as separate layers.

Neither is a new model. They are a rendering of CDIP's output, and most of the
work went into establishing what that output does and does not support.

## The strands are rays, and the speed is physical

Each strand follows the local peak direction $D_p$. In the geometric-optics
limit that makes it a wave ray, so where strands crowd together you are looking
at refractive focusing — the process that decides which stretch of beach takes
the energy out of a given swell. Along a transect off Torrey Pines, $D_p$ rotates
from 199° in 5,000 m of water to 246° at 9 m, turning toward shore normal as it
shoals, and $H_s$ falls from 1.07 m to 0.56 m as the oblique swell spreads.

Strand speed is the group velocity, solved per cell from the linear dispersion
relation using the local peak period and depth, with the wavenumber from Guo's
(2002) explicit fit. Strands slow and bunch as they climb the shelf.

## Where a peak statistic stops meaning anything

$D_p$ is the direction at the spectral peak. When a decaying swell and a rising
wind sea carry comparable energy, the peak flips between the two systems from one
grid cell to the next, and $D_p$ jumps tens of degrees across a sharp front. On
one frame, cells either side of such a front differ in $T_p$ by about 6 s against
0.05 s everywhere else — two wave systems trading places, not noise.

Traced faithfully, those fronts throw adjacent strands off at wildly different
angles and read as a rendering glitch. Smoothing $D_p$ would be worse than the
disease: the average of two wave systems is a direction in which no wave is
travelling. The page instead measures how well the direction field agrees with
itself locally and lets the strands fade where the peak is ambiguous, so the
field goes quiet exactly where a single direction stops describing the sea. On a
bimodal frame that affects a few per cent of cells; smooth refraction gradients
score at the top of the scale and are drawn in full.

## Sea and swell need the alongshore product

The obvious fix for a bimodal sea is to split it. That cannot be done from the
gridded files at any resolution. They publish bulk $H_s$, $T_p$, $T_a$ and $D_p$
only — a `waveFrequency` dimension is present, but no data variable references
it, so there is no per-frequency energy density and no $a_1$/$b_1$ with which to
partition a spectrum. The same is true of the `seaswell` grid variants, which are
the same bulk parameters on a 20-band discretization. Publishing spectra on the
grid would cost roughly 54 MB per time step for San Diego alone, so the omission
is understandable.

The alongshore stations do carry `waveEnergyDensity` and the directional moments,
which is what the hindcast page uses and what the live page's optional coastal
fringe is computed from.

For direction within a band, the energy flux

$$
F_x = \sum_{\text{band}} \rho g\, c_g\, a_1 E\, \mathrm{d}f,
\qquad
F_y = \sum_{\text{band}} \rho g\, c_g\, b_1 E\, \mathrm{d}f.
$$

is better than the mean direction $D_m$. Both are continuous, so either removes
the discontinuity that afflicts $D_p$. But over 1,200 hours at MOP D0586, sea and
swell each carried between 30% and 70% of the total flux for 796 of them, with
their flux directions 22° apart on average and as much as 39°. For two thirds of
the record a single mean direction is smooth and describes neither system. The
split is the signal, not a refinement of it. Computed over the full band, this
flux direction reproduces the file's own $D_m$ to a 1.80° mean offset with 1.38°
residual; the remainder is the $c_g$ weighting that $D_m$ does not carry.

## Two products, one record

The hindcast and the gridded nowcast are easy to conflate because both use the
word "nowcast" for different things. For the grids it is a six-hour buffer. For
the alongshore stations it is a rolling multi-year archive that begins exactly
where the hindcast stops:

| file | steps | span |
|---|---:|---|
| `_hindcast` | 221,328 | 2000-01-01 → 2025-03-31 23:00 |
| `_nowcast` | 11,663 | 2025-04-01 00:00 → present |

Together they are continuous and hourly from 2000 to now with no gap. The handoff
is invisible in the data as well as in the index: across 2025-04-01 the statewide
mean $H_s$ changes by 0.014 m, against a median day-to-day change of 0.115 m,
making it one of the calmest transitions in that year.

## Events chosen from the data

The hindcast page offers twenty events. They are not remembered dates. Every day
in the record is ranked on the statewide 90th-percentile swell-band $H_s$, so an
event has to be large along a broad stretch of coast rather than at one exposed
site, with a minimum separation so a single storm cannot fill the list. The
ranking runs on daily snapshots, which attenuates short-lived peaks, so it is a
defensible shortlist rather than a definitive ordering.

The largest nearshore wave in the set is 15.56 m, on 2024-12-23 at MOP M0486 off
the Mendocino coast near Westport. That event is worth scrubbing through: its
peak reaches Mendocino at 19:00 UTC and San Diego sixteen hours later, and
Los Angeles and Orange County peak *below* San Diego — 3.76 m and 3.64 m against
5.77 m — with Point Conception and the Channel Islands shadowing the basin while
San Diego stays open to the residual northwest.

## Scope and limits

The strands are rays, not water-particle trajectories, and nothing here advects a
physical parcel. The pages trace an already-computed $D_p$ field rather than
integrating the eikonal equation, so caustics are implied rather than resolved.
Strand pacing is scaled for legibility. Colour ranges and the wave-height scale
are derived per payload, so a calm year and a stormy one are not on a common
scale without reading the legend.

Sea-band coverage is not uniform across the hindcast. MOP's band estimates depend
on which offshore buoys were feeding the model at the time, and that changed: Del
Norte has no sea-band estimate until October 2005, Humboldt carries one in about
84% of months, Santa Barbara in all of them. Those gaps arrive as exactly zero
energy, which once drawn is indistinguishable from flat calm, so the page reports
the fraction of sites actually carrying an estimate for the frame on screen.

## Implementation

Plain ES2020 and canvas, no dependencies and no build step for the front end.
CDIP's THREDDS server sends no CORS header, so a Python build step
quantizes the fields to a byte each over a wet-cell mask and commits the result;
scheduled GitHub Actions rebuild the gridded payloads every six hours and the
current hindcast year monthly. A visitor downloads the statewide grid plus
whichever county they are looking at, about 0.5–2.5 MB, rather than the whole set.
