// Chapter 1: what sets the rate of a reaction, as a live experiment in a glass tank.
// The tank holds a gas of blue molecules A and orange molecules B that react when an A meets a B:
//   A + B → products.
// It is a real collision model (kinetics.js): every molecule flies in a straight line and bounces
// off the walls and off the other molecules, with a Maxwell–Boltzmann spread of speeds for the
// thermostat's temperature. A collision reacts only if its energy along the line of centres is more
// than the activation energy Ea (and, if you ask, only if A's reactive side faces B). Nothing tells
// the tank how fast to react: the readout COUNTS reactions and sets the count beside what collision
// theory and the Arrhenius factor predict,
//   reactions a second = (A–B collisions a second) × p × e^(−Ea ÷ RT),  R = 8.314 J/(mol·K).
// The default hill, 12.5 kJ/mol, is that of a real gas reaction with an unusually low hill:
//   NO + O₃ → NO₂ + O₂, k = 3.0 × 10⁻¹² e^(−1500/T) cm³ per molecule per second, so Ea = 1500 K × R =
//   12.5 kJ/mol (NASA/JPL, Chemical Kinetics and Photochemical Data for Use in Atmospheric Studies,
//   Evaluation No. 19, 2019). Most reactions have hills of 50 to 250 kJ/mol; then far too few
//   collisions succeed to watch in a tank of 400 molecules, and chapter 2 says how few.
// Speeds on the chart are for molecules of molar mass 30 g/mol (NO): mean speed √(8RT ÷ πM), 460 m/s at
// 27 °C. The dots are drawn far slower. In real air at 1 atm a molecule has about 7 × 10⁹ collisions
// a second (mean free path about 68 nm), against one or two a second for a dot in this tank.
import { M, box, clamp } from '../kit.js';
import {
  THREE, Gas, R, K0, boltz, maxwell, COL, hex, share, num, board, panelBg, title, axes, line, curve, dot, ring, text, clip, hill, hillE,
  tank, gasView, fitNarrow, placeBoard, fit, inReel, cssTemp,
} from '../rate.js';

const M_MOL = 0.030;                                  // kg/mol, for the speed chart
const AT = [0, 2.35, 0];
const RTk = (T) => (R * T) / 1000;                    // kJ/mol
const TK = (s) => s.T + K0;
const REEL = [[0, 7.5, 0], 0, 2], PHONE = [[0, -1.6, 1.2], 0, 1.35];

