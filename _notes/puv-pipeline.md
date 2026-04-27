---
title: "Processing Nortek Vector PUVs for nearshore wave–velocity analysis"
date: 2026-04-10
tags: [methods, instrumentation, signal-processing, fluid-dynamics]
summary: "An end-to-end pipeline for taking raw burst files from a Nortek Vector PUV through multi-taper directional wave spectra and per-burst transport diagnostics. Validated against an independent prior pipeline."
math: true
---

*Methods note. The pipeline this describes lives at <a href="https://github.com/holdenlesliebole/Nortek_Vector_PUV_Pipeline">github.com/holdenlesliebole/Nortek_Vector_PUV_Pipeline</a>. It is the instrument-side processing layer behind much of my dissertation work and is configured to drop onto Nortek Vector deployments outside Torrey Pines as well.*

## What a PUV measures, and what you need to recover from it

A pressure&ndash;velocity (PUV) instrument records co-located pressure \\(p(t)\\) and three-component velocity \\(\mathbf{u}(t)\\) at a single point on the seabed, usually at 2 Hz. Pressure, after a depth correction \\(K_p(f) = \cosh(kh)/\cosh(k(h-z_s))\\), gives the surface-elevation power spectrum \\(S_{\eta\eta}(f)\\) and bulk parameters \\(H_s\\), \\(T_p\\), \\(T_{m02}\\). Velocity gives near-bed orbital flow, mean currents, Reynolds stresses, and the velocity moments that sediment-transport models depend on (skewness \\(Sk = \langle u'^3 \rangle/\sigma_u^3\\), asymmetry \\(As = -\langle H\{u'\}^3 \rangle/\sigma_u^3\\) via Hilbert transform). Cross-spectra \\(S_{pu}(f)\\) and \\(S_{pv}(f)\\) yield the directional moments \\(a_1, b_1, a_2, b_2\\) without the spatial deconvolution that a pressure array would require.

The processing choices matter. Segmentation, detrending, tilt correction, the pressure-to-surface transfer, the spectral estimator, and coordinate rotations each carry biases that compound. Wrong choices on a few of them produce \\(H_s\\) errors of order 10% with no warning sign in the output.

This pipeline fixes a working set of those choices and validates the result against Ruby2D, an independent prior pipeline written by Athina Lange. It has run on 33 instruments across multiple deployments to date.

## Pipeline architecture

Three universal levels, deployment-agnostic, plus paper-specific analysis on top of L2.

### L0: raw on the lab server

`.dat` / `.sen` / `.hdr` burst files in `/Volumes/group/PUV_data/Vector/`. Two layouts are in production: older subfolder-per-instrument and newer flat single-instrument. Both are handled by the L1 driver via a config flag.

### L1: raw to QC'd timeseries

- Burst merging and clock-drift correction from field notes (when available; 7 of 9 winter 2023&ndash;24 instruments lack drift data).
- Variability-based tilt QC: rolling \\(2^\circ\\) standard-deviation threshold, \\(30^\circ\\) absolute cap, with sample-by-sample 3D rotation correction for instruments that ended up with bent pipes.
- Pitch / roll / pressure / correlation QC (minimum correlation 70%).
- Coordinate rotation to buoy frame (\\(+x\\) west, \\(+y\\) north, \\(+z\\) up). Magnetic declination from IGRF-14 via `igrfmagm` (Mapping Toolbox), avoiding the 5-year `wrldmagm` lifespan limit.

### L2: spectral analysis

- 17-minute (2048-sample at 2 Hz) non-overlapping segments. Earlier 1-hour segmentation was abandoned because tidal artifacts persisted after harmonic fitting; 17 minutes lets first-order detrending suffice and matches the nearshore-literature convention (Elgar et al. 2001 and earlier).
- Multi-taper power spectral density estimator with parameters \\(NW = 4\\), 7 DPSS tapers, \\(N_{\rm fft} = 2048\\), \\(\Delta f \approx 0.001\\) Hz. Welch + Hanning is available behind a flag for backward comparison; the default is multi-taper.
- Auto-spectra (\\(S_{pp}, S_{uu}, S_{vv}\\)) and cross-spectra (\\(S_{pu}, S_{pv}, S_{uv}\\)) computed with the same set of DPSS tapers, preserving the consistency the directional moments \\(a_n, b_n\\) require.
- Pressure-to-surface transfer through \\(K_p(f) = \cosh(kh)/\cosh(k(h-z_s))\\), with \\(k\\) from a Newton&ndash;Raphson dispersion solve seeded by Wu &amp; Thornton (1986). Bulk parameters \\(H_s, T_p, T_{m02}\\), mean direction, and energy flux \\(F = \rho g \int C_g(f)\, S_{\eta\eta}(f)\, df\\) follow.
- Near-bed velocity by inverse FFT of the depth-attenuated pressure spectrum, retaining phase for downstream skewness and asymmetry calculations.
- Bed stress via Swart (1974): \\(\tau_b = \tfrac{1}{2} \rho_w f_w u_b^2\\), with friction factor \\(f_w = 0.00251\,(A_w/k_s)^{-0.25}\\). Reynolds stresses, TKE, velocity skewness and asymmetry, and mean currents per segment.
- Shore-normal rotation by pulling the local CDIP transect normal from THREDDS at run time, with a fallback to buoy coordinates if the network call fails.

