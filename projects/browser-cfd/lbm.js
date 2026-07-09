/* lbm.js — lean D2Q9 BGK lattice-Boltzmann core.
 *
 * Geometry-agnostic engine: physics lives here, geometry is per-node flags.
 * Loaded as a *classic* script (so couette.html opens straight from file://;
 * ES modules would trip CORS there) and also require()-able in Node for the
 * validation harness — same code drives the browser and the test.
 *
 * Method notes (see ~/Documents/Job_Search/portfolio/browser_cfd_artifact.md):
 *   - D2Q9 BGK, weakly-compressible. c_s^2 = 1/3, nu = c_s^2 (tau - 1/2).
 *   - Time-stepping IS the streaming step: explicit, single-stage, dt = 1
 *     lattice unit, 2nd-order accurate. No global solve.
 *   - Walls / obstacles: halfway bounce-back via node flags. Moving walls add
 *     the Ladd momentum correction. Flat walls sit mid-link -> 2nd order.
 */
(function (global) {
  'use strict';

  // D2Q9 velocity set, weights, and opposite-direction map.
  //   0:rest 1:+x 2:+y 3:-x 4:-y 5:+x+y 6:-x+y 7:-x-y 8:+x-y
  const CX = [0, 1, 0, -1, 0, 1, -1, -1, 1];
  const CY = [0, 0, 1, 0, -1, 1, 1, -1, -1];
  const W = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36];
  const OPP = [0, 3, 4, 1, 2, 7, 8, 5, 6];
  const CS2 = 1 / 3; // lattice speed of sound squared

  // Node flags
  const FLUID = 0;
  const SOLID = 1; // stationary no-slip (plain bounce-back)
  const MOVING = 2; // prescribed-velocity wall (bounce-back + momentum injection)

  class LBM {
    constructor(Nx, Ny) {
      this.Nx = Nx;
      this.Ny = Ny;
      const N = Nx * Ny;
      this.N = N;
      this.f = new Float64Array(N * 9);
      this.fnew = new Float64Array(N * 9);
      this.flag = new Uint8Array(N); // FLUID / SOLID / MOVING
      this.uwx = new Float64Array(N); // wall velocity (only read on solid nodes)
      this.uwy = new Float64Array(N);
      this.rho = new Float64Array(N); // macroscopic, refreshed each collide()
      this.ux = new Float64Array(N);
      this.uy = new Float64Array(N);
      this.omega = 1.0; // = 1/tau
      this.Fx = 0; this.Fy = 0; // uniform body force (Guo scheme); 0 => exactly plain BGK
      this.periodicX = true;    // channels wrap x; cylinder turns this off (inlet/outlet)
      this.periodicY = false;   // channels use solid wall rows; cylinder uses far-field BCs
      this.boundary = null;     // optional fn(sim) applied to f after each stream (inlet/outlet/far-field)
      this.step = 0;
    }

    idx(i, j) { return j * this.Nx + i; }

    // Reset all fluid nodes to equilibrium at (rho0, u from uFn(i,j)->[ux,uy]).
    setEquilibrium(rho0, uFn) {
      const { Nx, Ny, f, flag } = this;
      for (let j = 0; j < Ny; j++) {
        for (let i = 0; i < Nx; i++) {
          const n = j * Nx + i;
          if (flag[n] !== FLUID) continue;
          let vx = 0, vy = 0;
          if (uFn) { const u = uFn(i, j); vx = u[0]; vy = u[1]; }
          const b = n * 9;
          const usq = vx * vx + vy * vy;
          for (let k = 0; k < 9; k++) {
            const cu = CX[k] * vx + CY[k] * vy;
            f[b + k] = W[k] * rho0 * (1 + 3 * cu + 4.5 * cu * cu - 1.5 * usq);
          }
          this.rho[n] = rho0; this.ux[n] = vx; this.uy[n] = vy;
        }
      }
      this.step = 0;
    }

    // BGK collision (in place) with optional Guo body force. Refreshes rho, ux, uy.
    // Guo (2002): velocity carries a half-force correction, and a source term S_i is
    // added to the collision. With Fx=Fy=0 every correction is zero -> plain BGK.
    collide() {
      const { Nx, Ny, f, flag, rho, ux, uy, omega, Fx, Fy } = this;
      const halfF = 1 - 0.5 * omega; // (1 - 1/(2 tau))
      for (let j = 0; j < Ny; j++) {
        for (let i = 0; i < Nx; i++) {
          const n = j * Nx + i;
          if (flag[n] !== FLUID) continue;
          const b = n * 9;
          let r = 0, mx = 0, my = 0;
          for (let k = 0; k < 9; k++) {
            const fk = f[b + k]; r += fk; mx += fk * CX[k]; my += fk * CY[k];
          }
          const vx = (mx + 0.5 * Fx) / r, vy = (my + 0.5 * Fy) / r; // force-corrected u
          rho[n] = r; ux[n] = vx; uy[n] = vy;
          const usq = vx * vx + vy * vy;
          for (let k = 0; k < 9; k++) {
            const cu = CX[k] * vx + CY[k] * vy;
            const feq = W[k] * r * (1 + 3 * cu + 4.5 * cu * cu - 1.5 * usq);
            const cF = CX[k] * Fx + CY[k] * Fy;
            const Si = halfF * W[k] * (3 * ((CX[k] - vx) * Fx + (CY[k] - vy) * Fy) + 9 * cu * cF);
            f[b + k] += omega * (feq - f[b + k]) + Si;
          }
        }
      }
    }

    // Streaming with halfway bounce-back. Reads post-collision f, writes fnew.
    // Populations that leave the domain on a non-periodic axis are dropped; those
    // edge nodes are reset each step by the boundary() callback (inlet/outlet/far-field).
    stream() {
      const { Nx, Ny, f, fnew, flag, rho, uwx, uwy, periodicX, periodicY } = this;
      for (let j = 0; j < Ny; j++) {
        for (let i = 0; i < Nx; i++) {
          const n = j * Nx + i;
          if (flag[n] !== FLUID) continue;
          const b = n * 9;
          for (let k = 0; k < 9; k++) {
            let it = i + CX[k], jt = j + CY[k];
            if (periodicX) { if (it < 0) it += Nx; else if (it >= Nx) it -= Nx; }
            if (periodicY) { if (jt < 0) jt += Ny; else if (jt >= Ny) jt -= Ny; }
            if (it < 0 || it >= Nx || jt < 0 || jt >= Ny) continue; // left domain; boundary() owns the edge
            const nt = jt * Nx + it;
            if (flag[nt] !== FLUID) {
              // Bounce-back off solid nt; momentum injection if nt is a moving wall.
              const corr = 6 * W[k] * rho[n] * (CX[k] * uwx[nt] + CY[k] * uwy[nt]);
              fnew[b + OPP[k]] = f[b + k] - corr;
            } else {
              fnew[nt * 9 + k] = f[b + k];
            }
          }
        }
      }
    }

    doStep() {
      this.collide();
      this.stream();
      const t = this.f; this.f = this.fnew; this.fnew = t;
      if (this.boundary) this.boundary(this); // inlet/outlet/far-field, applied to the new f
      this.step++;
    }

    // Equilibrium populations for (rho, ux, uy) -> fills the 9-slot block at base b of arr.
    setNodeEquilibrium(arr, b, rho, ux, uy) {
      const usq = ux * ux + uy * uy;
      for (let k = 0; k < 9; k++) {
        const cu = CX[k] * ux + CY[k] * uy;
        arr[b + k] = W[k] * rho * (1 + 3 * cu + 4.5 * cu * cu - 1.5 * usq);
      }
    }

    // --- transient-growth hooks (wired in from day one; used by the #20 case) ---

    // Perturbation kinetic energy relative to a base flow uBaseFn(i,j)->[ux,uy].
    perturbationEnergy(uBaseFn) {
      const { Nx, Ny, flag, ux, uy } = this;
      let E = 0;
      for (let j = 0; j < Ny; j++) {
        for (let i = 0; i < Nx; i++) {
          const n = j * Nx + i;
          if (flag[n] !== FLUID) continue;
          const ub = uBaseFn(i, j);
          const du = ux[n] - ub[0], dv = uy[n] - ub[1];
          E += 0.5 * (du * du + dv * dv);
        }
      }
      return E;
    }

    // Inject an initial state = base + perturbation, both as velocity fields.
    // (The transient-growth case will pass the optimal IC here.)
    injectVelocity(rho0, uFn) { this.setEquilibrium(rho0, uFn); }
  }

  // ---- analytic references (plane Couette) ----

  // Steady laminar Couette: linear profile. eta = distance above bottom wall.
  function couetteSteady(eta, U, H) { return U * eta / H; }

  // Suddenly-started-plate startup transient (top plate -> U at t=0, from rest).
  // u(eta,t)/U = eta/H + (2/pi) sum_{n>=1} ((-1)^n / n) sin(n pi eta/H) e^{-n^2 pi^2 nu t / H^2}
  function couetteTransient(eta, t, U, H, nu) {
    let s = U * eta / H;
    const a = Math.PI * Math.PI * nu * t / (H * H);
    for (let n = 1; n <= 800; n++) {
      const decay = Math.exp(-n * n * a);
      const env = (2 * U / Math.PI) / n * decay; // positive magnitude envelope
      if (env < 1e-13 && n > 1) break;
      const sign = (n % 2 === 0) ? 1 : -1; // (-1)^n
      s += env * sign * Math.sin(n * Math.PI * eta / H);
    }
    return s;
  }

  // ---- analytic references (plane Poiseuille, body-force driven) ----
  // U denotes the centerline (max) velocity. Steady momentum balance nu u'' = -g with
  // u(0)=u(H)=0 gives a parabola; u_max = g H^2/(8 nu), so g/(2 nu) = 4U/H^2.

  function poiseuilleSteady(eta, U, H) { return (4 * U / (H * H)) * eta * (H - eta); }

  // Startup from rest under constant body force (both walls fixed):
  // u(eta,t) = (4U/H^2) eta(H-eta) - (32U/pi^3) sum_{n odd} (1/n^3) sin(n pi eta/H) e^{-n^2 pi^2 nu t/H^2}
  // (only odd modes; checked: series at center sums to pi^3/32 -> recovers u_max=U at t->inf.)
  function poiseuilleTransient(eta, t, U, H, nu) {
    let s = (4 * U / (H * H)) * eta * (H - eta);
    const a = Math.PI * Math.PI * nu * t / (H * H);
    const pre = 32 * U / (Math.PI * Math.PI * Math.PI);
    for (let n = 1; n <= 999; n += 2) { // odd n only
      const decay = Math.exp(-n * n * a);
      const env = pre / (n * n * n) * decay;
      if (env < 1e-13 && n > 1) break;
      s -= env * Math.sin(n * Math.PI * eta / H);
    }
    return s;
  }

  // Body force (per unit volume, rho≈1) that yields centerline velocity U at viscosity nu.
  function poiseuilleForce(nu, U, H) { return 8 * nu * U / (H * H); }

  // ---- cylinder references ----
  // Williamson (1988) laminar-shedding St–Re correlation (valid ~Re 49–180).
  function williamsonSt(Re) { return -3.3265 / Re + 0.1816 + 1.6e-4 * Re; }

  // Stamp a staircased solid disk of radius r at center (cx, cy) into sim.flag.
  function stampCircle(sim, cx, cy, r) {
    const r2 = r * r;
    for (let j = 0; j < sim.Ny; j++) {
      for (let i = 0; i < sim.Nx; i++) {
        const dx = i - cx, dy = j - cy;
        if (dx * dx + dy * dy <= r2) sim.flag[j * sim.Nx + i] = SOLID;
      }
    }
  }

  // ---- transient-growth reference (Orr / Kelvin shearing wave) ----
  // A single 2D Fourier perturbation in unbounded constant shear S has a constant
  // streamwise wavenumber kx and a tilting cross-stream wavenumber ky(t)=ky0 - S kx t.
  // Inviscid: vorticity amplitude is conserved, velocity ~ omega/|k|, so
  //   E(t)/E0 = |k0|^2/|k(t)|^2,  peaking when ky(t)=0 (phase lines vertical):
  //   t* = ky0/(S kx),  G_inviscid = 1 + (ky0/kx)^2  (the Orr mechanism).
  // Viscous: vorticity decays by exp(-2 nu ∫|k|^2 dt'), giving the full energy gain.
  function kelvinShearGain(t, kx, ky0, S, nu) {
    const kyt = ky0 - S * kx * t;
    const k0sq = kx * kx + ky0 * ky0;
    const ktsq = kx * kx + kyt * kyt;
    // I(t) = ∫_0^t (kx^2 + (ky0 - S kx t')^2) dt' = kx^2 t + (ky0^3 - kyt^3)/(3 S kx)
    const I = kx * kx * t + (ky0 * ky0 * ky0 - kyt * kyt * kyt) / (3 * S * kx);
    return (k0sq / ktsq) * Math.exp(-2 * nu * I);
  }

  // Map (Re, U, H) -> relaxation params. Re based on the characteristic velocity U
  // (Couette: wall speed; Poiseuille: centerline u_max). Steady Couette profile is
  // Re-independent; Re only sets the transient timescale H^2/nu.
  function relaxFromRe(Re, U, H) {
    const nu = U * H / Re;
    const tau = 3 * nu + 0.5; // nu = (tau - 1/2)/3
    return { nu, tau, omega: 1 / tau };
  }

  const api = {
    LBM, CX, CY, W, OPP, CS2, FLUID, SOLID, MOVING,
    couetteSteady, couetteTransient, relaxFromRe,
    poiseuilleSteady, poiseuilleTransient, poiseuilleForce,
    williamsonSt, stampCircle, kelvinShearGain,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.LBM_CORE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
