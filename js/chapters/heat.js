// Chapter 2: temperature, the strongest dial. Three scenes.
// "rule": the rule of thumb "a reaction doubles its rate for every 10 °C", tested. Two tanks of the same
//   gas (the collision model of kinetics.js) sit side by side, one warmer than the other, and both
//   count their reactions. The Arrhenius equation says the warm one is faster by
//       k₂ ÷ k₁ = e^((Ea ÷ R) × (1/T₁ − 1/T₂)).
//   That is exactly 2 for a 10 °C step only when Ea = R ln 2 × T₁T₂ ÷ 10: 52.9 kJ/mol from 25 to 35 °C,
//   82 kJ/mol from 100 to 110 °C. A low hill gives much less than double, a high hill much more. The
//   rule goes back to van 't Hoff (1884), who found most reactions he knew speed up 2 to 3 times per
//   10 °C. Real hills marked on the chart (kJ/mol): NO + O₃ 12.5 (NASA/JPL evaluation 2019);
//   hydrogen peroxide breaking down, with iodide 56.5 and alone 75 (Moelwyn-Hughes; as tabulated in
//   LibreTexts "The Catalytic Decomposition of Hydrogen Peroxide" and RSC Education "Investigating
//   activation energies"); lentils softening 86.5 (firmness of cooked lentils, Int. J. Food Sci.
//   Technol. 30, 215, 1995); cane sugar splitting in acid 109 (Tombari et al., J. Phys. Chem. B 2007,
//   109.2 kJ/mol). The counted speed-up in a tank also includes collision theory's √(T₂/T₁) for the
//   extra collisions, a 1.7 % effect for 25 → 35 °C, and the readout says so.
//   With a hill of 53 kJ/mol at 25 °C only one collision in two billion succeeds. A dot in the tank
//   collides about once a second, so nothing is seen: real gases manage because each molecule collides
//   about 7 × 10⁹ times a second.
// "bowl": one bowl of milk moved between freezer, fridge and kitchen. The same equation with one hill
//   gives how many times slower the chemistry of spoiling runs in the cold. Spoiling is many
//   reactions and living microbes, so the hill is a dial here: 40 to 120 kJ/mol covers typical food
//   changes (their Q10, the speed-up per 10 °C, is mostly 2 to 3). Dahi mode uses an apparent hill of
//   60 kJ/mol, pinned so that curd sets in 5 hours at 42 °C as in CurdClear; above about 45 °C the
//   bacteria suffer and the simple rule fails (chapter 5).
// "cooker": cooking is chemistry in water, and water cannot get hotter than its boiling point. Open
//   pot at sea level 100 °C, in Leh (3,524 m) about 88 °C, pressure cooker about 120 °C, cooker in Leh
//   about 114 °C (BoilClear's figures). With the lentil hill of 86.5 kJ/mol, 120 °C cooks 4.1 times
//   faster than 100 °C and 88 °C is 2.5 times slower. The "40 minutes in an open pot at sea level"
//   is a round figure for unsoaked dal, used only as the yardstick.
import { M, box, clamp, approach } from '../kit.js';
import {
  THREE, Gas, R, K0, TAU, boltz, speedUp, eaToDouble, COL, hex, share, times, num, fmtDur, board, panelBg, title, axes, line, curve, dot, ring, text, clip,
  tank, gasView, dots, thermometer, tempColor, cssTemp, rng, fitNarrow, placeBoard, fit, focusSwitch, showLabels, inReel,
} from '../rate.js';

const VIEWS = {
  rule: { pos: [0.2, 3.5, 10.6], target: [0.2, 3.25, 0] },
  bowl: { pos: [0.2, 3.5, 10.6], target: [0.2, 3.25, 0] },
  cooker: { pos: [0.2, 3.5, 10.6], target: [0.2, 3.25, 0] },
};
const REEL = [[0, 7.5, 0], 0, 2], PHONE = [[0, -1.6, 1.2], 0, 1.35];
// Real hills for the chart, kJ/mol (sources above).
export const HILLS = [
  { Ea: 12.5, n: 'NO + O₃' }, { Ea: 56.5, n: 'peroxide + iodide' }, { Ea: 75, n: 'peroxide alone' }, { Ea: 86.5, n: 'dal softening' }, { Ea: 109, n: 'sugar in acid' },
];
const PLACES = [
  { T: -18, n: 'freezer' }, { T: 4, n: 'fridge' }, { T: 15, n: 'winter kitchen' }, { T: 25, n: 'room' }, { T: 35, n: 'summer kitchen' }, { T: 42, n: 'warm spot' },
];
const placeName = (T) => PLACES.reduce((a, p) => (Math.abs(p.T - T) < Math.abs(a.T - T) ? p : a), PLACES[0]).n;
const DAHI = { Ea: 60, T0: 42, h0: 5 };                 // sets in 5 h at 42 °C
const ratio = (Ea, Ta, Tb) => Math.exp(((Ea * 1000) / R) * (1 / (Ta + K0) - 1 / (Tb + K0)));   // k(Tb) ÷ k(Ta), °C
export const POTS = {
  leh: { n: 'Open pot in Leh', T: 88, lid: false, note: '3,524 m up: thin air, water boils at 88 °C' },
  sea: { n: 'Open pot in Mumbai', T: 100, lid: false, note: 'sea level: water boils at 100 °C' },
  cook: { n: 'Pressure cooker', T: 120, lid: true, note: 'about 2 atmospheres inside: water boils at 120 °C' },
  lehcook: { n: 'Cooker in Leh', T: 114, lid: true, note: 'the cooker adds its pressure to Leh’s thin air: about 114 °C' },
};
const DAL = { Ea: 86.5, min: 40 };