### L3: wave forcing characterisation (in build)

Frequency-band energy flux decomposition (\\(F_{\rm IG}, F_{\rm swell}, F_{\rm sea}\\) over IG = 0.004&ndash;0.04 Hz, swell = 0.04&ndash;0.10 Hz, sea = 0.10&ndash;0.25 Hz), storm-event detection from \\(H_s\\) threshold exceedance and duration, transport proxies (Shields parameter, Rouse number, mobilisation fraction, cumulative bottom flux), and tidal harmonic decomposition with subtidal residual currents. These products are universal across deployments. Paper-specific transport modelling (Bailard 1981, Hoefel &amp; Elgar 2003, undertow correction) lives in the analysis repos that consume the L2 output.

## Validation

The L2 head-to-head against Athina Lange's Ruby2D pipeline:

<figure>
  <img src="{{ '/assets/notes/puv_validation_timeseries.jpg' | relative_url }}" alt="Side-by-side Hs, Tp, mean direction, and directional spread timeseries from this pipeline and Ruby2D for matched segments at MOP582 6 m." />
  <figcaption>\(H_s\), \(T_p\), mean direction, and directional spread timeseries from this pipeline (blue) and Ruby2D (orange), MOP582 6 m, 60-minute segments, October 2021 to February 2022, \(N=2{,}322\) matched segments.</figcaption>
</figure>

<figure>
  <img src="{{ '/assets/notes/puv_validation_spectra.jpg' | relative_url }}" alt="Surface-elevation power spectra from this pipeline (multi-taper) and Ruby2D (Welch + Hanning) for one matched segment at MOP582 6 m." />
  <figcaption>Surface-elevation \(S_{\eta\eta}(f)\) from this pipeline (multi-taper, blue) and Ruby2D (Welch + Hanning, orange), one matched segment at MOP582 6 m, log-log axes.</figcaption>
</figure>

Numerical agreement on the 2,322 matched segments: \\(H_s\\) RMS difference 5 cm (\\(R^2 = 0.98\\)), mean direction RMS \\(1.2^\circ\\) (\\(R^2 = 0.93\\)), directional spread RMS \\(1.7^\circ\\) (\\(R^2 = 0.88\\)). The window-mismatch issue I had expected to drive a larger directional bias is small in practice (about \\(1^\circ\\)).

## Running the pipeline on your own deployment

Required: a Nortek Vector PUV, the burst files (`.dat`, `.sen`, `.hdr`), MATLAB, and field-note records of clock drift, declination, sensor height above bed, and instrument heading.

1. Clone the repo and run `startup_puv.m` (adds subdirectories to the MATLAB path).
2. Add a row to the config registry with the deployment-specific parameters (lat / lon, sensor height \\(z_s\\), heading offset, clock drift, raw-file path). The `TBR23_Notes.xlsx` template in the repo is a usable starting point; the canonical source for older deployments is `/Volumes/group/DeploymentNotes/DeploymentNotes{year}.xls`.
3. `copy_raw_to_local(cfg)` copies raw files from the network mount to a local cache. Reading directly from `/Volumes/group/` is approximately 100&times; slower than reading from local disk; `textscan(fid, ...)` on the cached copy parses a 316 MB raw file in well under a minute, where MATLAB's `load()` would take 30+ minutes on the same file.
4. `PUV_L1_driver` performs QC and rotation. Output: `outputs/L1/{deployment}/{label}_processed.mat`.
5. `PUV_L2_driver` computes spectra and bulk products. Output: `outputs/L2/{deployment}/{label}_L2.mat`.
6. (Optional) Run the validation scripts in `validation/` to compare against the closest CDIP MOP hindcast. Expected \\(H_s\\) agreement at well-behaved sites: \\(R^2 \approx 0.83\text{--}0.86\\).

## What the pipeline does not cover

- L3 sediment-transport modelling (Bailard, Hoefel &amp; Elgar, undertow corrections, Shields-thresholded variants) lives in paper-specific repos because the model choices depend on grain size, beach slope, and the undertow parameterisation in use, none of which generalise cleanly across sites.
- Output format is `.mat` (`-v7.3`, HDF5 underneath) so MATLAB datetimes survive round-trip. NetCDF export is a small wrapper away if archival requires it but is not built in.
- Cross-instrument array processing (bispectra at swell&ndash;IG coupling frequencies, bound-wave separation by phase) sits as L4 work in the docs but is not yet implemented. Single-instrument analysis is the current scope.

## Open issues

- `bed_velocity_ifft.m` has a corner case at \\(k > N/2\\) where the conjugate-symmetric pairing is subtle; logic appears correct but a synthetic-input regression test is still owed.
- 7 of 9 winter 2023&ndash;24 instruments have no clock-drift record (battery depletion or missing field notes). They process, but absolute-time accuracy is reduced by an unknown amount.
- The pressure-to-surface transfer is linear theory. Inside the surf zone, breaking-wave nonlinearity will bias \\(\eta\\) reconstruction; the pipeline does not flag this regime automatically.

## Repository

<a href="https://github.com/holdenlesliebole/Nortek_Vector_PUV_Pipeline">github.com/holdenlesliebole/Nortek_Vector_PUV_Pipeline</a>

If you adopt the pipeline on instruments or sites different from mine, I'm interested to hear how it goes. Pull requests and issue reports both welcome.
