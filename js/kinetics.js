// The chemistry and the particle model of RateClear. No 3D here, so it can be tested on its own.
//
// 1. The Arrhenius equation (Arrhenius 1889): k = A × e^(−Ea ÷ RT), with R = 8.314 J/(mol·K).
// 2. A collision model of a gas reaction A + B → C + D. Hard spheres of equal mass fly about a box with
//    a Maxwell–Boltzmann spread of speeds (each velocity component is a normal distribution with
//    variance kT/m). When an A meets a B, the energy that counts is the kinetic energy of their approach
//    ALONG THE LINE JOINING THEIR CENTRES: E = ½ μ v_n², with μ = m/2 the reduced mass. The pair reacts
//    only if E is more than the activation energy Ea (and, if asked, only if A's reactive side faces B).
//    Nothing else is put in. Simple collision theory (Trautz 1916, Lewis 1918) then predicts, for such a
//    gas, a rate of
//        reactions per second = p × g × (N_A N_B ÷ V) × π d² × √(8kT ÷ πμ) × e^(−Ea ÷ RT)
//    where d is the distance between centres at contact, p the steric factor (the share of collisions
//    that are the right way round) and g a small crowding correction for spheres that take up room
//    (the Carnahan–Starling contact value, g = (1 − η/2) ÷ (1 − η)³ for packing fraction η; 1.06 here).
//    The box COUNTS its reactions, and the chapters set that count beside this formula.
//    The collision-theory rate has a gentle √T in front of the exponential, so its "A" is not quite a
//    constant: a real, known difference between collision theory and the plain Arrhenius equation.
// The thermostat is perfect: reactions here neither give out nor take in heat.
export const R = 8.314462618;          // J/(mol·K), the gas constant (exact since the 2019 SI)
export const K0 = 273.15;              // 0 °C in kelvin
export const TAU = Math.PI * 2;

// e^(−Ea ÷ RT): the share of collisions with enough energy. Ea in kJ/mol, T in kelvin.
export const boltz = (EaKJ, T) => Math.exp((-EaKJ * 1000) / (R * T));
export const arrhenius = (A, EaKJ, T) => A * boltz(EaKJ, T);
// How many times faster a reaction goes when warmed from T to T + dT (Arrhenius, A taken as steady).
export const speedUp = (EaKJ, T, dT = 10) => Math.exp(((EaKJ * 1000) / R) * (1 / T - 1 / (T + dT)));
// The activation energy (kJ/mol) for which the rate exactly doubles between T and T + dT.
export const eaToDouble = (T, dT = 10) => (R * Math.LN2 * T * (T + dT)) / dT / 1000;

