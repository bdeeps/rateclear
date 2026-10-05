// Chapter 4: catalysts. A catalyst opens another path with a lower hill and comes out unchanged.
// Three scenes.
// "path": the tank of chapter 1 (the collision model of kinetics.js) with a hill too high to climb,
//   25 kJ/mol. Then twenty gold beads go in: the catalyst. A blue molecule A that lands on a bead
//   sticks for a moment, and an orange B that strikes it there reacts if its energy is above the
//   catalyst's own, lower hill. The bead lets go and is free again. Nothing is told how fast to go:
//   the readout counts the reactions on each path, and sets the counted share of successful strikes
//   beside e^(−Ea ÷ RT) for that hill. Lowering a hill from Ea to Ea' raises the share that clears it
//   by e^((Ea − Ea') ÷ RT).
//   Real hills for the chart, hydrogen peroxide breaking down, 2 H₂O₂ → 2 H₂O + O₂ (kJ/mol): alone 75,
//   with iodide ions 56.5, on platinum 49, with the enzyme catalase 8 (Moelwyn-Hughes; as tabulated by
//   RSC Education, "Investigating activation energies", and LibreTexts, "Ea and catalysts").
// "enzyme": one kind of molecule (the substrate) and eight enzymes. A substrate that lands on a free
//   enzyme is held, and is turned into product after a wait set by the turnover rate kcat. While it
//   is held the enzyme is busy and bounces everything else away. That alone gives the saturation
//   curve of Michaelis and Menten (1913):
//       rate = Vmax × S ÷ (Km + S),  Vmax = kcat × (number of enzymes),  Km = kcat ÷ k_on.
//   k_on is not fitted: it is the kinetic-theory rate at which one molecule strikes one sphere,
//   π (r_enzyme + r_molecule)² × (mean speed) ÷ volume. The counted rate lands on the curve.
//   Real turnover: one catalase molecule can break down millions of H₂O₂ molecules a second, up to
//   about 4 × 10⁷ (Lehninger, Principles of Biochemistry, table of turnover numbers).
// "works": two catalysts that changed the world.
//   The catalytic converter: platinum, palladium and rhodium on a ceramic honeycomb turn CO, unburnt
//   hydrocarbons and nitrogen oxides into CO₂, H₂O and N₂. It does little when cold and "lights off"
//   between about 200 and 300 °C; hot, it removes well over 90 % (Wikipedia "Catalytic converter";
//   Heck and Farrauto, Catalytic Air Pollution Control). The curve here is first-order Arrhenius
//   chemistry in a channel, conversion = 1 − e^(−kτ), with a hill of 100 kJ/mol (the order of CO
//   oxidation on platinum) and kτ pinned so that half is converted at 250 °C. A model of the shape,
//   not of any one car. India: converters on new petrol cars in the four metros from 1 April 1995
//   (with unleaded petrol, because lead poisons the catalyst); BS6 norms nationwide from 1 April 2020.
//   The Haber process: N₂ + 3H₂ ⇌ 2NH₃ over promoted iron at about 200 bar and 400 to 450 °C. The N≡N
//   bond is 945 kJ/mol. On iron the molecule is taken apart on the surface in small steps (Ertl, Nobel
//   Prize 2007). About 15 % is converted per pass; at balance the mixture holds about 27 % ammonia at
//   200 bar and 450 °C with or without iron (the figures of EquilibriumClear). Mittasch's team at BASF
//   ran about 20,000 tests from 1909 to find the catalyst (Wikipedia "Alwin Mittasch").
import { M, box, clamp, approach } from '../kit.js';
import {
  THREE, Gas, R, K0, TAU, boltz, COL, hex, share, times, num, fmt0, sci, board, panelBg, title, axes, curve, dot, ring, text, clip, hill, hillE,
  tank, gasView, dots, rng, tempColor, cssTemp, fitNarrow, placeBoard, fit, focusSwitch, showLabels, inReel,
} from '../rate.js';

const VIEW = { pos: [0.2, 3.5, 10.6], target: [0.2, 3.25, 0] };
const VIEWS = { path: VIEW, enzyme: VIEW, works: VIEW };
const REEL = [[0, 7.5, 0], 0, 2], PHONE = [[0, -1.6, 1.2], 0, 1.35];
const AT = [0, 2.35, 0];
const RTk = (T) => (R * T) / 1000;

// twenty catalyst beads, spread through the tank
const BEADS = [];
for (let i = 0; i < 20; i++) { const c = i % 5, rw = Math.floor(i / 5); BEADS.push([-2 + c * 1.0, (rw - 1.5) * 0.72, i % 2 ? 0.55 : -0.55, 0.18]); }
// eight enzymes
const ENZ = [];
for (let i = 0; i < 8; i++) ENZ.push([-1.8 + (i % 4) * 1.2, i < 4 ? -0.65 : 0.65, i % 2 ? 0.5 : -0.5, 0.26]);
// hydrogen peroxide's hills, kJ/mol (sources above)
export const PEROXIDE = [{ n: 'alone', Ea: 75 }, { n: 'iodide', Ea: 56.5 }, { n: 'platinum', Ea: 49 }, { n: 'catalase', Ea: 8 }];
// the converter's light-off curve
const EA_CO = 100, T50 = 250;
export const lightOff = (Tc) => 1 - Math.exp(-Math.LN2 * Math.exp(((EA_CO * 1000) / R) * (1 / (T50 + K0) - 1 / (Tc + K0))));
const pct = (x) => (x > 0.995 ? 'more than 99 %' : x < 0.001 ? 'almost nothing' : `${(x * 100).toFixed(x < 0.1 ? 1 : 0)} %`);
const HABER = { pass: 0.15, eq: 0.27, bond: 945 };