export default {
  id: 'heat',
  short: 'Hot and cold',
  title: 'Temperature: the fridge, the dahi and the pressure cooker',
  subtitle: 'A few degrees change the rate a lot. Test the "doubles every 10 °C" rule, then use it in the kitchen.',
  view: VIEWS.rule,
  learn: `<p>Warm a gas by 10 °C and its molecules move only about 2 % faster. So why do reactions speed up so much? Because what matters is not the average molecule but the <b>fast tail</b>: the few collisions hard enough to clear the hill. A small rise in temperature makes that tail <b>much</b> fatter. That is the e<sup>−Ea ÷ RT</sup> in the <b>Arrhenius equation</b>.</p>
    <p>There is a famous rule of thumb: <b>a reaction doubles its rate for every 10 °C</b>. Test it in the two tanks. With a low hill the warm tank is only a little faster. The rule is right only when the hill is about <b>53 kJ/mol</b> near room temperature. A hill of 100 kJ/mol gives almost four times. Many everyday reactions have hills of 50 to 100 kJ/mol, which is why the rule works so often, but it is a rule of thumb, not a law.</p>
    <p><b>The fridge.</b> Food spoils by chemistry, much of it done by microbes. At 4 °C that chemistry runs many times slower than on a 30 °C counter, so milk keeps for days instead of hours (see FridgeClear). A freezer at −18 °C slows it hundreds of times.</p>
    <p><b>Dahi.</b> The bacteria that set curd work faster when warm. A pot that sets in 5 hours in a warm spot at 42 °C needs most of a day at 25 °C, and on a winter night it may not set by morning. That is why dahi sets quickly in May and slowly in January (see CurdClear).</p>
    <p><b>The pressure cooker.</b> Water in an open pot cannot get hotter than 100 °C, however high the flame. Seal the pot and the pressure pushes the boiling point to about <b>120 °C</b>. Just 20 degrees more makes dal soften about <b>four times faster</b>. In <b>Leh</b>, water boils at only 88 °C and an open pot takes hours (see BoilClear).</p>
    <p class="tip"><b>Try it:</b> in <b>10 °C rule</b>, slide the hill from 10 up to 53 and on to 110 kJ/mol and read the speed-up. Below about 25 kJ/mol the two tanks count it for you. Then make the step 100 °C with a hill of 7 kJ/mol and watch the warm tank count twice as fast, as the equation says. In <b>Milk bowl</b>, carry the bowl from the summer kitchen to the fridge. In <b>Cooker</b>, compare Leh, Mumbai and the cooker.</p>`,
  terms: [
    { t: 'Kelvin (K)', d: 'Temperature counted from absolute zero: K = °C + 273.15. The Arrhenius equation needs kelvin.' },
    { t: 'The 10 °C rule', d: 'A rule of thumb that rates double for each 10 °C. True only for hills near 53 kJ/mol at room temperature.' },
    { t: 'Q10', d: 'How many times faster a process runs when it is 10 °C warmer. Biologists use it; for living things it is often 2 to 3.' },
    { t: 'Arrhenius plot', d: 'A graph of ln k against 1 ÷ T. It is a straight line, and its slope is −Ea ÷ R, so it measures the hill.' },
    { t: 'Boiling point', d: 'The temperature at which a liquid boils. It rises with pressure, which is how a pressure cooker gets water to 120 °C.' },
  ],
  defaults: { focus: 'rule', T: 25, dT: 10, Ea: 12.5, chart: 'factor', ff: 4, bowlT: 30, food: 'milk', foodEa: 80, pot: 'sea' },
  controls: [
    { key: 'focus', type: 'seg', label: 'Look at', options: [{ v: 'rule', label: '10 °C rule' }, { v: 'bowl', label: 'Milk bowl' }, { v: 'cooker', label: 'Cooker' }] },
    { key: 'Ea', type: 'range', label: 'Rule: height of the hill, Ea', min: 5, max: 150, step: 0.5, ends: ['5 kJ/mol', '150 kJ/mol'], fmt: (v) => `${v.toFixed(1)} kJ/mol` },
    { key: 'T', type: 'range', label: 'Rule: temperature of the cool tank', min: 0, max: 300, step: 5, ends: ['0 °C', '300 °C'], fmt: (v) => `${v} °C = ${Math.round(v + K0)} K` },
    { key: 'dT', type: 'seg', label: 'Rule: the warm tank is hotter by', options: [{ v: 10, label: '10 °C' }, { v: 50, label: '50 °C' }, { v: 100, label: '100 °C' }] },
    { key: 'ff', type: 'seg', label: 'Rule: run the tanks', options: [{ v: 1, label: 'At normal speed' }, { v: 4, label: '4× fast' }, { v: 12, label: '12× fast' }], fmt: () => 'faster tanks count sooner' },
    { key: 'chart', type: 'seg', label: 'Rule: chart', options: [{ v: 'factor', label: 'Speed-up vs hill' }, { v: 'line', label: 'Arrhenius plot' }] },
    { key: 'bowlT', type: 'range', label: 'Bowl: where it stands', min: -18, max: 45, step: 1, ends: ['−18 °C freezer', '45 °C'], fmt: (v) => `${v} °C · ${placeName(v)}` },
    { key: 'food', type: 'seg', label: 'Bowl: what is in it', options: [{ v: 'milk', label: 'Milk going off' }, { v: 'dahi', label: 'Dahi setting' }] },
    { key: 'foodEa', type: 'range', label: 'Bowl: hill of the spoiling chemistry', min: 40, max: 120, step: 1, ends: ['40 kJ/mol', '120 kJ/mol'], fmt: (v) => `${v} kJ/mol`, hint: 'Food changes mostly lie between 50 and 100 kJ/mol. Dahi uses 60.' },
    { key: 'pot', type: 'seg', label: 'Cooker: which pot', options: Object.entries(POTS).map(([v, p]) => ({ v, label: p.n })), fmt: (v) => `${POTS[v].T} °C` },
  ],
  quiz: [
    { q: 'Reaction X has a hill of 53 kJ/mol and reaction Y a hill of 106 kJ/mol. Both are warmed from 25 °C to 35 °C. What happens?', options: ['Both double', 'X doubles, Y goes about four times faster', 'X doubles, Y does not change', 'Y doubles, X goes four times faster'], answer: 1, why: 'The speed-up is e^(Ea × constant). A hill of 53 kJ/mol gives ×2 for this step, so twice the hill gives 2 × 2 = ×4. Higher hills are more sensitive to temperature.' },
    { q: 'Why does milk keep for days in a fridge but turn in hours on a summer counter?', options: ['The fridge is dark', 'Cold slows the chemistry of spoiling many times over', 'The fridge removes oxygen', 'Cold kills all the bacteria'], answer: 1, why: 'At 4 °C the reactions of spoiling, and the microbes that drive them, run many times slower than at 30 °C. Cold does not kill most bacteria; it slows them.' },
    { q: 'How does a pressure cooker cook dal faster?', options: ['Its flame is hotter', 'High pressure pushes water into the dal', 'Water boils at about 120 °C inside, and the extra 20 °C makes the softening reactions about four times faster', 'The whistle stirs the dal'], answer: 2, why: 'In an open pot the water is stuck at 100 °C. Under about 2 atmospheres it reaches 120 °C, and for a hill of about 87 kJ/mol that is roughly a fourfold speed-up.' },
  ],
  reel: [
    { ms: 5600, caption: '"Rates double every 10 °C" is only true when the hill is about 53 kJ/mol. Lower hills gain less, higher hills gain more.', set: { focus: 'rule', T: 25, dT: 10, chart: 'factor', ff: 1 }, anim: { Ea: [8, 110] }, view: { pos: [0, 5.3, 7.2], target: [0, 5.0, 0] }, spin: 0 },
    { ms: 5400, caption: 'A pressure cooker holds water at 120 °C, not 100. That 20 °C makes dal cook about four times faster.', set: { focus: 'cooker', pot: 'cook' }, anim: {}, view: { pos: [0, 5.0, 6.6], target: [0, 4.7, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const bench = box(7.2, 0.1, 3.6, M.matte(0x2b3039)); bench.position.set(0, 0.05, 0); root.add(bench);
    const G = { rule: new THREE.Group(), bowl: new THREE.Group(), cooker: new THREE.Group() };
    Object.values(G).forEach((g) => root.add(g));
    const rnd = rng(21);

    // ================================================================ rule: two tanks
    const mk = (seed, x) => {
      const gas = new Gas({ n: 240, box: [2.6, 2.4, 1.8], r: 0.08, s300: 1.6, seed, T: 300 });
      const tk = tank(G.rule, gas, [x, 2.05, 0]);
      const leg = box(2.2, 0.55, 1.6, M.matte(0x23272f)); leg.position.set(x, 0.375, 0); G.rule.add(leg);
      return { gas, tk, view: gasView(tk, gas), x };
    };
    const cool = mk(3, -1.62), warm = mk(9, 1.62);
    const lCool = stage.label('', [cool.x, 3.75, 0.9], G.rule, 'hot'), lWarm = stage.label('', [warm.x, 3.75, 0.9], G.rule, 'hot');
    const lCoolN = stage.label('', [cool.x, 0.42, 1.2], G.rule), lWarmN = stage.label('', [warm.x, 0.42, 1.2], G.rule);
    const ruleLabels = [lCool, lWarm, lCoolN, lWarmN];
    const opt = { Ea: 12.5, EaBack: null, steric: 1, mode: 'steady', cat: null };
    let ruleKey = '';
    const counted = () => {
      const a = cool.gas, b = warm.gas;
      if (a.react < 25 || b.react < 25 || a.t < 3) return null;
      const r = (b.react / b.t) / (a.react / a.t);
      return { r, err: r * Math.sqrt(1 / a.react + 1 / b.react) };
    };

    // ================================================================ bowl
    const B = new THREE.Group(); B.scale.setScalar(1.4); B.position.y = 0.1 - 0.14; G.bowl.add(B);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 2.7), new THREE.MeshBasicMaterial({ color: 0x223044, toneMapped: false }));
    back.position.set(0, 1.5, -1.2); B.add(back);
    const bowlPts = []; for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI / 2; bowlPts.push(new THREE.Vector2(1.25 * Math.sin(a) + 0.02, 0.85 * (1 - Math.cos(a)))); }
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlPts, 48), M.metal(0xc9ced6, { roughness: 0.25, side: THREE.DoubleSide })); bowl.position.set(0, 0.12, 0); bowl.castShadow = true; B.add(bowl);
    const milkMat = new THREE.MeshStandardMaterial({ color: 0xf6f3ea, roughness: 0.35 });
    const milk = new THREE.Mesh(new THREE.CylinderGeometry(1.13, 1.13, 0.03, 48), milkMat); milk.position.set(0, 0.72, 0); B.add(milk);
    const NB = 70, bugs = dots(NB, 0.045, 0xffffff); B.add(bugs);
    const bug = Array.from({ length: NB }, () => { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 1.0; return { x: r * Math.cos(a), z: r * Math.sin(a), f: 0 }; });
    const thB = thermometer(B, -2.3, 0.35, 0.3, 2.2);
    // the reaction's clock: a dial whose hand turns at the speed of the chemistry
    const clock = new THREE.Group(); clock.position.set(2.45, 1.75, 0.2); B.add(clock);
    const rimC = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.14, 48), M.plastic(0x1f232b)); rimC.rotation.x = Math.PI / 2; clock.add(rimC);
    const faceC = new THREE.Mesh(new THREE.CircleGeometry(0.86, 48), new THREE.MeshBasicMaterial({ color: 0xf4f1ea, toneMapped: false })); faceC.position.z = 0.075; clock.add(faceC);
    for (let i = 0; i < 12; i++) { const t = box(0.04, 0.14, 0.01, new THREE.MeshBasicMaterial({ color: 0x1b1d22 })); const a = (i / 12) * TAU; t.position.set(0.72 * Math.sin(a), 0.72 * Math.cos(a), 0.085); t.rotation.z = -a; clock.add(t); }
    const hand = new THREE.Group(); hand.position.z = 0.1; clock.add(hand);
    const hm = box(0.06, 0.68, 0.02, new THREE.MeshBasicMaterial({ color: 0xc0392b })); hm.position.y = 0.3; hand.add(hm);
    const lPlace = stage.label('', [0, 2.55, -1.1], B, 'hot'), lClock = stage.label('', [2.45, 0.55, 0.4], B), lBowl = stage.label('', [0, 0.25, 1.5], B);
    const bowlLabels = [lPlace, lClock, lBowl];
    const foodEa = (s) => (s.food === 'dahi' ? DAHI.Ea : s.foodEa);
    // hours for the change: milk "turns in 6 h at 30 °C" as the yardstick; dahi sets in 5 h at 42 °C
    const hoursAt = (s, T) => (s.food === 'dahi' ? DAHI.h0 * ratio(DAHI.Ea, T, DAHI.T0) : 6 * ratio(s.foodEa, T, 30));

    // ================================================================ cooker
    const K = new THREE.Group(); K.scale.setScalar(1.4); K.position.y = -0.04; G.cooker.add(K);
    const stove = box(3.2, 0.3, 2.6, M.matte(0x1f232b)); stove.position.set(0, 0.25, 0); K.add(stove);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 10, 40), M.metal(0x8a8f99)); ringB.rotation.x = Math.PI / 2; ringB.position.set(0, 0.46, 0); K.add(ringB);
    const flames = [];
    for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; const f = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 8), M.glow(0x4aa8ff)); f.position.set(0.62 * Math.cos(a), 0.62, 0.62 * Math.sin(a)); K.add(f); flames.push(f); }
    const potY = 0.8, potH = 1.5, potR = 1.05;
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(potR, potR, potH, 48, 1, true), M.clear(0xd8dde6, 0.2, { metalness: 0.4 })); pot.position.set(0, potY + potH / 2, 0); K.add(pot);
    const potBase = new THREE.Mesh(new THREE.CylinderGeometry(potR, potR, 0.08, 48), M.metal(0xb9bec8)); potBase.position.set(0, potY, 0); K.add(potBase);
    const potRim = new THREE.Mesh(new THREE.TorusGeometry(potR, 0.04, 8, 48), M.metal(0xb9bec8)); potRim.rotation.x = Math.PI / 2; potRim.position.set(0, potY + potH, 0); K.add(potRim);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(potR - 0.04, potR - 0.04, 0.95, 40), M.clear(0x5aa7e8, 0.3)); water.position.set(0, potY + 0.52, 0); K.add(water);
    const lid = new THREE.Group(); lid.position.set(0, potY + potH, 0); K.add(lid);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(potR + 0.02, 40, 12, 0, TAU, 0, Math.PI / 2), M.metal(0xb9bec8, { roughness: 0.3 })); dome.scale.y = 0.28; lid.add(dome);
    const wt = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.26, 20), M.metal(0x2b2f38, { roughness: 0.5 })); wt.position.y = 0.42; lid.add(wt);
    const hdl = box(1.5, 0.14, 0.26, M.plastic(0x15171c)); hdl.position.set(1.6, 0.1, 0); lid.add(hdl);
    const ND = 130, dal = dots(ND, 0.055, 0xf2c14e); K.add(dal);
    const dalP = Array.from({ length: ND }, () => { const a = rnd() * TAU, r = Math.sqrt(rnd()) * (potR - 0.2); return { a, r, ph: rnd() * TAU, sp: 0.6 + rnd() }; });
    const NS = 40, steam = dots(NS, 0.09, 0xdfe9f5); K.add(steam);
    const stP = Array.from({ length: NS }, () => ({ t: rnd(), x: (rnd() - 0.5) * 1.4, z: (rnd() - 0.5) * 1.4 }));
    const thK = thermometer(K, -2.2, 0.5, 0.3, 2.4);
    const lPot = stage.label('', [0, potY + potH + 1.0, 0.6], K, 'hot'), lDal = stage.label('', [0, potY + 0.2, 1.4], K), lTh = stage.label('', [-2.2, 3.25, 0.3], K);
    const potLabels = [lPot, lDal, lTh];
    let cook = 0, potT = 100, hold = 0;
    const dalHard = new THREE.Color(0xd98c12), dalSoft = new THREE.Color(0xffe38a), cc = new THREE.Color();

    // ================================================================ board
    let S = null, tDraw = 0, bKey = '';
    const bd = board(root, 3.4, 2.45, 640, 460, (g, w, h) => {
      panelBg(g, w, h); if (!S) return;
      if (S.focus === 'rule') {
        const T1 = S.T + K0, T2 = T1 + S.dT;
        if (S.chart === 'factor') {
          title(g, `Speed-up for +${S.dT} °C`, `from ${S.T} °C`);
          const yMax = S.dT === 10 ? 6 : S.dT === 50 ? 1000 : 1e5, log = S.dT !== 10;
          const a = axes(g, w, h, { xMax: 150, yMin: log ? 1 : 0, yMax, yLog: log, xTicks: [0, 50, 100, 150], yTicks: log ? (S.dT === 50 ? [1, 10, 100, 1000] : [1, 10, 100, 1e3, 1e4, 1e5]) : [1, 2, 3, 4, 5, 6], yFmt: (v) => '×' + (v >= 1e4 ? '10' + (v >= 1e5 ? '⁵' : '⁴') : v), xLabel: 'height of the hill, Ea (kJ/mol) →' });
          clip(g, a, () => curve(g, (E) => speedUp(E, T1, S.dT), 0, 150, a.X, a.Y, COL.theory, 4));
          const ed = eaToDouble(T1, S.dT);
          g.strokeStyle = COL.ok; g.lineWidth = 2; g.setLineDash([7, 6]); g.beginPath(); g.moveTo(a.x0, a.Y(2)); g.lineTo(a.X(Math.min(150, ed)), a.Y(2)); g.lineTo(a.X(Math.min(150, ed)), a.y0); g.stroke(); g.setLineDash([]);
          text(g, `×2 needs ${ed.toFixed(ed < 20 ? 1 : 0)} kJ/mol`, a.x0 + 12, a.y1 + 22, COL.ok, 'bold 23px sans-serif');
          HILLS.forEach((hl, i) => { const y = a.Y(Math.min(yMax, speedUp(hl.Ea, T1, S.dT))); ring(g, a.X(hl.Ea), y, 'rgba(255,255,255,.75)', 7); if (!log) text(g, hl.n, a.X(hl.Ea) + (i === 4 ? -12 : 10), y + (i === 4 ? -14 : 22), COL.soft, '17px sans-serif', i === 4 ? 'right' : 'left'); });
          const c = counted();
          if (c) { g.fillStyle = COL.count; g.fillRect(a.X(S.Ea) - 16, a.Y(clamp(c.r, log ? 1 : 0, yMax)) - 2, 32, 4); text(g, 'counted', a.X(S.Ea) + 20, a.Y(clamp(c.r, log ? 1 : 0, yMax)) + 24, COL.count, 'bold 19px sans-serif'); }
          dot(g, a.X(S.Ea), a.Y(Math.min(yMax, speedUp(S.Ea, T1, S.dT))), COL.hill, 10);
        } else {
          title(g, 'Arrhenius plot', 'ln k against 1 ÷ T is a straight line');
          const x1 = 1000 / 250, x0 = 1000 / 700, slope = -(S.Ea * 1000) / R / 1000;      // per (1000/T)
          const yA = 0, f = (x) => yA + slope * (x - x0), yMin = Math.min(-2, f(x1));
          const a = axes(g, w, h, { xMin: x0, xMax: x1, yMin, yMax: 0.5, xTicks: [1.5, 2, 2.5, 3, 3.5, 4], yTicks: [], xLabel: '1000 ÷ T (cold →)', yLabel: 'ln k' });
          line(g, [[x0, f(x0)], [x1, f(x1)]], a.X, a.Y, COL.theory, 4);
          for (const [TT, c, n] of [[T1, COL.cool, `${S.T} °C`], [T2, COL.hot, `${S.T + S.dT} °C`]]) { const x = clamp(1000 / TT, x0, x1); dot(g, a.X(x), a.Y(f(x)), c, 10); text(g, n, a.X(x) + 12, a.Y(f(x)) - 12, c, 'bold 21px sans-serif'); }
          text(g, `slope = −Ea ÷ R = −${num((S.Ea * 1000) / R, 3)} K`, w - 30, a.y1 + 24, COL.hill, 'bold 23px sans-serif', 'right');
          text(g, 'steeper line = higher hill', w - 30, a.y1 + 54, COL.soft, '20px sans-serif', 'right');
        }
      } else if (S.focus === 'bowl') {
        const dahi = S.food === 'dahi';
        title(g, dahi ? 'Hours for dahi to set' : 'Hours for milk to turn', 'log scale');
        const a = axes(g, w, h, { xMin: -18, xMax: 45, yMin: 1, yMax: 10000, yLog: true, xTicks: [-18, 4, 15, 25, 35, 45], yTicks: [1, 10, 100, 1000, 10000], xFmt: (v) => v + '°', yFmt: (v) => (v >= 1000 ? v / 1000 + 'k' : v) + ' h', xLabel: 'temperature (°C) →' });
        clip(g, a, () => curve(g, (T) => hoursAt(S, T), -18, 45, a.X, a.Y, COL.theory, 4));
        for (const p of PLACES) { const y = a.Y(clamp(hoursAt(S, p.T), 1, 10000)); ring(g, a.X(p.T), y, 'rgba(255,255,255,.7)', 7); }
        text(g, 'freezer', a.X(-18) + 10, a.Y(clamp(hoursAt(S, -18), 1, 10000)) + 30, COL.soft, '18px sans-serif');
        text(g, 'fridge', a.X(4) + 10, a.Y(clamp(hoursAt(S, 4), 1, 10000)) - 10, COL.soft, '18px sans-serif');
        dot(g, a.X(S.bowlT), a.Y(clamp(hoursAt(S, S.bowlT), 1, 10000)), COL.hill, 10);
        text(g, `hill ${foodEa(S)} kJ/mol`, w - 30, a.y1 + 24, COL.hill, 'bold 23px sans-serif', 'right');
      } else {
        title(g, 'Minutes to cook dal', 'against the water’s temperature');
        const tm = (T) => DAL.min * ratio(DAL.Ea, T, 100);
        const a = axes(g, w, h, { xMin: 80, xMax: 125, yMax: 200, xTicks: [80, 90, 100, 110, 120], yTicks: [0, 50, 100, 150, 200], xFmt: (v) => v + '°', xLabel: 'temperature of the water (°C) →' });
        clip(g, a, () => curve(g, tm, 80, 125, a.X, a.Y, COL.theory, 4));
        Object.entries(POTS).forEach(([k, p]) => { if (k === S.pot) return; ring(g, a.X(p.T), a.Y(tm(p.T)), 'rgba(255,255,255,.7)', 7); });
        text(g, 'Leh', a.X(88) + 12, a.Y(tm(88)) - 6, COL.soft, '19px sans-serif'); text(g, 'sea level', a.X(100) + 10, a.Y(tm(100)) - 10, COL.soft, '19px sans-serif'); text(g, 'cooker', a.X(120) - 10, a.Y(tm(120)) - 16, COL.soft, '19px sans-serif', 'right');
        dot(g, a.X(POTS[S.pot].T), a.Y(tm(POTS[S.pot].T)), COL.hill, 10);
        text(g, `hill ${DAL.Ea} kJ/mol`, w - 30, a.y1 + 24, COL.hill, 'bold 23px sans-serif', 'right');
      }
    }, [3.25, 6.25, 0]);

    const setFocus = focusSwitch(stage, G, VIEWS);
    return {
      update(dt, s, time) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        setFocus(s.focus);
        const narrow = fitNarrow(stage, []);
        showLabels(ruleLabels, s.focus === 'rule'); showLabels(bowlLabels, s.focus === 'bowl'); showLabels(potLabels, s.focus === 'cooker');
        placeBoard(bd, [[3.25, 6.25, 0], -0.06, 1.3], REEL, PHONE);
        if (s.focus === 'rule') {
          const T1 = s.T + K0, T2 = T1 + s.dT, k = `${s.T}|${s.dT}|${s.Ea}`;
          if (k !== ruleKey) { ruleKey = k; cool.gas.setT(T1); warm.gas.setT(T2); cool.gas.fill(120, 120); warm.gas.fill(120, 120); cool.gas.resetCounts(); warm.gas.resetCounts(); }
          opt.Ea = s.Ea;
          for (const q of [cool, warm]) { for (let i = 0; i < (s.ff || 1); i++) q.gas.step(dt, opt); q.view.draw(dt); q.tk.setT(q.gas.T, 273, 673); }
          const lab = (q, l, n) => {
            l.element.innerHTML = `${n}: <b>${Math.round(q.gas.T - K0)} °C</b>`; l.element.style.setProperty('--c', cssTemp(q.gas.T, 273, 673));
          };
          lab(cool, lCool, 'cool tank'); lab(warm, lWarm, 'warm tank');
          const cnt = (q) => (q.gas.t < 2 ? 'counting…' : q.gas.react ? `<b>${(q.gas.react / q.gas.t).toFixed(q.gas.react / q.gas.t < 10 ? 2 : 1)}</b> reactions a second` : 'no reaction seen yet');
          lCoolN.element.innerHTML = cnt(cool); lWarmN.element.innerHTML = cnt(warm);
          if (narrow) showLabels([lCoolN, lWarmN], false);
        } else if (s.focus === 'bowl') {
          const T = s.bowlT + K0, rel = ratio(foodEa(s), 45, s.bowlT);          // speed against the fastest setting
          tempColor(T, 250, 325, back.material.color).multiplyScalar(0.16);
          thB.set((s.bowlT + 25) / 75); thB.tint(tempColor(T, 250, 325, cc));
          hand.rotation.z -= dt * rel * 5;
          const jig = 0.25 * Math.sqrt(T / 300);
          for (let i = 0; i < NB; i++) {
            const b = bug[i];
            b.x += (rnd() - 0.5) * jig * dt * 4; b.z += (rnd() - 0.5) * jig * dt * 4;
            const rr = Math.hypot(b.x, b.z); if (rr > 1.02) { b.x *= 1.02 / rr; b.z *= 1.02 / rr; }
            if (rnd() < rel * dt * 1.2) b.f = 0.6;
            b.f = Math.max(0, b.f - dt);
            bugs.place(i, b.x, 0.76, b.z, 1 + 2 * b.f); cc.setHex(s.food === 'dahi' ? 0x6fb6ff : 0xffb547).lerp(new THREE.Color(0xffffff), clamp(b.f * 2, 0, 1)); bugs.color(i, cc);
          }
          bugs.done();
          const frozen = s.bowlT < 0;
          milkMat.color.setHex(frozen ? 0xdfeaf5 : 0xf6f3ea);
          lPlace.element.innerHTML = `${placeName(s.bowlT)}: <b>${s.bowlT} °C</b>`; lPlace.element.style.setProperty('--c', cssTemp(T, 250, 325));
          lClock.element.innerHTML = 'the chemistry’s clock';
          lBowl.element.innerHTML = s.food === 'dahi' ? 'each flash: bacteria make a little acid' : 'each flash: a little more spoiling';
          if (narrow) showLabels([lClock, lBowl], false);
        } else {
          const p = POTS[s.pot];
          potT = approach(potT, p.T, 2.5, dt);
          lid.visible = p.lid;
          const rate = ratio(DAL.Ea, 100, p.T);
          // one batch of dal: 40 minutes at 100 °C plays in 14 seconds
          if (hold > 0) { hold -= dt; if (hold <= 0) cook = 0; } else { cook += (dt * rate) / 14; if (cook >= 1) { cook = 1; hold = 1.6; } }
          for (let i = 0; i < ND; i++) {
            const d = dalP[i], bob = 0.12 + 0.3 * Math.abs(Math.sin(time * d.sp * 1.6 + d.ph));
            dal.place(i, d.r * Math.cos(d.a + time * 0.15 * d.sp), potY + 0.1 + bob, d.r * Math.sin(d.a + time * 0.15 * d.sp), 1 + 0.25 * cook);
            dal.color(i, cc.copy(dalHard).lerp(dalSoft, clamp(cook * 1.1 - 0.1 * (i % 5) / 5, 0, 1)));
          }
          dal.done();
          for (let i = 0; i < NS; i++) {
            const q = stP[i]; q.t += dt * (p.lid ? 1.6 : 0.5);
            if (q.t > 1) { q.t -= 1; q.x = (rnd() - 0.5) * (p.lid ? 0.1 : 1.5); q.z = (rnd() - 0.5) * (p.lid ? 0.1 : 1.5); }
            const y0 = potY + potH + (p.lid ? 0.55 : -0.3);
            if (p.lid && (i % 3 || Math.sin(time * 1.3) < 0.5)) { steam.hide(i); continue; }
            steam.place(i, q.x * (1 + q.t), y0 + q.t * 1.4, q.z * (1 + q.t), (0.5 + q.t) * (1 - q.t) * 2);
          }
          steam.done();
          flames.forEach((f, i) => { f.scale.y = 0.8 + 0.3 * Math.sin(time * 9 + i); });
          thK.set((potT - 60) / 70); thK.tint(tempColor(potT + K0, 330, 400, cc));
          lPot.element.innerHTML = `${p.n}: water at <b>${Math.round(potT)} °C</b>`; lPot.element.style.setProperty('--c', cssTemp(p.T + K0, 340, 400));
          lDal.element.innerHTML = cook >= 1 ? '<b>dal cooked</b>' : `dal softening: <b>${Math.round(cook * 100)} %</b>`;
          lTh.element.innerHTML = `${Math.round(potT)} °C`;
          if (narrow) showLabels([lTh], false);
        }
        tDraw -= dt;
        const k2 = `${s.focus}|${s.chart}|${s.T}|${s.dT}|${s.Ea}|${s.bowlT}|${s.food}|${s.foodEa}|${s.pot}`;
        if (k2 !== bKey || (tDraw <= 0 && s.focus === 'rule')) { bKey = k2; tDraw = 0.5; bd.redraw(); }
      },
      readout: (s) => fit(((s) => {
        if (s.focus === 'rule') {
          const T1 = s.T + K0, T2 = T1 + s.dT, f = speedUp(s.Ea, T1, s.dT), c = counted(), root2 = Math.sqrt(T2 / T1);
          const verdict = s.dT !== 10 ? '' : f < 1.8 ? 'Less than double: the hill is too low for the rule.' : f <= 2.25 ? 'About double: the rule of thumb holds for this hill.' : f <= 3.2 ? 'More than double: between ×2 and ×3, as van ’t Hoff found for many reactions.' : 'Far more than double: the hill is too high for the rule.';
          return `<div class="big">+${s.dT} °C makes it ${f < 100 ? '×' + f.toFixed(2) : times(f)}</div>
            <div class="row"><span>Hill, Ea</span><b>${s.Ea.toFixed(1)} kJ/mol</b></div>
            <div class="row x"><span>Clearing the hill at ${s.T} °C</span><b>${share(boltz(s.Ea, T1))}</b></div>
            <div class="row x"><span>Clearing the hill at ${s.T + s.dT} °C</span><b>${share(boltz(s.Ea, T2))}</b></div>
            <div class="row"><span>Counted in the tanks</span><b style="color:${COL.count}">${c ? `×${c.r.toFixed(2)} ± ${c.err.toFixed(2)}` : boltz(s.Ea, T2) < 2e-4 ? 'too rare to see here' : 'counting…'}</b></div>
            <div class="row x"><span>Expected in the tanks</span><b>×${(f * root2).toFixed(2)} (with ${((root2 - 1) * 100).toFixed(1)} % more collisions)</b></div>
            <div class="row"><span>A hill that exactly doubles</span><b>${eaToDouble(T1, s.dT).toFixed(1)} kJ/mol</b></div>
            <small>${verdict}${!c && boltz(s.Ea, T2) < 2e-4 ? ' The tanks cannot show a hill this high. To watch a doubling being counted, set the step to 100 °C and the hill to 7 kJ/mol.' : ''}</small>`;
        }
        if (s.focus === 'bowl') {
          const dahi = s.food === 'dahi', h = hoursAt(s, s.bowlT), Ea = foodEa(s);
          const q10 = ratio(Ea, s.bowlT, s.bowlT + 10);
          if (dahi) return `<div class="big">Dahi sets in about ${fmtDur(h * 60)}</div>
            <div class="row"><span>The bowl is at</span><b>${s.bowlT} °C, ${placeName(s.bowlT)}</b></div>
            <div class="row"><span>Against a 42 °C warm spot (5 hours)</span><b>${times(h / DAHI.h0)} slower</b></div>
            <div class="row x"><span>Speed-up for the next 10 °C (Q10)</span><b>×${q10.toFixed(2)}</b></div>
            <small>Arrhenius with an apparent hill of 60 kJ/mol. Above about 45 °C real curd bacteria start to suffer: see the last chapter.</small>`;
          return `<div class="big">${s.bowlT === 30 ? 'The yardstick: 6 hours at 30 °C' : `${times(h / 6 >= 1 ? h / 6 : 6 / h)} ${h >= 6 ? 'slower' : 'faster'} than at 30 °C`}</div>
            <div class="row"><span>The bowl is at</span><b>${s.bowlT} °C, ${placeName(s.bowlT)}</b></div>
            <div class="row"><span>A change that takes 6 h at 30 °C takes</span><b>${fmtDur(h * 60)}</b></div>
            <div class="row"><span>In the fridge at 4 °C</span><b>${times(ratio(Ea, 4, 30))} slower than 30 °C</b></div>
            <div class="row x"><span>In the freezer at −18 °C</span><b>${times(ratio(Ea, -18, 30))} slower</b></div>
            <div class="row x"><span>Speed-up for the next 10 °C (Q10)</span><b>×${q10.toFixed(2)}</b></div>
            <small>k = A × e<sup>−Ea ÷ RT</sup> with a hill of ${Ea} kJ/mol. Real spoiling is many reactions at once, so treat this as the size of the effect.</small>`;
        }
        const p = POTS[s.pot], f = ratio(DAL.Ea, 100, p.T), min = DAL.min / f;
        return `<div class="big">Dal cooks in about ${fmtDur(min)}</div>
          <div class="row"><span>${p.n}</span><b>water boils at ${p.T} °C</b></div>
          <div class="row"><span>Against an open pot at 100 °C (40 min)</span><b>${Math.abs(f - 1) < 0.01 ? 'the yardstick' : f > 1 ? `${f.toFixed(1)} times faster` : `${(1 / f).toFixed(1)} times slower`}</b></div>
          <div class="row x"><span>Hill for softening lentils</span><b>${DAL.Ea} kJ/mol</b></div>
          <small>${p.note}. Rate ratio = e<sup>(Ea ÷ R)(1/373 − 1/T)</sup>.</small>`;
      })(s)),
    };
  },
};