export default {
  id: 'idea',
  short: 'Collide hard enough',
  title: 'A reaction is a collision that is hard enough',
  subtitle: 'Count the collisions in a tank of gas and find the rule: rate = collisions × e^(−Ea ÷ RT).',
  view: { pos: [0.2, 3.5, 10.6], target: [0.2, 3.25, 0] },
  learn: `<p>Before two molecules can react, they have to <b>meet</b>. In a gas they fly about at hundreds of metres a second and bump into each other all the time. But most bumps do nothing: the molecules just bounce apart.</p>
    <p>To react, old bonds have to stretch and start to break, and that takes energy. So a collision must be <b>hard enough</b>. The least energy that works is the <b>activation energy</b>, <b>Ea</b>. Picture it as a <b>hill</b> between the starting chemicals and the products: only collisions with enough energy get over the top. Many molecules must also meet <b>the right way round</b>. This picture is called <b>collision theory</b>.</p>
    <p>Molecules in a gas do not all move at one speed. A few are slow, most are middling, a few are very fast: the <b>Maxwell–Boltzmann spread</b>. Only the hardest collisions clear the hill, and the share that do is <b>e<sup>−Ea ÷ RT</sup></b>. R is the gas constant, 8.314, and T is the temperature in <b>kelvin</b>. Put together, that is the <b>Arrhenius equation</b>: <b>k = A × e<sup>−Ea ÷ RT</sup></b>, where A counts how often molecules collide the right way round.</p>
    <p>The tank shows all of this happening. It does not use the equation: it just lets the dots collide and <b>counts</b> the flashes. Then the readout puts the count beside what the equation says. They agree. So the rate has three dials here. More molecules means <b>more collisions</b>. A higher temperature means slightly more collisions and <b>far more hard ones</b>. A lower hill lets <b>more of them over</b>. Chapters 3 and 4 add two more dials: surface and catalysts.</p>
    <p class="tip"><b>Try it:</b> watch the flashes at 27 °C, then heat the tank to 200 °C. Halve the orange molecules and see the rate halve. Raise the hill to 25 kJ/mol and the tank goes quiet. Open the <b>Rate vs temperature</b> chart and move the temperature in steps: each counted dot lands on the curve.</p>`,
  terms: [
    { t: 'Rate of reaction', d: 'How much reactant is used up, or product made, each second.' },
    { t: 'Collision theory', d: 'Molecules react only when they collide with enough energy and the right way round.' },
    { t: 'Activation energy (Ea)', d: 'The least energy a collision needs to react: the height of the hill. Measured in kJ per mole.' },
    { t: 'Maxwell–Boltzmann spread', d: 'The range of speeds in a gas: a few slow molecules, many middling, a few very fast. Heating stretches it towards high speeds.' },
    { t: 'Arrhenius equation', d: 'k = A × e^(−Ea ÷ RT): how the rate constant k depends on the hill Ea and the temperature T in kelvin.' },
    { t: 'Steric factor (p)', d: 'The share of hard-enough collisions that are also the right way round.' },
  ],
  defaults: { T: 27, Ea: 12.5, nA: 200, nB: 200, steric: 1, chart: 'hill', run: 0 },
  controls: [
    { key: 'T', type: 'range', label: 'Temperature (the thermostat)', min: -50, max: 500, step: 5, ends: ['−50 °C', '500 °C'], fmt: (v) => `${Math.round(v)} °C = ${Math.round(v + K0)} K` },
    { key: 'Ea', type: 'range', label: 'Height of the hill, Ea', min: 5, max: 30, step: 0.5, ends: ['5 kJ/mol', '30 kJ/mol'], fmt: (v) => `${v.toFixed(1)} kJ/mol`, hint: '12.5 kJ/mol is the real hill of NO + O₃ → NO₂ + O₂, one of the lowest known.' },
    { key: 'nA', type: 'range', label: 'Blue molecules, A', min: 20, max: 200, step: 10, ends: ['20', '200'], fmt: (v) => `${v}` },
    { key: 'nB', type: 'range', label: 'Orange molecules, B', min: 20, max: 200, step: 10, ends: ['20', '200'], fmt: (v) => `${v}` },
    { key: 'steric', type: 'seg', label: 'Must A face the right way?', options: [{ v: 1, label: 'Any way round' }, { v: 0.5, label: 'Half of A reacts' }, { v: 0.25, label: 'A quarter' }], fmt: (v) => (v < 1 ? `steric factor p = ${v}` : 'p = 1') },
    { key: 'chart', type: 'seg', label: 'Chart', options: [{ v: 'hill', label: 'The hill' }, { v: 'tail', label: 'Collision energies' }, { v: 'speeds', label: 'Speeds' }, { v: 'curve', label: 'Rate vs temperature' }] },
    { key: 'go', type: 'buttons', label: 'The count', items: [{ label: 'Start counting again', act: (s) => { s.run = (s.run || 0) + 1; } }] },
  ],
  quiz: [
    { q: 'Two molecules collide but do not react. What is the most likely reason?', options: ['They were the wrong colour', 'The collision was not hard enough to get over the activation energy', 'Molecules react only when they are standing still', 'There was no catalyst, and nothing reacts without one'], answer: 1, why: 'Most collisions carry less than the activation energy, so the molecules simply bounce apart. Only the hardest collisions, the right way round, react.' },
    { q: 'You double the number of A molecules in the tank and leave B alone. What happens to the rate?', options: ['It stays the same', 'It doubles, because A–B collisions happen twice as often', 'It goes up four times', 'It halves'], answer: 1, why: 'The rate follows the number of A–B collisions, which is proportional to the amount of A times the amount of B. Twice the A, twice the rate. Double both and it is four times.' },
    { q: 'In k = A × e^(−Ea ÷ RT), what does the part e^(−Ea ÷ RT) tell you?', options: ['How many collisions happen each second', 'The share of collisions with enough energy to clear the hill', 'The temperature in kelvin', 'How much product you finally get'], answer: 1, why: 'It is a number between 0 and 1: the share of collisions that carry more than Ea. A higher hill makes it smaller, and a higher temperature makes it bigger.' },
  ],
  reel: [
    { ms: 5600, caption: 'Molecules react only when they collide hard enough to get over a hill of energy.', set: { T: 60, Ea: 12.5, nA: 200, nB: 200, steric: 1, chart: 'hill' }, anim: {}, view: { pos: [0, 5.3, 7.2], target: [0, 5.0, 0] }, spin: 0 },
    { ms: 5600, caption: 'Heat the gas and far more collisions clear the hill. The counted rate follows the Arrhenius equation.', set: { Ea: 12.5, nA: 200, nB: 200, steric: 1, chart: 'tail' }, anim: { T: [0, 400] }, view: { pos: [0, 5.3, 7.2], target: [0, 5.0, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const bench = box(6.6, 0.1, 3.6, M.matte(0x2b3039)); bench.position.set(0, 0.05, 0); root.add(bench);
    const gas = new Gas({ n: 400, box: [5, 3, 2.4], r: 0.08, s300: 1.6, seed: 5, T: 300 });
    const tk = tank(root, gas, AT);
    for (const x of [-2.2, 2.2]) { const leg = box(0.5, AT[1] - 1.5 - 0.27, 2.2, M.matte(0x23272f)); leg.position.set(x, (AT[1] - 1.5 - 0.17) / 2 + 0.05, 0); root.add(leg); }
    const view = gasView(tk, gas, { nub: true });

    // ---------------------------------------------------------------- the count
    let S = null, key = '', nKey = '', tDraw = 0, seen = 0;
    const bins = new Float64Array(41); let binN = 0;      // collision energies, 1 kJ/mol wide
    const rec = new Map();                                // counted rate at each temperature visited
    const balls = [];                                     // a sample of collisions rolling at the hill
    const restart = () => { gas.resetCounts(); bins.fill(0); binN = 0; seen = gas.eN; };

    // ---------------------------------------------------------------- board
    const bd = board(root, 3.4, 2.45, 640, 460, (g, w, h) => {
      panelBg(g, w, h); if (!S) return;
      const T = TK(S), rt = RTk(T), th = gas.theory(S.Ea, S.steric, S.nA, S.nB);
      if (S.chart === 'hill') {
        title(g, 'The energy hill', 'each dot is one collision');
        const H = hill(g, { x0: 70, x1: w - 24, y0: h - 60, y1: 96, yMax: 36, yMin: -10, dE: -6, hills: [{ Ea: S.Ea, col: COL.hill }] });
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.setLineDash([6, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(70, H.Y(S.Ea)); g.lineTo(H.xm, H.Y(S.Ea)); g.stroke(); g.setLineDash([]);
        text(g, `Ea = ${S.Ea.toFixed(1)} kJ/mol`, 80, H.Y(S.Ea) - 10, COL.hill, 'bold 23px sans-serif');
        text(g, 'energy', 76, 86, COL.soft, '19px sans-serif');
        for (const b of balls) {
          const u = clamp(b.age / 1.1, 0, 1);
          let k;
          if (b.ok) k = u;
          else { let kt = 0.5; for (let i = 0; i <= 20; i++) { if (hillE(i / 40, S.Ea, -6) >= b.E) { kt = i / 40; break; } } k = kt * Math.sin(Math.PI * u); }
          const px = H.xa + (H.xb - H.xa) * k - (b.ok ? 0 : 46 * (1 - Math.sin(Math.PI * u))), py = H.Y(hillE(clamp(k, 0, 1), S.Ea, -6)) - 12;
          g.globalAlpha = b.ok ? 1 : 0.75; g.fillStyle = b.ok ? '#fff' : COL.A; g.beginPath(); g.arc(px, py, b.ok ? 10 : 7, 0, Math.PI * 2); g.fill();
          g.fillStyle = b.ok ? COL.C : COL.B; g.beginPath(); g.arc(px + (b.ok ? 13 : 10), py, b.ok ? 10 : 7, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
        }
        text(g, `over the top: ${share(th.share)}`, w - 30, 86, COL.ok, 'bold 23px sans-serif', 'right');
        text(g, 'path of the reaction →', w - 30, h - 20, COL.soft, '20px sans-serif', 'right');
      } else if (S.chart === 'tail') {
        title(g, 'How hard are the collisions?');
        const a = axes(g, w, h, { xMax: 40, yMax: 1, yMin: 0, xTicks: [0, 10, 20, 30, 40], yTicks: [], xLabel: 'energy of a collision along the line of centres (kJ/mol) →' });
        const top = 1 / rt, Yv = (v) => a.y0 - (v / top) * (a.y0 - a.y1);
        // counted bars
        if (binN > 20) { g.fillStyle = 'rgba(111,182,255,.35)'; for (let i = 0; i < 40; i++) { const v = bins[i] / binN; g.fillRect(a.X(i) + 1, Yv(v), a.X(i + 1) - a.X(i) - 2, a.y0 - Yv(v)); } }
        // theory e^(−E/RT) ÷ RT, and the tail past Ea
        g.fillStyle = 'rgba(92,225,169,.45)'; g.beginPath(); g.moveTo(a.X(S.Ea), a.y0);
        for (let E = S.Ea; E <= 40; E += 0.25) g.lineTo(a.X(E), Yv(Math.exp(-E / rt) / rt));
        g.lineTo(a.X(40), a.y0); g.closePath(); g.fill();
        curve(g, (E) => Math.exp(-E / rt) / rt, 0, 40, a.X, (v) => Yv(v), COL.theory, 4);
        g.strokeStyle = COL.hill; g.lineWidth = 3; g.setLineDash([7, 6]); g.beginPath(); g.moveTo(a.X(S.Ea), a.y0); g.lineTo(a.X(S.Ea), a.y1 + 40); g.stroke(); g.setLineDash([]);
        text(g, `Ea = ${S.Ea.toFixed(1)}`, a.X(S.Ea) + 8, a.y1 + 58, COL.hill, 'bold 22px sans-serif');
        text(g, `past the hill: ${share(boltz(S.Ea, T))}`, w - 30, a.y1 + 100, COL.ok, 'bold 24px sans-serif', 'right');
        text(g, `counted: ${gas.coll > 50 ? share(gas.hard / gas.coll) : '…'}`, w - 30, a.y1 + 132, COL.A, 'bold 22px sans-serif', 'right');
        text(g, 'bars: counted · line: e^(−E ÷ RT)', a.x0 + 10, 84, COL.soft, '20px sans-serif');
      } else if (S.chart === 'speeds') {
        const sgR = Math.sqrt((R * T) / M_MOL), vMax = 1600;
        title(g, 'How fast the molecules fly', `at ${Math.round(S.T)} °C`);
        const a = axes(g, w, h, { xMax: vMax, yMax: 1, xTicks: [0, 400, 800, 1200, 1600], yTicks: [], xLabel: 'speed (m/s) →' });
        const top = 0.0036, Yv = (v) => a.y0 - (v / top) * (a.y0 - a.y1);
        // counted: the dots' speeds, scaled to real metres a second
        const hist = new Float64Array(32); let c = 0; const k = sgR / gas.sg, bw = vMax / 32;
        for (let i = 0; i < gas.n; i++) if (gas.on[i] && gas.held[i] < 0) { const j = i * 3, v = Math.hypot(gas.v[j], gas.v[j + 1], gas.v[j + 2]) * k; const b = Math.floor(v / bw); if (b < 32) hist[b]++; c++; }
        g.fillStyle = 'rgba(111,182,255,.4)'; for (let i = 0; i < 32; i++) { const v = hist[i] / c / bw; g.fillRect(a.X(i * bw) + 1, Yv(v), a.X(bw) - a.X(0) - 2, a.y0 - Yv(v)); }
        clip(g, a, () => {
          for (const TT of [223, 773]) curve(g, (v) => maxwell(v, Math.sqrt((R * TT) / M_MOL)), 0, vMax, a.X, Yv, 'rgba(255,255,255,.22)', 2, [6, 6]);
          curve(g, (v) => maxwell(v, sgR), 0, vMax, a.X, Yv, COL.count, 4);
        });
        const mean = Math.sqrt((8 * R * T) / (Math.PI * M_MOL));
        text(g, `average ${Math.round(mean)} m/s`, w - 30, a.y1 + 24, COL.count, 'bold 24px sans-serif', 'right');
        text(g, 'bars: the dots in the tank', w - 30, a.y1 + 56, COL.A, '20px sans-serif', 'right');
        text(g, 'line: Maxwell–Boltzmann', w - 30, a.y1 + 82, COL.soft, '20px sans-serif', 'right');
      } else {
        title(g, 'Rate vs temperature');
        const f = (Tc) => { const TT = Tc + K0, z = th.z * Math.sqrt(TT / T); return z * S.steric * boltz(S.Ea, TT); };
        const yMax = Math.max(1, f(500) * 1.12);
        const a = axes(g, w, h, { xMin: -50, xMax: 500, yMax, xTicks: [0, 100, 200, 300, 400, 500], yTicks: [0, yMax / 2, yMax], xFmt: (v) => v + '°', yFmt: (v) => num(v, 2), xLabel: 'temperature (°C) →', yLabel: 'reactions a second' });
        curve(g, f, -50, 500, a.X, a.Y, COL.theory, 4);
        for (const [Tc, p] of rec) if (Tc !== Math.round(S.T)) ring(g, a.X(Tc), a.Y(Math.min(yMax, p)), COL.count, 9);
        if (gas.t > 2) dot(g, a.X(S.T), a.Y(Math.min(yMax, gas.react / gas.t)), COL.count, 10);
        text(g, 'line: collision theory', a.x0 + 14, a.y1 + 26, COL.theory, '21px sans-serif');
        text(g, 'dots: counted in the tank', a.x0 + 14, a.y1 + 54, COL.count, 'bold 21px sans-serif');
      }
    }, [3.35, 6.0, 0]);

    const lTank = stage.label('', [-2.0, AT[1] + 1.85, 1.2], root);
    const lPlate = stage.label('', [1.3, AT[1] - 1.75, 1.5], root, 'hot');
    const lFlash = stage.label('a white flash is one reaction', [-1.2, AT[1] - 1.75, 1.5], root);
    const opt = { Ea: 12.5, EaBack: null, steric: 1, mode: 'steady', cat: null };

    return {
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        const narrow = fitNarrow(stage, [lFlash, lTank]);
        placeBoard(bd, [[3.25, 6.25, 0], -0.06, 1.3], REEL, PHONE);
        const T = TK(s);
        const nk = `${s.nA}|${s.nB}`;
        if (nk !== nKey) { nKey = nk; gas.fill(s.nA, s.nB); }
        const k = `${nk}|${s.T}|${s.Ea}|${s.steric}|${s.run}`;
        if (k !== key) {
          if (key && key.split('|').filter((v, i) => i !== 2 && i !== 5).join() !== k.split('|').filter((v, i) => i !== 2 && i !== 5).join()) rec.clear();
          key = k; gas.setT(T); restart();
        }
        opt.Ea = s.Ea; opt.steric = s.steric;
        gas.step(dt, opt);
        // collision energies seen since the last frame
        while (seen < gas.eN) {
          const E = gas.energies[seen++ & 511], b = Math.min(40, Math.floor(E)); bins[b]++; binN++;
          if (E <= s.Ea && balls.length < 26 && (seen & 7) === 0) balls.push({ E, ok: false, age: 0 });
        }
        for (const e of gas.events) balls.push({ E: e.E, ok: true, age: 0 });
        for (let i = balls.length - 1; i >= 0; i--) { balls[i].age += dt; if (balls[i].age > 1.1) balls.splice(i, 1); }
        if (gas.t > 6) rec.set(Math.round(s.T), gas.react / gas.t);
        view.draw(dt, s.steric < 1);
        tk.setT(T);
        lTank.element.innerHTML = `<b style="color:${COL.A}">${s.nA} A</b> and <b style="color:${COL.B}">${s.nB} B</b> molecules`;
        lPlate.element.innerHTML = `thermostat: <b>${Math.round(s.T)} °C</b>`;
        lPlate.element.style.setProperty('--c', cssTemp(T));
        lFlash.visible = !narrow && !inReel();
        tDraw -= dt;
        if (tDraw <= 0 || s.chart === 'hill') { tDraw = 0.25; bd.redraw(); }
      },
      readout: (s) => fit(((s) => {
        const T = TK(s), x = s.Ea / RTk(T), th = gas.theory(s.Ea, s.steric, s.nA, s.nB), t = Math.max(gas.t, 1e-6);
        const got = gas.t > 1.5;
        return `<div class="big">e<sup>−Ea ÷ RT</sup> = e<sup>−${x.toFixed(2)}</sup> = ${share(boltz(s.Ea, T))}</div>
          <div class="row x"><span>Hill ÷ thermal energy</span><b>${s.Ea.toFixed(1)} ÷ ${RTk(T).toFixed(2)} kJ/mol</b></div>
          <div class="row"><span>A–B collisions a second</span><b>counted ${got ? fmt(gas.coll / t) : '…'} · theory ${fmt(th.z)}</b></div>
          <div class="row"><span>Hard enough${s.steric < 1 ? ', right way round' : ''}</span><b>counted ${gas.coll > 50 ? share(gas.react / gas.coll) : '…'} · theory ${share(th.share)}</b></div>
          <div class="row"><span>Reactions a second</span><b style="color:${COL.count}">counted ${got ? fmt(gas.react / t) : '…'} · theory ${fmt(th.rate)}</b></div>
          <small>Counted over ${Math.round(gas.t)} s: ${gas.react} reactions out of ${gas.coll.toLocaleString('en-IN')} collisions. Theory = collisions × ${s.steric < 1 ? `p (${s.steric}) × ` : ''}e<sup>−Ea ÷ RT</sup>.</small>`;
      })(s)),
    };
  },
};
const fmt = (v) => (v >= 100 ? Math.round(v).toString() : v >= 10 ? v.toFixed(1) : v.toFixed(2));