export default {
  id: 'catalyst',
  short: 'A lower path',
  title: 'Catalysts: another path, with a lower hill',
  subtitle: 'A catalyst speeds a reaction and is not used up. Meet enzymes, the catalytic converter and the iron that makes fertiliser.',
  view: VIEW,
  learn: `<p>Some reactions have a hill so high that almost no collision gets over it. You could heat the mixture, but there is another way: add a <b>catalyst</b>. A catalyst gives the reaction <b>a different path with a lower hill</b>. It takes part in the middle of the reaction, then comes out exactly as it went in, ready to be used again. So a little catalyst can change a great deal of material.</p>
    <p>In the tank, the gold beads are the catalyst. A blue molecule sticks to a bead for a moment. That stretches its bonds, so an orange molecule needs a much gentler hit to react with it. Then the bead lets go. Count the beads at the end: all twenty are still there.</p>
    <p>A catalyst <b>cannot</b> make a reaction give more product. It lowers the hill in both directions, so it changes only <b>how fast</b> the reaction gets to its end point. For that story see <a href="https://glassbox.how/equilibriumclear/">EquilibriumClear</a>.</p>
    <p><b>Enzymes</b> are the catalysts of living things: proteins with a pocket that fits one particular molecule. Your body runs on thousands of them (see DigestionClear). An enzyme can only work on one molecule at a time, so when every enzyme is busy, adding more food for it does not help: the rate <b>levels off</b>.</p>
    <p><b>The catalytic converter</b> under a car holds a ceramic honeycomb coated with platinum, palladium and rhodium. On their surface, poisonous carbon monoxide, unburnt fuel and nitrogen oxides turn into carbon dioxide, water and nitrogen. It needs to be hot, which is why a car pollutes most in the first minute after a cold start (see CarClear). Lead ruins it, which is one reason petrol is now unleaded.</p>
    <p><b>Iron</b> is the catalyst of the Haber process, which makes ammonia for fertiliser from nitrogen and hydrogen. Nitrogen has one of the strongest bonds in chemistry. An iron surface pulls the molecule apart in small, easy steps.</p>
    <p class="tip"><b>Try it:</b> in <b>The tank</b>, watch the quiet gas, then switch the catalyst on. In <b>Enzyme</b>, slide the substrate from 10 to 300 molecules and watch the counted rate bend over. In <b>At work</b>, start the car cold and warm the converter past 250 °C, then take the iron out of the ammonia reactor.</p>`,
  terms: [
    { t: 'Catalyst', d: 'A substance that speeds a reaction by giving it a path with a lower hill. It is not used up.' },
    { t: 'Enzyme', d: 'A protein that acts as a catalyst in living things. Each enzyme fits its own kind of molecule.' },
    { t: 'Substrate', d: 'The molecule an enzyme works on.' },
    { t: 'Active site', d: 'The place on a catalyst or enzyme where the reaction happens.' },
    { t: 'Saturation', d: 'When every enzyme or every active site is busy, so adding more reactant no longer raises the rate.' },
    { t: 'Light-off temperature', d: 'The temperature at which a catalytic converter starts to work well, roughly 250 °C.' },
    { t: 'Catalyst poison', d: 'A substance that sticks to a catalyst and blocks it. Lead does this to a catalytic converter.' },
  ],
  defaults: { focus: 'path', cat: true, T: 27, Ea: 25, EaC: 5, chart: 'hill', run: 0, sub: 60, kcat: 1, plant: 'car', exT: 30, iron: true },
  controls: [
    { key: 'focus', type: 'seg', label: 'Look at', options: [{ v: 'path', label: 'The tank' }, { v: 'enzyme', label: 'Enzyme' }, { v: 'works', label: 'At work' }] },
    { key: 'cat', type: 'toggle', label: 'Tank: catalyst beads in the tank' },
    { key: 'EaC', type: 'range', label: 'Tank: hill on the catalyst', min: 3, max: 15, step: 0.5, ends: ['3 kJ/mol', '15 kJ/mol'], fmt: (v) => `${v.toFixed(1)} kJ/mol` },
    { key: 'Ea', type: 'range', label: 'Tank: hill without the catalyst', min: 15, max: 30, step: 0.5, ends: ['15 kJ/mol', '30 kJ/mol'], fmt: (v) => `${v.toFixed(1)} kJ/mol` },
    { key: 'T', type: 'range', label: 'Tank: temperature', min: -50, max: 300, step: 5, ends: ['−50 °C', '300 °C'], fmt: (v) => `${Math.round(v)} °C` },
    { key: 'chart', type: 'seg', label: 'Tank: chart', options: [{ v: 'hill', label: 'Two paths' }, { v: 'real', label: 'Real catalysts' }] },
    { key: 'go', type: 'buttons', label: 'Tank: the count', items: [{ label: 'Start counting again', act: (s) => { s.run = (s.run || 0) + 1; } }] },
    { key: 'sub', type: 'range', label: 'Enzyme: substrate molecules', min: 10, max: 300, step: 10, ends: ['10', '300'], fmt: (v) => `${v}` },
    { key: 'kcat', type: 'seg', label: 'Enzyme: how quick each enzyme is', options: [{ v: 0.5, label: 'Slow' }, { v: 1, label: 'Medium' }, { v: 2, label: 'Quick' }], fmt: (v) => `one molecule every ${num(1 / v, 2)} s` },
    { key: 'plant', type: 'seg', label: 'At work: which catalyst', options: [{ v: 'car', label: 'Car converter' }, { v: 'haber', label: 'Iron for ammonia' }] },
    { key: 'exT', type: 'range', label: 'Converter: temperature of the honeycomb', min: 20, max: 600, step: 5, ends: ['20 °C cold start', '600 °C'], fmt: (v) => `${Math.round(v)} °C` },
    { key: 'iron', type: 'toggle', label: 'Ammonia: iron catalyst in the reactor' },
  ],
  quiz: [
    { q: 'What does a catalyst do to a reaction?', options: ['It gives the molecules more energy', 'It opens a path with a lower activation energy, and is not used up', 'It makes the reaction give more product', 'It raises the temperature'], answer: 1, why: 'A catalyst offers another route with a lower hill, so far more collisions succeed. It comes out unchanged and can be used again. It does not change how much product forms.' },
    { q: 'You keep adding more substrate to a fixed amount of enzyme. What happens to the rate?', options: ['It rises for ever', 'It rises, then levels off when every enzyme is busy', 'It falls', 'It does not change at all'], answer: 1, why: 'Each enzyme can hold only one molecule at a time. Once they are all busy, extra substrate just has to wait, so the rate reaches a top speed.' },
    { q: 'Why does a car pollute most in the first minute after a cold start?', options: ['The catalyst has been used up overnight', 'The catalytic converter is too cold: its reactions need about 250 °C to go fast', 'Cold petrol contains more carbon', 'The exhaust pipe is blocked by dew'], answer: 1, why: 'Even on platinum the reactions have a hill to climb. Below the light-off temperature too few collisions clear it, so the exhaust passes through almost untouched until the honeycomb heats up.' },
  ],
  reel: [
    { ms: 5600, caption: 'A catalyst opens a path with a lower hill. Reactions that hardly happened now flash on every bead, and the beads are not used up.', set: { focus: 'path', T: 27, Ea: 25, EaC: 5, chart: 'hill' }, anim: { cat: [false, true] }, view: { pos: [0, 5.3, 7.2], target: [0, 5.0, 0] }, spin: 0 },
    { ms: 5400, caption: 'A car\'s catalytic converter does almost nothing when cold. Past about 250 °C it cleans more than 90 % of the exhaust.', set: { focus: 'works', plant: 'car' }, anim: { exT: [60, 450] }, view: { pos: [0, 5.0, 7.0], target: [0, 4.8, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const bench = box(7.2, 0.1, 3.6, M.matte(0x2b3039)); bench.position.set(0, 0.05, 0); root.add(bench);
    const G = { path: new THREE.Group(), enzyme: new THREE.Group(), works: new THREE.Group() };
    Object.values(G).forEach((g) => root.add(g));
    const rnd = rng(41), cc = new THREE.Color();
    const legs = (g) => { for (const x of [-2.2, 2.2]) { const leg = box(0.5, AT[1] - 1.5 - 0.27, 2.2, M.matte(0x23272f)); leg.position.set(x, (AT[1] - 1.5 - 0.17) / 2 + 0.05, 0); g.add(leg); } };

    // ================================================================ path: tank with catalyst beads
    const gas = new Gas({ n: 400, box: [5, 3, 2.4], r: 0.08, s300: 1.6, seed: 7, T: 300 });
    const tk = tank(G.path, gas, AT); legs(G.path);
    const view = gasView(tk, gas);
    const opt = { Ea: 25, EaBack: null, steric: 1, mode: 'steady', cat: { on: true, mode: 'pair', Ea: 5, stay: 1.5 } };
    let pKey = '', catOn = null, balls = [];
    const lBeads = stage.label('', [-1.6, AT[1] + 1.85, 1.2], G.path, 'hot'), lPT = stage.label('', [1.5, AT[1] - 1.75, 1.5], G.path, 'hot'), lPF = stage.label('', [-1.3, AT[1] - 1.75, 1.5], G.path);
    const pathLabels = [lBeads, lPT, lPF];
    const heldNow = () => gas.sites.reduce((a, q) => a + (q.mol >= 0 ? 1 : 0), 0);
    const usesNow = () => gas.sites.reduce((a, q) => a + (q.uses || 0), 0);

    // ================================================================ enzyme
    const eg = new Gas({ n: 600, box: [5, 3, 2.4], r: 0.08, s300: 1.6, seed: 13, T: 310 });
    eg.addSites(ENZ);
    const etk = tank(G.enzyme, eg, AT); legs(G.enzyme);
    const eview = gasView(etk, eg, { cols: [COL.A, COL.B, COL.C, COL.D].map((c) => new THREE.Color(c)), sparkCol: hex(COL.C) });
    eview.sites(hex(COL.volt));
    const eopt = { Ea: 1e9, EaBack: null, steric: 1, mode: 'steady', cat: { on: true, mode: 'solo', kcat: 1 } };
    const mE = 0.26 + eg.r, kOn = (Math.PI * mE * mE * eg.sg * Math.sqrt(8 / Math.PI)) / eg.vol;      // per molecule per enzyme, 1/s
    const mmRate = (S, kcat) => (kcat * ENZ.length * S) / (kcat / kOn + S);
    let eKey = '', busyT = 0; const erec = new Map();
    const lEnz = stage.label('', [-1.6, AT[1] + 1.85, 1.2], G.enzyme, 'hot'), lSub = stage.label('', [1.9, AT[1] - 1.75, 1.5], G.enzyme), lEF = stage.label('a flash: one molecule made into product', [-1.5, AT[1] - 1.75, 1.5], G.enzyme);
    const enzLabels = [lEnz, lSub, lEF];
    const busyCol = new THREE.Color(0xffffff), freeCol = new THREE.Color(COL.volt);

    // ================================================================ works: converter and ammonia reactor
    const W = G.works;
    // ---- the catalytic converter (exhaust flows left to right)
    const CAR = new THREE.Group(); CAR.scale.setScalar(1.25); CAR.position.y = -0.55; W.add(CAR);
    const CY = 2.3, steel = M.metal(0x9aa0aa, { roughness: 0.35 }), BL = 2.3, BR = 0.72;
    const cyl = (r0, r1, len, mat, x, open = false) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 40, 1, open), mat); m.rotation.z = -Math.PI / 2; m.position.set(x, CY, 0); CAR.add(m); return m; };
    cyl(0.24, 0.24, 1.3, steel, -2.55); cyl(0.24, 0.8, 0.6, steel, -1.6, true);
    cyl(0.8, 0.8, 2.6, M.clear(0xcfe8ff, 0.12), 0, true);
    cyl(0.8, 0.24, 0.6, steel, 1.6, true); cyl(0.24, 0.24, 1.3, steel, 2.55);
    for (const x of [-1.3, 1.3]) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.81, 0.04, 8, 48), steel); b.rotation.y = Math.PI / 2; b.position.set(x, CY, 0); CAR.add(b); }
    for (const x of [-2.4, 2.4]) { const st = box(0.12, CY - 0.3, 0.12, M.metal(0x6b717c)); st.position.set(x, (CY - 0.3) / 2 + 0.1, 0); CAR.add(st); }
    // the honeycomb: thin ceramic walls running the length of the brick (real cells are about 1 mm square)
    const brickMat = new THREE.MeshStandardMaterial({ color: 0x8f8672, roughness: 0.9, emissive: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
    for (let i = -4; i <= 4; i++) {
      const o = i * 0.16, wdt = 2 * Math.sqrt(BR * BR - o * o);
      const a = box(BL, 0.018, wdt, brickMat); a.position.set(0, CY + o, 0); a.castShadow = false; CAR.add(a);
      const b = box(BL, wdt, 0.018, brickMat); b.position.set(0, CY, o); b.castShadow = false; CAR.add(b);
    }
    const NX = 170, exh = dots(NX, 0.06, 0xffffff, 8); CAR.add(exh);
    const DIRTY = [0xff5a5a, 0xc98a52, 0xffb547].map((c) => new THREE.Color(c)), CLEAN = new THREE.Color(0xbfe6ff);
    const exP = Array.from({ length: NX }, (_, i) => { const a = rnd() * TAU, r = Math.sqrt(rnd()); return { t: rnd(), cy: r * Math.cos(a), cz: r * Math.sin(a), k: (i + 0.5) / NX, u: 0.1 + 0.8 * rnd(), kind: i % 3, sp: 0.8 + 0.4 * rnd() }; });
    const lIn = stage.label('from the engine: <b style="color:#ff5a5a">CO</b>, <b style="color:#c98a52">unburnt fuel</b>, <b style="color:#ffb547">NOx</b>', [-2.7, CY - 1.1, 0.9], CAR);
    const lOut = stage.label('to the tailpipe: <b style="color:#bfe6ff">CO₂, H₂O, N₂</b>', [2.6, CY - 1.1, 0.9], CAR);
    const lCat = stage.label('', [0, CY + 1.25, 0.4], CAR, 'hot');
    const carLabels = [lIn, lOut, lCat];
    // ---- the ammonia reactor (gas flows top to bottom)
    const HB = new THREE.Group(); HB.scale.setScalar(1.2); HB.position.y = -0.3; W.add(HB);
    const HY = 2.0, HH = 2.3, HR = 0.95;
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(HR, HR, HH, 48, 1, true), M.clear(0xcfe8ff, 0.14)); shell.position.set(0, HY, 0); HB.add(shell);
    for (const sgn of [1, -1]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(HR, 40, 12, 0, TAU, 0, Math.PI / 2), steel); cap.scale.y = 0.4; if (sgn < 0) cap.rotation.x = Math.PI; cap.position.set(0, HY + (sgn * HH) / 2, 0); HB.add(cap);
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.5, 20), steel); pipe.position.set(0, HY + sgn * (HH / 2 + 0.6), 0); HB.add(pipe);
      const fl = new THREE.Mesh(new THREE.TorusGeometry(HR + 0.01, 0.05, 8, 48), steel); fl.rotation.x = Math.PI / 2; fl.position.set(0, HY + (sgn * HH) / 2, 0); HB.add(fl);
    }
    const NI = 150, ironD = dots(NI, 0.1, 0x6f7480, 8); HB.add(ironD);
    const ironP = Array.from({ length: NI }, () => { const a = rnd() * TAU, r = Math.sqrt(rnd()) * (HR - 0.14); return [r * Math.cos(a), HY - 0.8 + rnd() * 1.6, r * Math.sin(a), 0.8 + 0.5 * rnd()]; });
    const NH = 150, hgas = dots(NH, 0.06, 0xffffff, 8); HB.add(hgas);
    const N2C = new THREE.Color(COL.A), H2C = new THREE.Color(0xf2f5fa), NH3C = new THREE.Color(COL.C);
    const hP = Array.from({ length: NH }, (_, i) => { const a = rnd() * TAU, r = Math.sqrt(rnd()) * (HR - 0.12); return { t: rnd(), x: r * Math.cos(a), z: r * Math.sin(a), k: (i + 0.5) / NH, u: 0.3 + 0.4 * rnd(), n2: i % 4 === 0, sp: 0.8 + 0.4 * rnd() }; });
    const lHin = stage.label('in: <b style="color:#6fb6ff">nitrogen</b> and <b>hydrogen</b>, about 200 bar', [2.5, HY + 1.0, 0.5], HB);
    const lHout = stage.label('', [2.3, HY - 1.3, 0.5], HB, 'hot');
    const lBed = stage.label('', [-2.3, HY, 0.5], HB);
    const habLabels = [lHin, lHout, lBed];
    let ironShown = null;

    // ================================================================ board
    let S = null, tDraw = 0, bKey = '';
    const bd = board(root, 3.4, 2.45, 640, 460, (g, w, h) => {
      panelBg(g, w, h); if (!S) return;
      if (S.focus === 'path') {
        const T = S.T + K0;
        if (S.chart === 'hill') {
          title(g, 'Two paths over the hill');
          const H = hill(g, { x0: 70, x1: w - 24, y0: h - 60, y1: 100, yMax: 34, yMin: -10, dE: -6, hills: [{ Ea: S.Ea, col: COL.hill, dash: S.cat ? [10, 8] : null, w: S.cat ? 3 : 5 }, ...(S.cat ? [{ Ea: S.EaC, col: COL.cat }] : [])] });
          text(g, `without: ${S.Ea.toFixed(1)} kJ/mol`, H.xm, H.Y(S.Ea) - 12, COL.hill, 'bold 22px sans-serif', 'center');
          if (S.cat) text(g, `on the catalyst: ${S.EaC.toFixed(1)}`, H.xm, H.Y(S.EaC) + (S.Ea - S.EaC < 7 ? 34 : -12), COL.cat, 'bold 22px sans-serif', 'center');
          for (const b of balls) {
            const u = clamp(b.age / 1.0, 0, 1), E = b.cat ? S.EaC : S.Ea;
            const px = H.xa + (H.xb - H.xa) * u, py = H.Y(hillE(u, E, -6)) - 11;
            g.fillStyle = b.cat ? COL.cat : '#fff'; g.beginPath(); g.arc(px, py, 9, 0, TAU); g.fill();
          }
          text(g, 'same start, same end: only the hill changes', w - 30, h - 20, COL.soft, '19px sans-serif', 'right');
          text(g, 'energy', 76, 90, COL.soft, '19px sans-serif');
        } else {
          title(g, 'Hydrogen peroxide breaking down', `at ${Math.round(S.T)} °C`);
          const x0 = 150, x1 = w - 200, top = 96, bh = 62;
          PEROXIDE.forEach((p, i) => {
            const y = top + i * (bh + 18), len = ((x1 - x0) * p.Ea) / 80;
            g.fillStyle = i ? COL.cat : COL.hill; g.globalAlpha = i ? 0.85 : 1; g.fillRect(x0, y, len, bh); g.globalAlpha = 1;
            text(g, p.n, x0 - 12, y + 26, COL.text, 'bold 22px sans-serif', 'right');
            text(g, i ? 'catalyst' : 'no catalyst', x0 - 12, y + 50, COL.soft, '17px sans-serif', 'right');
            text(g, `${p.Ea} kJ/mol`, x0 + len + 10, y + 26, COL.text, 'bold 22px sans-serif');
            const f = boltz(p.Ea, T) / boltz(75, T);
            text(g, i ? `× ${f >= 1e5 ? sci(f, 1) : fmt0(+f.toPrecision(2))}` : 'the yardstick', x0 + len + 10, y + 52, i ? COL.ok : COL.soft, '20px sans-serif');
          });
          text(g, '× : how many times more collisions clear the hill', w - 24, h - 16, COL.soft, '18px sans-serif', 'right');
        }
      } else if (S.focus === 'enzyme') {
        title(g, 'Rate against substrate');
        const vmax = S.kcat * ENZ.length, yMax = Math.ceil(vmax * 1.1);
        const a = axes(g, w, h, { xMax: 300, yMax, xTicks: [0, 100, 200, 300], yTicks: [0, yMax / 2, yMax], yFmt: (v) => num(v, 2), xLabel: 'substrate molecules in the tank →', yLabel: 'reactions a second' });
        g.strokeStyle = 'rgba(255,255,255,.4)'; g.setLineDash([7, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(a.x0, a.Y(vmax)); g.lineTo(a.x1, a.Y(vmax)); g.stroke(); g.setLineDash([]);
        text(g, `top speed: ${ENZ.length} enzymes × ${S.kcat} a second = ${num(vmax, 2)}`, a.x1 - 6, a.Y(vmax) + 26, COL.soft, '19px sans-serif', 'right');
        curve(g, (x) => mmRate(x, S.kcat), 0, 300, a.X, a.Y, COL.theory, 4);
        for (const [x, y] of erec) if (x !== S.sub) ring(g, a.X(x), a.Y(Math.min(yMax, y)), COL.count, 9);
        if (eg.t > 3) dot(g, a.X(S.sub), a.Y(Math.min(yMax, eg.turn / eg.t)), COL.count, 10);
        text(g, 'line: Michaelis–Menten', a.x1 - 6, a.y0 - 46, COL.theory, '20px sans-serif', 'right');
        text(g, 'dots: counted in the tank', a.x1 - 6, a.y0 - 18, COL.count, 'bold 20px sans-serif', 'right');
      } else if (S.plant === 'car') {
        title(g, 'How much exhaust is cleaned');
        const a = axes(g, w, h, { xMax: 600, yMax: 100, xTicks: [0, 100, 200, 300, 400, 500, 600], yTicks: [0, 50, 100], xFmt: (v) => v + '°', yFmt: (v) => v + ' %', xLabel: 'temperature of the honeycomb (°C) →' });
        curve(g, (T) => 100 * lightOff(T), 20, 600, a.X, a.Y, COL.theory, 4);
        g.strokeStyle = COL.ok; g.setLineDash([7, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(a.X(T50), a.y0); g.lineTo(a.X(T50), a.Y(50)); g.lineTo(a.x0, a.Y(50)); g.stroke(); g.setLineDash([]);
        text(g, 'light-off: 250 °C', a.X(T50) + 12, a.Y(50) + 8, COL.ok, 'bold 21px sans-serif');
        text(g, 'cold start', a.X(30), a.y0 - 14, COL.soft, '19px sans-serif');
        dot(g, a.X(S.exT), a.Y(100 * lightOff(S.exT)), COL.hill, 10);
      } else {
        title(g, 'Splitting nitrogen', 'a sketch, not to scale');
        const x0 = 60, x1 = w - 24, y0 = h - 70, y1 = 110, Y = (k) => y0 - k * (y0 - y1);
        g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y1 - 20); g.lineTo(x0, y0 + 30); g.stroke();
        // one huge hill in the gas
        g.strokeStyle = COL.hill; g.lineWidth = S.iron ? 3 : 5; g.setLineDash(S.iron ? [10, 8] : []); g.beginPath(); g.moveTo(x0, Y(0.12));
        for (let i = 0; i <= 60; i++) { const k = i / 60; g.lineTo(x0 + 60 + (x1 - x0 - 120) * k, Y(0.12 + 0.86 * Math.sin(Math.PI * k) ** 2 - 0.1 * k)); }
        g.lineTo(x1, Y(0.02)); g.stroke(); g.setLineDash([]);
        text(g, `in the gas: break N≡N, ${HABER.bond} kJ/mol`, (x0 + x1) / 2, Y(0.98) - 12, COL.hill, 'bold 21px sans-serif', 'center');
        if (S.iron) {
          g.strokeStyle = COL.cat; g.lineWidth = 5; g.beginPath(); g.moveTo(x0, Y(0.12));
          for (let i = 0; i <= 120; i++) { const k = i / 120; g.lineTo(x0 + 60 + (x1 - x0 - 120) * k, Y(0.12 - 0.1 * k + 0.13 * Math.sin(Math.PI * 5 * k) ** 2 - 0.1 * Math.sin(Math.PI * k))); }
          g.lineTo(x1, Y(0.02)); g.stroke();
          text(g, 'on iron: small steps on the surface', (x0 + x1) / 2, Y(0.3) - 4, COL.cat, 'bold 21px sans-serif', 'center');
        }
        text(g, 'N₂ + 3H₂', x0 + 8, Y(0.12) + 30, COL.soft, '20px sans-serif'); text(g, '2NH₃', x1 - 8, Y(0.02) + 30, COL.soft, '20px sans-serif', 'right');
        text(g, 'energy', x0 + 8, y1 - 26, COL.soft, '19px sans-serif');
      }
    }, [3.25, 6.25, 0]);

    const setFocus = focusSwitch(stage, G, VIEWS);
    return {
      update(dt, s, time) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        setFocus(s.focus);
        const narrow = fitNarrow(stage, []);
        showLabels(pathLabels, s.focus === 'path'); showLabels(enzLabels, s.focus === 'enzyme');
        showLabels(carLabels, s.focus === 'works' && s.plant === 'car'); showLabels(habLabels, s.focus === 'works' && s.plant === 'haber');
        placeBoard(bd, [[3.25, 6.25, 0], -0.06, 1.3], REEL, PHONE);
        if (s.focus === 'path') {
          const T = s.T + K0, on = !!s.cat;
          if (on !== catOn) { catOn = on; gas.addSites(on ? BEADS : []); gas.fill(200, 200); view.sites(); pKey = ''; }
          const k = `${s.T}|${s.Ea}|${s.EaC}|${s.run}`;
          if (k !== pKey) { pKey = k; gas.setT(T); gas.resetCounts(); gas.sites.forEach((q) => { q.uses = 0; }); }
          opt.Ea = s.Ea; opt.cat.on = on; opt.cat.Ea = s.EaC;
          gas.step(dt, opt);
          for (const e of gas.events) if (balls.length < 30) balls.push({ cat: e.path === 'cat', age: 0 });
          for (let i = balls.length - 1; i >= 0; i--) { balls[i].age += dt; if (balls[i].age > 1) balls.splice(i, 1); }
          view.draw(dt); tk.setT(T);
          lBeads.element.innerHTML = on ? `<b>${gas.sites.length}</b> catalyst beads · used <b>${fmt0(usesNow())}</b> times · still <b>${gas.sites.length}</b>` : 'no catalyst in the tank'; lBeads.element.style.setProperty('--c', COL.cat);
          lPT.element.innerHTML = `thermostat: <b>${Math.round(s.T)} °C</b>`; lPT.element.style.setProperty('--c', cssTemp(T));
          lPF.element.innerHTML = 'a white flash is one reaction';
          lPF.visible = !narrow && !inReel();
        } else if (s.focus === 'enzyme') {
          const k = `${s.sub}|${s.kcat}`;
          if (k !== eKey) { if (eKey && +eKey.split('|')[1] !== s.kcat) erec.clear(); eKey = k; eg.fill(s.sub, 0); eg.resetCounts(); busyT = 0; }
          eopt.cat.kcat = s.kcat;
          eg.step(dt, eopt);
          const busy = eg.sites.reduce((a, q) => a + (q.mol >= 0 ? 1 : 0), 0); busyT += busy * dt;
          if (eg.t > 8) erec.set(s.sub, eg.turn / eg.t);
          eview.draw(dt); etk.setT(310);
          if (eview.siteMesh) { eg.sites.forEach((q, i) => eview.siteMesh.setColorAt(i, q.mol >= 0 ? busyCol : freeCol)); if (eview.siteMesh.instanceColor) eview.siteMesh.instanceColor.needsUpdate = true; }
          lEnz.element.innerHTML = `<b>${busy}</b> of ${ENZ.length} enzymes busy`; lEnz.element.style.setProperty('--c', COL.volt);
          lSub.element.innerHTML = `<b style="color:${COL.A}">${s.sub}</b> substrate molecules, 37 °C`;
          lEF.visible = !narrow && !inReel();
        } else {
          CAR.visible = s.plant === 'car'; HB.visible = s.plant === 'haber';
          if (s.plant === 'car') {
            const X = lightOff(s.exT);
            tempColor(s.exT + K0, 300, 900, brickMat.emissive).multiplyScalar(clamp((s.exT - 150) / 450, 0, 1) * 0.5);
            for (let i = 0; i < NX; i++) {
              const p = exP[i]; p.t += dt * 0.22 * p.sp; if (p.t > 1) p.t -= 1;
              const x = -3.2 + 6.4 * p.t, ax = Math.abs(x);
              const rr = ax < 1.3 ? 0.68 : ax < 1.9 ? 0.68 - ((ax - 1.3) / 0.6) * 0.5 : 0.18;
              // inside the brick a molecule rides down one channel
              exh.place(i, x, CY + p.cy * rr, p.cz * rr, 1);
              const xc = -BL / 2 + p.u * BL;
              exh.color(i, p.k < X && x > xc ? CLEAN : DIRTY[p.kind]);
            }
            exh.done();
            lCat.element.innerHTML = `honeycomb at <b>${Math.round(s.exT)} °C</b>: <b>${pct(X)}</b> cleaned`; lCat.element.style.setProperty('--c', X > 0.9 ? COL.ok : X > 0.3 ? COL.count : COL.hill);
            if (narrow) showLabels([lIn, lOut], false);
          } else {
            const on = !!s.iron, y = on ? HABER.pass : 0;
            if (on !== ironShown) { ironShown = on; ironP.forEach((p, i) => (on ? ironD.place(i, p[0], p[1], p[2], p[3]) : ironD.hide(i))); ironD.done(); }
            for (let i = 0; i < NH; i++) {
              const p = hP[i]; p.t += dt * 0.2 * p.sp; if (p.t > 1) p.t -= 1;
              const yy = HY + HH / 2 + 0.7 - (HH + 1.4) * p.t, inPipe = p.t < 0.12 || p.t > 0.88, sq = inPipe ? 0.12 : 1;
              const made = p.k < y && p.t > p.u;                          // about 15 % of what leaves is ammonia
              hgas.place(i, p.x * sq, yy, p.z * sq, made ? 1.25 : p.n2 ? 1.3 : 0.8);
              hgas.color(i, made ? NH3C : p.n2 ? N2C : H2C);
            }
            hgas.done();
            lHout.element.innerHTML = on ? `out: about <b>15 %</b> is now <b style="color:${COL.C}">ammonia</b>` : 'out: nitrogen and hydrogen, unchanged'; lHout.element.style.setProperty('--c', on ? COL.ok : COL.hill);
            lBed.element.innerHTML = on ? 'bed of <b>iron</b> catalyst, 400 to 450 °C' : 'no catalyst: an empty vessel';
            if (narrow) showLabels([lHin, lBed], false);
          }
        }
        tDraw -= dt;
        const k2 = `${s.focus}|${s.chart}|${s.cat}|${s.T}|${s.Ea}|${s.EaC}|${s.sub}|${s.kcat}|${s.plant}|${s.exT}|${s.iron}`;
        if (k2 !== bKey || (tDraw <= 0 && s.focus !== 'works') || (s.focus === 'path' && s.chart === 'hill' && balls.length)) { bKey = k2; tDraw = 0.3; bd.redraw(); }
      },
      readout: (s) => fit(((s) => {
        if (s.focus === 'path') {
          const T = s.T + K0, on = !!s.cat, t = Math.max(gas.t, 1e-6), got = gas.t > 2;
          const th = gas.theory(s.Ea, 1, 200 - heldNow(), 200), f = boltz(s.EaC, T) / boltz(s.Ea, T);
          const r2 = (v) => (v >= 10 ? v.toFixed(1) : v.toFixed(2));
          return `<div class="big">${on ? `Catalyst: ${times(f)} more succeed` : `No catalyst: ${share(boltz(s.Ea, T))} succeed`}</div>
            <div class="row"><span>Over the ${s.Ea.toFixed(1)} kJ/mol hill</span><b>${share(boltz(s.Ea, T))}</b></div>
            ${on ? `<div class="row x"><span>Over the catalyst's ${s.EaC.toFixed(1)} kJ/mol hill</span><b>${share(boltz(s.EaC, T))} · counted ${gas.collCat > 60 ? share(gas.reactCat / gas.collCat) : '…'}</b></div>` : ''}
            <div class="row x"><span>Reactions a second, no help</span><b>counted ${got ? r2(gas.react / t) : '…'} · theory ${r2(th.rate)}</b></div>
            ${on ? `<div class="row"><span>Reactions a second, on the beads</span><b style="color:${COL.count}">counted ${got ? r2(gas.reactCat / t) : '…'}</b></div>` : ''}
            <small>${on ? 'e<sup>(Ea − Ea′) ÷ RT</sup> = e<sup>' + ((s.Ea - s.EaC) / RTk(T)).toFixed(1) + '</sup>. Only 20 beads, so they are the bottleneck: real catalysts are made with a huge surface.' : `Counted over ${Math.round(gas.t)} s: ${gas.react} reactions. Switch the catalyst on.`}</small>`;
        }
        if (s.focus === 'enzyme') {
          const t = Math.max(eg.t, 1e-6), vmax = s.kcat * ENZ.length, km = s.kcat / kOn, mm = mmRate(s.sub, s.kcat);
          return `<div class="big">${eg.t > 3 ? (eg.turn / t).toFixed(2) : '…'} a second, top speed ${num(vmax, 2)}</div>
            <div class="row"><span>Counted · Michaelis–Menten</span><b style="color:${COL.count}">${eg.t > 3 ? (eg.turn / t).toFixed(2) : '…'} · ${mm.toFixed(2)} a second</b></div>
            <div class="row"><span>Enzymes busy, on average</span><b>counted ${eg.t > 3 ? Math.round((busyT / t / ENZ.length) * 100) + ' %' : '…'} · theory ${Math.round((s.sub / (km + s.sub)) * 100)} %</b></div>
            <div class="row x"><span>Top speed, Vmax</span><b>${ENZ.length} enzymes × ${s.kcat} a second = ${num(vmax, 2)}</b></div>
            <div class="row x"><span>Half speed at, Km</span><b>${Math.round(km)} molecules</b></div>
            <small>rate = Vmax × S ÷ (Km + S). An enzyme holds one molecule at a time. Real catalase: up to 4 × 10⁷ a second each.</small>`;
        }
        if (s.plant === 'car') {
          const X = lightOff(s.exT), rr = Math.exp(((EA_CO * 1000) / R) * (1 / (150 + K0) - 1 / (s.exT + K0)));
          return `<div class="big">${X < 0.001 ? 'Almost no exhaust cleaned' : pct(X) + ' of the exhaust cleaned'}</div>
            <div class="row"><span>Honeycomb temperature</span><b>${Math.round(s.exT)} °C${s.exT < 150 ? ', cold start' : s.exT < T50 ? ', warming up' : ', lit off'}</b></div>
            <div class="row"><span>Light-off (half cleaned)</span><b>about 250 °C</b></div>
            <div class="row x"><span>Against 150 °C, the chemistry runs</span><b>${rr >= 1 ? times(rr) + ' faster' : times(1 / rr) + ' slower'}</b></div>
            <div class="row x"><span>In India</span><b>metros from 1995, BS6 from 2020</b></div>
            <small>A model curve: Arrhenius with a 100 kJ/mol hill on the metals, pinned to 50 % at 250 °C. Real converters light off at about 200 to 300 °C.</small>`;
        }
        return `<div class="big">${s.iron ? 'With iron: about 15 % ammonia per pass' : 'Without iron: no ammonia to measure'}</div>
          <div class="row x"><span>The reaction</span><b>N₂ + 3H₂ ⇌ 2NH₃</b></div>
          <div class="row"><span>The bond to break, N≡N</span><b>${HABER.bond} kJ/mol</b></div>
          <div class="row"><span>At balance (200 bar, 450 °C)</span><b>about 27 %, iron or no iron</b></div>
          <div class="row x"><span>Finding the catalyst</span><b>about 20,000 tests, from 1909</b></div>
          <small>Iron changes how fast the gas reaches its balance, not where the balance lies. Unreacted gas goes round again: see EquilibriumClear.</small>`;
      })(s)),
    };
  },
};