// Deterministic random numbers, so every run (and every video frame) is the same.
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export function gauss(r) { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

// Maxwell–Boltzmann speed distribution for per-component spread sg: f(v) = √(2/π) v² e^(−v²/2sg²) ÷ sg³.
export const maxwell = (v, sg) => (Math.sqrt(2 / Math.PI) * v * v * Math.exp((-v * v) / (2 * sg * sg))) / (sg * sg * sg);

export const A = 0, B = 1, C = 2, D = 3;   // kinds of molecule

export class Gas {
  // n: most molecules ever shown; box: [width, height, depth] of the space the centres can reach;
  // r: molecule radius; s300: per-component speed spread at 300 K (scene units a second).
  constructor({ n = 400, box = [5, 3, 2.4], r = 0.08, s300 = 1.6, seed = 5, T = 300, fine = 0.3 } = {}) {
    this.fine = fine; this.n = n; this.box = box; this.r = r; this.d = 2 * r; this.s300 = s300; this.T = T;
    this.rnd = rng(seed);
    this.x = new Float64Array(n * 3); this.v = new Float64Array(n * 3); this.o = new Float64Array(n * 3);
    this.kind = new Int8Array(n); this.on = new Uint8Array(n); this.flash = new Float32Array(n);
    this.held = new Int16Array(n).fill(-1);          // index of the catalyst site holding this molecule
    this.sites = [];                                 // catalyst: { x, y, z, r, mol: -1, t }
    const cell = Math.max(this.d * 1.05, 0.34);
    this.cell = cell; this.gn = box.map((L) => Math.max(1, Math.floor(L / cell)));
    this.head = new Int32Array(this.gn[0] * this.gn[1] * this.gn[2]); this.next = new Int32Array(n);
    this.energies = new Float32Array(512); this.eN = 0;   // recent A–B collision energies, kJ/mol
    this.events = [];                                     // this step's reactions: { x, y, z, E, path }
    this.resetCounts();
    for (let i = 0; i < n; i++) this.spawn(i, i % 2 ? B : A);
    this.settle();
  }
  // The thermostat: scale every speed a touch so the gas sits at exactly T (mean v² = 3 kT/m).
  settle() {
    let s2 = 0, c = 0;
    for (let i = 0; i < this.n; i++) if (this.on[i] && this.held[i] < 0) { const j = i * 3; s2 += this.v[j] ** 2 + this.v[j + 1] ** 2 + this.v[j + 2] ** 2; c++; }
    if (!c || !s2) return;
    const k = Math.sqrt((3 * this.sg * this.sg * c) / s2);
    for (let i = 0; i < this.n * 3; i++) this.v[i] *= k;
  }
  get sg() { return this.s300 * Math.sqrt(this.T / 300); }
  // Volume open to the centres, and the packing fraction of the spheres in it.
  get vol() { return this.box[0] * this.box[1] * this.box[2]; }
  count(kind) { let c = 0; for (let i = 0; i < this.n; i++) if (this.on[i] && this.kind[i] === kind) c++; return c; }
  resetCounts() { this.t = 0; this.coll = 0; this.hard = 0; this.react = 0; this.reactCat = 0; this.back = 0; this.all = 0; this.turn = 0; this.collCat = 0; }

  spawn(i, kind) {
    const { rnd, box, sg } = this, j = i * 3;
    for (let k = 0; k < 3; k++) { this.x[j + k] = (rnd() - 0.5) * box[k]; this.v[j + k] = gauss(rnd) * sg; }
    this.aim(i);
    this.kind[i] = kind; this.on[i] = 1; this.flash[i] = 0; this.held[i] = -1;
    for (const s of this.sites) this.pushOut(i, s);
  }
  aim(i) {   // a random direction for the molecule's reactive side
    const { rnd } = this, j = i * 3, z = rnd() * 2 - 1, a = rnd() * TAU, q = Math.sqrt(1 - z * z);
    this.o[j] = q * Math.cos(a); this.o[j + 1] = z; this.o[j + 2] = q * Math.sin(a);
  }
  pushOut(i, s) {
    const j = i * 3, dx = this.x[j] - s.x, dy = this.x[j + 1] - s.y, dz = this.x[j + 2] - s.z, q = Math.hypot(dx, dy, dz) || 1e-6, m = s.r + this.r;
    if (q < m) { this.x[j] = s.x + (dx / q) * m; this.x[j + 1] = s.y + (dy / q) * m; this.x[j + 2] = s.z + (dz / q) * m; }
  }
  // Show nA molecules of A and nB of B (products are turned back into reactants).
  fill(nA, nB) {
    let a = 0, b = 0;
    this.sites.forEach((s) => { s.mol = -1; });
    for (let i = 0; i < this.n; i++) {
      const want = i % 2 ? B : A;
      const keep = want === A ? a < nA : b < nB;
      if (keep) { if (!this.on[i] || this.held[i] >= 0) this.spawn(i, want); this.kind[i] = want; this.flash[i] = 0; if (want === A) a++; else b++; } else { this.on[i] = 0; this.held[i] = -1; }
    }
    this.settle();
  }
  setT(T) {
    if (T === this.T) return;
    const k = Math.sqrt(T / this.T); this.T = T;
    for (let i = 0; i < this.n * 3; i++) this.v[i] *= k;
  }
  addSites(list) { this.sites = list.map(([x, y, z, r]) => ({ x, y, z, r, mol: -1, t: 0 })); for (let i = 0; i < this.n; i++) if (this.on[i]) for (const s of this.sites) this.pushOut(i, s); }

  // What simple collision theory expects for this box right now (reactions a second, uncatalysed path).
  theory(EaKJ, p = 1, nA = this.count(A), nB = this.count(B)) {
    const eta = ((nA + nB + this.count(C) + this.count(D)) * (4 / 3) * Math.PI * this.r ** 3) / this.vol;
    const [w, h, dp] = this.box;
    // near a wall part of a molecule's surface cannot be reached by another centre: on average a
    // quarter of it, for centres within d of the wall. That trims the count by S d ÷ 4V.
    const edge = 1 - (2 * (w * h + w * dp + h * dp) * this.d) / (4 * this.vol);
    const g = ((1 - eta / 2) / (1 - eta) ** 3) * edge;
    const z = g * ((nA * nB) / this.vol) * Math.PI * this.d * this.d * ((4 * this.sg) / Math.sqrt(Math.PI));
    return { z, share: p * boltz(EaKJ, this.T), rate: z * p * boltz(EaKJ, this.T), g };
  }

  // Advance by dt seconds. o: { Ea, EaBack (null: one-way), steric (share of A's surface that reacts,
  // 1 = any way round), mode: 'steady' (products are swapped for fresh reactants, so the count is
  // steady) or 'batch' (reactants are used up), cat: null or { on, mode: 'pair'|'solo', Ea, stay, kcat } }.
  step(dt, o) {
    this.events.length = 0;
    if (dt <= 0) return;
    const vmax = 5 * this.sg, ns = Math.min(12, Math.max(1, Math.ceil((vmax * dt) / (this.fine * this.d))));
    const h = dt / ns;
    for (let k = 0; k < ns; k++) this.sub(h, o);
    this.t += dt;
    for (let i = 0; i < this.n; i++) if (this.flash[i] > 0) this.flash[i] = Math.max(0, this.flash[i] - dt);
  }

  sub(h, o) {
    const { n, x, v, on, kind, box, r, d, held, gn, cell, head, next, rnd } = this;
    const hx = box[0] / 2, hy = box[1] / 2, hz = box[2] / 2;
    const cat = o.cat && o.cat.on ? o.cat : null, sites = this.sites;
    const sg = this.sg, RT = (R * this.T) / 1000;          // kJ/mol
    // move, bounce off the walls
    for (let i = 0; i < n; i++) {
      if (!on[i] || held[i] >= 0) continue;
      const j = i * 3;
      x[j] += v[j] * h; x[j + 1] += v[j + 1] * h; x[j + 2] += v[j + 2] * h;
      if (x[j] < -hx) { x[j] = -2 * hx - x[j]; v[j] = Math.abs(v[j]); } else if (x[j] > hx) { x[j] = 2 * hx - x[j]; v[j] = -Math.abs(v[j]); }
      if (x[j + 1] < -hy) { x[j + 1] = -2 * hy - x[j + 1]; v[j + 1] = Math.abs(v[j + 1]); } else if (x[j + 1] > hy) { x[j + 1] = 2 * hy - x[j + 1]; v[j + 1] = -Math.abs(v[j + 1]); }
      if (x[j + 2] < -hz) { x[j + 2] = -2 * hz - x[j + 2]; v[j + 2] = Math.abs(v[j + 2]); } else if (x[j + 2] > hz) { x[j + 2] = 2 * hz - x[j + 2]; v[j + 2] = -Math.abs(v[j + 2]); }
    }
    // catalyst sites: fixed spheres. A free molecule bounces off; with the catalyst switched on an A
    // (or, in 'solo' mode, the one reactant) that lands on an empty site sticks to it for a while.
    for (let si = 0; si < sites.length; si++) {
      const s = sites[si], m = s.r + r;
      if (s.mol >= 0) {
        const i = s.mol;
        s.t -= h;
        if (cat && cat.mode === 'solo') {
          // the enzyme works on its one molecule: it turns into product after a wait set by kcat
          if (rnd() < 1 - Math.exp(-cat.kcat * h)) { this.release(si, true); this.turn++; this.reactCat++; this.done(i, -1, 0, 'cat', o); }
        } else if (s.t <= 0 || !cat) this.release(si, false);
        continue;
      }
      for (let i = 0; i < n; i++) {
        if (!on[i] || held[i] >= 0) continue;
        const j = i * 3, dx = x[j] - s.x, dy = x[j + 1] - s.y, dz = x[j + 2] - s.z, q2 = dx * dx + dy * dy + dz * dz;
        if (q2 >= m * m) continue;
        const q = Math.sqrt(q2) || 1e-6, nx = dx / q, ny = dy / q, nz = dz / q, vn = v[j] * nx + v[j + 1] * ny + v[j + 2] * nz;
        if (cat && s.mol < 0 && kind[i] === A && vn < 0) {
          s.mol = i; held[i] = si; s.t = -Math.log(Math.max(1e-9, rnd())) * (cat.stay || 1.5);
          x[j] = s.x + nx * m; x[j + 1] = s.y + ny * m; x[j + 2] = s.z + nz * m; v[j] = v[j + 1] = v[j + 2] = 0;
          this.o[j] = nx; this.o[j + 1] = ny; this.o[j + 2] = nz;
          continue;
        }
        if (vn < 0) { v[j] -= 2 * vn * nx; v[j + 1] -= 2 * vn * ny; v[j + 2] -= 2 * vn * nz; }
        x[j] = s.x + nx * m; x[j + 1] = s.y + ny * m; x[j + 2] = s.z + nz * m;
      }
    }
    // also keep free molecules off occupied sites
    for (let si = 0; si < sites.length; si++) {
      const s = sites[si]; if (s.mol < 0) continue;
      const m = s.r + r;
      for (let i = 0; i < n; i++) {
        if (!on[i] || held[i] >= 0) continue;
        const j = i * 3, dx = x[j] - s.x, dy = x[j + 1] - s.y, dz = x[j + 2] - s.z, q2 = dx * dx + dy * dy + dz * dz;
        if (q2 >= m * m) continue;
        const q = Math.sqrt(q2) || 1e-6, nx = dx / q, ny = dy / q, nz = dz / q, vn = v[j] * nx + v[j + 1] * ny + v[j + 2] * nz;
        if (vn < 0) { v[j] -= 2 * vn * nx; v[j + 1] -= 2 * vn * ny; v[j + 2] -= 2 * vn * nz; }
        x[j] = s.x + nx * m; x[j + 1] = s.y + ny * m; x[j + 2] = s.z + nz * m;
      }
    }
    // grid of cells, so only neighbours are tested against each other
    head.fill(-1);
    const [gx, gy, gz] = gn;
    const ci = (p, half, g) => { const c = Math.floor(((p + half) / (2 * half)) * g); return c < 0 ? 0 : c >= g ? g - 1 : c; };
    for (let i = 0; i < n; i++) {
      if (!on[i]) continue;
      const j = i * 3, c = ci(x[j], hx, gx) + gx * (ci(x[j + 1], hy, gy) + gy * ci(x[j + 2], hz, gz));
      next[i] = head[c]; head[c] = i;
    }
    const d2 = d * d;
    for (let i = 0; i < n; i++) {
      if (!on[i]) continue;
      const j = i * 3, cx = ci(x[j], hx, gx), cy = ci(x[j + 1], hy, gy), cz = ci(x[j + 2], hz, gz);
      for (let az = Math.max(0, cz - 1); az <= Math.min(gz - 1, cz + 1); az++) for (let ay = Math.max(0, cy - 1); ay <= Math.min(gy - 1, cy + 1); ay++) for (let ax = Math.max(0, cx - 1); ax <= Math.min(gx - 1, cx + 1); ax++) {
        for (let b = head[ax + gx * (ay + gy * az)]; b >= 0; b = next[b]) {
          if (b <= i) continue;
          const l = b * 3;
          let rx = x[j] - x[l], ry = x[j + 1] - x[l + 1], rz = x[j + 2] - x[l + 2];
          const q2 = rx * rx + ry * ry + rz * rz;
          if (q2 >= d2) continue;
          const wx = v[j] - v[l], wy = v[j + 1] - v[l + 1], wz = v[j + 2] - v[l + 2];
          const rw = rx * wx + ry * wy + rz * wz;
          if (rw >= 0) continue;                               // already moving apart
          // wind back to the moment of contact, so the line of centres is the true one
          const w2 = wx * wx + wy * wy + wz * wz;
          const tb = Math.min(h, (rw + Math.sqrt(rw * rw + w2 * (d2 - q2))) / w2);
          rx -= wx * tb; ry -= wy * tb; rz -= wz * tb;
          const q = Math.hypot(rx, ry, rz) || 1e-9, nx = rx / q, ny = ry / q, nz = rz / q;
          const vn = wx * nx + wy * ny + wz * nz;              // closing speed along the line of centres (negative)
          const hi = held[i] >= 0, hb = held[b] >= 0;
          if (hi && hb) continue;
          this.all++;
          // energy of the approach along the line of centres, in kJ/mol
          const E = (hi || hb ? (vn * vn) / (2 * sg * sg) : (vn * vn) / (4 * sg * sg)) * RT;
          // bounce (equal masses swap their normal speeds; a held molecule is a wall)
          if (hi) { v[l] += 2 * vn * nx; v[l + 1] += 2 * vn * ny; v[l + 2] += 2 * vn * nz; x[l] += 2 * vn * nx * tb; x[l + 1] += 2 * vn * ny * tb; x[l + 2] += 2 * vn * nz * tb; }
          else if (hb) { v[j] -= 2 * vn * nx; v[j + 1] -= 2 * vn * ny; v[j + 2] -= 2 * vn * nz; x[j] -= 2 * vn * nx * tb; x[j + 1] -= 2 * vn * ny * tb; x[j + 2] -= 2 * vn * nz * tb; }
          else {
            v[j] -= vn * nx; v[j + 1] -= vn * ny; v[j + 2] -= vn * nz; v[l] += vn * nx; v[l + 1] += vn * ny; v[l + 2] += vn * nz;
            x[j] -= vn * nx * tb; x[j + 1] -= vn * ny * tb; x[j + 2] -= vn * nz * tb; x[l] += vn * nx * tb; x[l + 1] += vn * ny * tb; x[l + 2] += vn * nz * tb;
          }
          const ki = kind[i], kb = kind[b];
          if ((ki === A && kb === B) || (ki === B && kb === A)) {
            const a = ki === A ? i : b, bb = ki === A ? b : i;
            if (held[bb] >= 0) continue;
            if (held[a] >= 0) {
              // B strikes an A sitting on the catalyst: the other path, with its own lower hill
              if (cat && cat.mode !== 'solo') this.collCat++;
              if (cat && cat.mode !== 'solo' && E > cat.Ea) { const si = held[a]; this.release(si, true); this.reactCat++; this.done(a, bb, E, 'cat', o); }
              continue;
            }
            this.coll++;
            this.energies[this.eN++ & 511] = E;
            if (E <= o.Ea) continue;
            this.hard++;
            if (o.steric < 1) {
              // A's reactive side must face B: the contact point must lie inside A's reactive cap
              const s = a === i ? -1 : 1, a3 = a * 3;
              const cs = s * (this.o[a3] * nx + this.o[a3 + 1] * ny + this.o[a3 + 2] * nz);
              if (cs < 1 - 2 * o.steric) continue;
            }
            this.react++; this.done(a, bb, E, 'gas', o);
          } else if (o.EaBack != null && ((ki === C && kb === D) || (ki === D && kb === C))) {
            if (E > o.EaBack) { this.back++; kind[ki === C ? i : b] = A; kind[ki === C ? b : i] = B; this.flash[i] = this.flash[b] = 0.25; }
          }
        }
      }
    }
    // reactive sides tumble
    if (o.steric < 1 && rnd() < 0.2) { const i = Math.floor(rnd() * n); if (held[i] < 0) this.aim(i); }
  }

  // Let go of the molecule on a site. It leaves as a molecule leaves a warm wall: its speed along the
  // outward normal follows the flux (Rayleigh) distribution, v = sg × √(−2 ln u), and its sideways
  // speeds are thermal. On average that carries off 2kT, exactly what molecules bring to the site, so
  // sticking and letting go neither warms nor cools the gas.
  release(si, reacted) {
    const s = this.sites[si], i = s.mol; if (i < 0) return;
    const j = i * 3, sg = this.sg, o = this.o, rnd = this.rnd;
    const gx = gauss(rnd) * sg, gy = gauss(rnd) * sg, gz = gauss(rnd) * sg, gn = gx * o[j] + gy * o[j + 1] + gz * o[j + 2];
    const vn = sg * Math.sqrt(-2 * Math.log(Math.max(1e-9, rnd())));
    this.v[j] = gx + (vn - gn) * o[j]; this.v[j + 1] = gy + (vn - gn) * o[j + 1]; this.v[j + 2] = gz + (vn - gn) * o[j + 2];
    this.x[j] += o[j] * 0.02; this.x[j + 1] += o[j + 1] * 0.02; this.x[j + 2] += o[j + 2] * 0.02;
    this.held[i] = -1; s.mol = -1; s.cool = reacted ? 0.1 : 0; s.uses = (s.uses || 0) + (reacted ? 1 : 0);
  }
  // A reaction has happened between molecules a and b (b = −1 for a one-molecule reaction).
  done(a, b, E, path, o) {
    const j = a * 3;
    this.events.push({ x: this.x[j], y: this.x[j + 1], z: this.x[j + 2], E, path });
    this.flash[a] = 0.7; if (b >= 0) this.flash[b] = 0.7;
    if (o.mode === 'batch') { this.kind[a] = C; if (b >= 0) this.kind[b] = D; }
  }
}
