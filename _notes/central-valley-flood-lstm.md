---
title: "When can you trust an ML streamflow forecast? A California Sierra case study"
date: 2026-08-17
tags: [hydrology, machine-learning, flood-forecasting, evaluation]
summary: "Google's open flood-forecasting LSTM trained on 28 California basins and evaluated the way a flood-operations agency would: held-out flood years, gauge persistence as the null, peak metrics, ungauged transfer, probabilistic calibration, and a version-controlled NWM benchmark. The model wins in a bounded region, and the boundaries are the point."
math: false
---

*Code, configs, and the full methods record: [github.com/holdenlesliebole/central-valley-flood-lstm](https://github.com/holdenlesliebole/central-valley-flood-lstm).*

## The short version

The model is **a good 2-to-7-day volume forecaster for gauged basins in a hydrologic
regime it has seen.** It is **not** a flood-peak-magnitude predictor, it is **not** better
than reading yesterday's gauge at 1-day lead outside rain-driven basins, it did **not**
transfer to an unseen hydrologic regime here, its uncertainty estimates are **not yet calibrated**, and its win over
the process model **depends on which version of that model, and which years, you test
against.**

Every one of those statements is a measurement, not a hedge.

---

## Setup

`mean_embedding_forecast_lstm`, hidden size 128, trained on 28 California basins from the
Caravan dataset with MultiMet forcing (HRES, IMERG, CPC precipitation and temperature).
Streamflow targets were extended from 2014 to October 2024 using USGS NWIS so that two
genuine flood water years could be held out.

**Test set: water years 2017 and 2023** — the Oroville-spillway atmospheric-river season
and the 2023 AR sequence. Training uses every remaining day in the record outside the test windows and the
2009–2011 validation years. Checkpoints are selected on validation, not taken from the last epoch. Of the
28 trained basins, 22 have observations in the flood windows; medians below are over
that fixed cohort, except the NWM comparison in Finding 5, which is over the five
focus basins where the NWM reaches were extracted.


<figure>
  <img src="{{ '/assets/notes/cv_study_map.png' | relative_url }}" alt="Map of California with the 28 training basins colored by snow fraction; the five focus basins ringed in the high Sierra and southern Cascades; six excluded basins marked with crosses." />
  <figcaption>The 28 training basins, colored by the fraction of precipitation falling as snow &mdash; the regime variable behind Findings 1, 3 and 5. Rings: the five focus basins. Crosses: the six basins with no flood-window observations, excluded from every cohort median.</figcaption>
</figure>

**The test-period choice is the first result.** An earlier version of this work tested on
2012–2014 and reported median NSE 0.81. That window is California drought onset. Retrained
and retested at the same capacity on the same 22 basins, the model scores **0.862** on the
drought window and **0.754** on the flood years (at the smaller capacity: 0.836 and 0.679)
— and the flood-year model trains on eleven *more* years of data, so the gap is, if
anything, understated. The original number wasn't wrong; it was measured on a benign
period. Anyone reporting streamflow skill without saying which hydrologic years they
tested on is reporting the years, not the model.

---

## Finding 1 — The baseline that matters is a gauge, not a mean

NSE is scored against the *mean* of the observations, which is a very weak null. Stronger
baselines, scored on the identical test set and metric definitions — with the comparison
matched by forecast lead, since a forecast for tomorrow and a forecast for next week are
different problems:

| Lead (days) | LSTM | Persistence | Damped pers. | LSTM, focus 5 | Persistence, focus 5 | Damped, focus 5 |
|---|---|---|---|---|---|---|
| 1 | 0.667 | 0.712 | **0.738** | 0.810 | 0.944 | **0.945** |
| 2 | **0.688** | 0.484 | 0.566 | 0.810 | **0.864** | 0.869 |
| 3 | **0.665** | 0.301 | 0.447 | 0.809 | 0.803 | **0.814** |
| 5 | **0.670** | 0.037 | 0.340 | **0.802** | 0.702 | 0.725 |
| 7 | **0.597** | −0.122 | 0.295 | **0.792** | 0.610 | 0.649 |

(Damped persistence relaxes the last gauge reading toward the day-of-year climatology at
the training-fit autocorrelation — the standard stronger null. The train-period mean
scores −0.08 and raw climatology +0.20; neither is competitive.)

**At one day ahead, the gauge beats the model nearly everywhere.** Persistence decays
with lead; the LSTM barely does. The model overtakes at **day 2** across the cohort —
against both nulls — and on the high-storage snowmelt basins at **day 3 against plain
persistence, day 4 against damped persistence**. On the rain-driven basin the LSTM wins
at every lead (0.618 vs 0.594 damped at day 1), because flashy rain response isn't
persistent.

**The information asymmetry runs both ways, and both halves matter.** The LSTM never
ingests observed discharge — persistence uses a gauge reading the model is denied, and a
real flood operator *has* that gauge. But the LSTM ingests forecast meteorology through
the target day — it knows about the storm that hasn't arrived yet, and persistence knows
nothing about the future. That makes the day-1 result sharper in both directions: the
model loses to a naive gauge reading *despite* seeing tomorrow's precipitation. The
obvious next architecture takes both inputs: assimilate the gauge.


<figure>
  <img src="{{ '/assets/notes/cv_persistence_crossover.png' | relative_url }}" alt="Median NSE by forecast lead. Both persistence variants decay; the LSTM holds nearly flat. Crossovers: day 2 across the cohort, day 3 (plain) to day 4 (damped) on the snowmelt focus basins." />
  <figcaption>Persistence decays with lead while the LSTM stays nearly flat; the model overtakes at day 2 across the cohort and day 3&ndash;4 on the snowmelt focus basins.</figcaption>
</figure>

A note on the climatology row: on the 2012–2014 drought window it scored **−0.25**, and on
flood years **+0.198**. A baseline's value is a property of the test period, not of the
baseline.

---

## Finding 2 — The model gets *when*, not *how big*

On the held-out flood years:

| | Deterministic LSTM |
|---|---|
| NSE | 0.754 |
| Peak timing error | ~1 day |
| **High-flow volume bias (FHV)** | **−19%** |
| **Peaks missed** | **~45%** |
| Peak magnitude error | ~48% |

*(Peak counts come from a few events per basin over two water years — treat the peak
rows as coarse.)*

Timing is good. Magnitude is not. For flood operations — where the decision is how much
water to release before a storm — magnitude is the whole question.


<figure>
  <img src="{{ '/assets/notes/cv_flood_hydrographs.png' | relative_url }}" alt="Observed vs simulated hydrographs for the five focus basins over water year 2017; simulated peaks arrive on time but consistently lower than observed on the snowmelt basins." />
  <figcaption>Held-out WY2017: the freshet and storm timing are captured; the snowmelt-basin peaks come up short.</figcaption>
</figure>

This is not an ML-specific failure. On a separately held-out extreme (January 1997, with
the entire 1990s excluded from training), **both the LSTM and the NWM v2.1 retrospective
underestimated the flood peak by tens of percent** (1997 predates the forecast-era
forcing products, so the LSTM also ran on degraded inputs there), and on the rain-driven basin the
process model captured the peak far better. Underestimating flood peaks is approximately
the state of the art, and saying so is more useful than hiding it.

**A capacity experiment sharpens the point.** Raising hidden size from 16 to 128 improved
average skill (NSE 0.679 → 0.754) and made peaks *worse* (FHV −12% → −19%, missed peaks
0.33 → 0.45). More capacity buys accuracy on the bulk of the distribution and costs
accuracy on its tail — consistent with regression-to-the-mean on out-of-distribution
extremes, though with one training run per capacity this is a consistent gradient, not
a seed-controlled result.

---

## Finding 3 — It regionalizes within a regime and inverts across one

Ungauged prediction is what water agencies actually need: most basins have no gauge. Tested
by holding each focus basin entirely out of training.

| Basin | NSE | High-flow bias |
|---|---|---|
| Bear Ck (snowmelt) | 0.646 | −29% |
| Pitman Ck (snowmelt) | 0.375 | −62% |
| **Mill Ck (rain-driven)** | **−0.740** | **+80%** |

Skill degrades on unseen snowmelt basins. On the one **rain-driven** basin it doesn't
degrade — it **inverts**, going worse than predicting the mean, with the bias flipping sign
to over-prediction.


<figure>
  <img src="{{ '/assets/notes/cv_lobo_millck_inversion.png' | relative_url }}" alt="Mill Creek WY2023 hydrograph: the model trained on the basin tracks observations, while the held-out model over-predicts high flows including a large false peak." />
  <figcaption>The same basin, two models: trained on it (blue) vs held out of training (purple). The held-out model applies a snowmelt mapping to a rain basin and invents peaks.</figcaption>
</figure>

Trained on 27 mostly-snowmelt catchments, the model learned snowmelt and extrapolated it
to a rain-driven catchment it had never seen. This is one basin — the only rain-driven one
in the set — a demonstration, not a statistic. And it is a property of a 27-basin,
regime-homogeneous training set: the regionalization successes in the literature train on
hundreds of hydrologically diverse basins, and that diversity is the mechanism. The fix is
training-set diversity, not a different architecture — but the operational lesson stands:
a regional model quietly extrapolates its regime onto basins that don't share it.

*(Two further basins, the nested Merced pair, scored 0.857 and 0.790 — but each has its
nested partner in the training set, which leaks the hydrograph. They are excluded from the
ungauged claim.)*

---

## Finding 4 — Sharper, and overconfident

The framework can emit a full predictive distribution (a countable mixture of asymmetric
Laplacians) instead of a point estimate. Scored properly, this is where it gets interesting.

**CRPS generalizes MAE** — for a point forecast, CRPS collapses exactly to the absolute
error — so both models can be compared on one proper scoring rule with no special-casing.
The ensemble only wins if its spread carries information.

| Lead (days) | Distributional | Deterministic | Improvement |
|---|---|---|---|
| 0 (same-day) | 0.916 | 1.231 | **26%** |
| 3 | 1.081 | 1.452 | **26%** |
| 7 | 1.185 | 1.550 | **24%** |

(CRPS in mm/day.)

A consistent **22–26% CRPS reduction at every lead**. The distributional head also edges
the deterministic model on point metrics (NSE 0.784 vs 0.754, fewer missed peaks, smaller
peak error, at some cost in KGE) — the earlier reading that the two were tied traced back
to a scoring-pipeline bug, not the models.

**But the intervals are not calibrated.** A nominal 90% predictive interval covers only
**66–74%** of observations. The forecast is better *and* overconfident about being better —
for an operator, the dangerous direction.


<figure>
  <img src="{{ '/assets/notes/cv_crps_calibration.png' | relative_url }}" alt="Two panels: CRPS by lead, distributional below deterministic at every lead; and 90 percent interval coverage by lead, between 0.66 and 0.74, below the nominal 0.90 band." />
  <figcaption>Sharper on CRPS at every lead, yet the nominal 90% interval covers only 66&ndash;74% of observations.</figcaption>
</figure>

The rank histogram says why — and it is not the obvious story. In aggregate the
histogram is U-shaped and nearly symmetric (22% of observations land above the ensemble's
90th percentile rank, 20% below the 10th), which reads as simple under-dispersion. But
conditioned on flow, the misses have opposite signs: **at high flows the observation
escapes above the interval (23% above vs 3% below); at low flows it escapes below (23%
vs 9%).** The predictive distribution is not merely too narrow — it is pulled toward the
middle of the flow distribution at both ends. Regression toward the mean, expressed
distributionally. (A separate, genuine heavy-tail pathology — rare extreme samples that
inflate the ensemble standard deviation to ~3× the RMSE — explains the spread/skill
paradox and the NaN training losses, but not the coverage failure.)


<figure>
  <img src="{{ '/assets/notes/cv_pit_histogram.png' | relative_url }}" alt="Rank histogram of observations within the predictive ensemble: U-shaped and roughly symmetric overall, with mass piled at both extremes." />
  <figcaption>The rank histogram: U-shaped in aggregate, but the two tails come from different flows &mdash; high flows escape above the interval, low flows below.</figcaption>
</figure>

That diagnosis constrains the remedy: uniform variance inflation would widen intervals
everywhere and still miss high-flow observations that sit above a displaced center. The
fix has to be flow-conditional — recalibration by flow band, or a bias-aware head — and
whatever fixes coverage must be checked against the 22–26% CRPS gain it could erode.

---

## Finding 5 — The benchmark win depends on the benchmark

The result this project once led with: on the 2012–2014 window, the LSTM beat the NOAA
National Water Model v2.1 retrospective on every focus basin, median NSE 0.83 vs 0.53.
Rerun on the flood years — against both v2.1 and the current v3.0 — that headline does not
survive intact:

| Window | LSTM | NWM v2.1 | NWM v3.0 |
|---|---|---|---|
| WY2017, median NSE | 0.772 | 0.628 | **0.848** |
| WY2017, high-flow bias | −20% | −2% | **−5%** |
| WY2023 (Oct–Jan), median NSE | **0.443** | — | 0.162 |

A protocol note first: these are the NWM *retrospectives* — analysis-forced, open-loop
simulations — compared against the LSTM's same-day hindcast, a simulation-vs-simulation
comparison. Neither number is operational forecast skill, and the operational NWM
additionally assimilates gauges. On WY2017, the **modern NWM beats the LSTM on median
skill (three of five basins) and is far better on high-flow bias and peak error** — a
large share of the original margin was the NWM *version*, not the physics. On the partial
WY2023 window (the v3.0 retrospective ends 2023-02-01, so this covers the
December–January AR sequence but not the March storms) the LSTM wins on median skill,
and both systems underestimate high flows by ~53–55%.


<figure>
  <img src="{{ '/assets/notes/cv_lstm_vs_nwm_flood.png' | relative_url }}" alt="Grouped bar chart of NSE per focus basin: NWM v3.0 leads three of five basins in WY2017; the LSTM leads most basins in the partial WY2023 window except Mill Creek." />
  <figcaption>Per-basin NSE on the flood windows. The NWM v3.0 retrospective leads WY2017 on three of five basins (not Bear Ck or Pitman Ck); the LSTM leads the WY2023 window except at rain-driven Mill Ck.</figcaption>
</figure>

Two structural results are stable across every window tested. The LSTM wins **Bear
Creek** decisively in both flood years (0.92 and 0.77 vs at best 0.07) — a high-elevation,
high-storage snowmelt basin where the NWM's snow physics reliably fails. The process model
wins **rain-driven flood peaks** (Mill Creek: WY2023 0.90 vs 0.74, and the same signature
in 1997) — explicit routing captures what regression-to-the-mean smooths away.

So "ML beats the operational model" is not a finding; it is a claim indexed by model
version, test years, and hydrologic regime. The stable finding is the complementarity:
each model dominates where the other's structure fails.

---

## What this adds up to

| Use case | Verdict |
|---|---|
| 2–7 day volume forecast, gauged basin, regime seen in training | **Yes** — beats persistence (plain and damped) from day 2–4 and holds skill where both collapse |
| 1-day forecast | **No** on snowmelt/high-storage basins — the gauge is better, and free; on rain-driven basins the LSTM already wins at day 1 |
| Flood peak magnitude | **Not yet** — and the process model largely shares the failure |
| Ungauged basin in an unseen regime | **No** — skill inverts |
| Calibrated uncertainty | **Not yet** — but most fixable, and the sharpness gain (22–26% CRPS) is real |
| Replacing the process model | **No** — the v3.0 retrospective wins WY2017 on 3 of 5 basins; the models are complementary by regime |

The strongest claim this work supports is not "ML beats the operational model." It is:
**ML delivers real, measurable forecast value in gauged, in-regime basins at 2–7 day
leads, and the boundaries of that value are measurable in five independent ways.**

---

## Reproducibility

Every number above comes from a single scoring protocol: simulations read from each run's
inference output, observations taken from the source gauge records (never from a model
run's own copy), the framework's metric implementations, checkpoints chosen on validation,
and a stated 22-basin cohort. Deterministic inference was verified bit-reproducible across
repeated runs; the distributional model's sample-median metrics carry a bootstrap
uncertainty below 0.001 NSE, so reported differences are not ensemble-sampling noise
(each configuration is a single training run, so seed-to-seed variance is the remaining
uncontrolled axis).

That protocol exists because the closure tests kept catching real problems: a test-period
choice that flattered skill by 0.11 NSE, an evaluation code path that silently dropped
over a quarter of the scoreable basins from its medians, and an upstream bug that writes corrupted
observations into the distributional model's output files — found because two metrics
that could not both be true appeared together, and the observations, not the model, turned
out to be the thing to check. The record extension itself was validated by closure against
the overlapping original record, which caught a per-basin catchment-area discrepancy and
five gauges whose records genuinely disagree; those were excluded rather than silently
rescaled.

Known limitations, failure modes, and the traps encountered along the way are documented in
[`METHODS.md`](https://github.com/holdenlesliebole/central-valley-flood-lstm/blob/main/docs/METHODS.md).
