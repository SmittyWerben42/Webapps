const SVG_NS = "http://www.w3.org/2000/svg";

const svg = document.getElementById("strahl-svg");
const fehlerEl = document.getElementById("fehler");

const modusHoch = document.getElementById("modus-hoch");
const modusRunter = document.getElementById("modus-runter");
const hochFelder = document.getElementById("hoch-felder");
const runterFelder = document.getElementById("runter-felder");

const hochStepTop = document.getElementById("hoch-step-top");
const hochStepBottom = document.getElementById("hoch-step-bottom");
const hochCount = document.getElementById("hoch-count");

const runterTargetTop = document.getElementById("runter-target-top");
const runterTargetBottom = document.getElementById("runter-target-bottom");
const runterAnzahlFeld = document.getElementById("runter-anzahl-feld");
const runterGroesseFelder = document.getElementById("runter-groesse-felder");
const runterCount = document.getElementById("runter-count");
const runterStepTop = document.getElementById("runter-step-top");
const runterStepBottom = document.getElementById("runter-step-bottom");

const strahlKarte = document.querySelector(".strahl-karte");
const einheitObenFeld = document.getElementById("einheit-oben-feld");
const einheitUntenFeld = document.getElementById("einheit-unten-feld");

const toggleAchsen = document.getElementById("toggle-achsen");
const toggleBoegen = document.getElementById("toggle-boegen");
const boegenLabelRow = document.getElementById("boegen-label-row");
const toggleBoegenLabel = document.getElementById("toggle-boegen-label");
const gesamtbogenRow = document.getElementById("gesamtbogen-row");
const gesamtbogenLabelRow = document.getElementById("gesamtbogen-label-row");
const toggleGesamtbogen = document.getElementById("toggle-gesamtbogen");
const toggleGesamtbogenLabel = document.getElementById("toggle-gesamtbogen-label");

const toggleWerte = document.getElementById("toggle-werte");
const werteListe = document.getElementById("werte-liste");
const werteHinzufuegen = document.getElementById("werte-hinzufuegen");

const ZAHLWORT = ["null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf"];
function zahlwort(n) {
  return Number.isInteger(n) && n >= 0 && n < ZAHLWORT.length ? ZAHLWORT[n] : String(n);
}

// "ein 6er" statt "eins 6er" - "eins" steht nur alleine, nicht vor einem Nomen.
function zahlwortVorNomen(n) {
  return n === 1 ? "ein" : zahlwort(n);
}

function formatZahl(n) {
  const gerundet = Math.round(n * 1000) / 1000;
  return gerundet.toLocaleString("de-DE");
}

// Fuer das .value eines <input type="number"> - immer Punkt als Dezimaltrenner.
function formatEingabe(n) {
  return String(Math.round(n * 1000) / 1000);
}

// --- Verschiebbare Markierungslinie (Hoch- und Runterrechnen) ---
// Zeigt, bis zu welchem Schritt Boegen/Gesamtbogen/Achsenbeschriftung
// sichtbar sind. Startet immer beim ersten (kleinsten) Schritt, damit man
// sie leicht findet.

let linieSchritt = 1;

// --- Modus-Umschalter (gegenseitig ausschließend wie im Original) ---

function setModus(hoch) {
  modusHoch.checked = hoch;
  modusRunter.checked = !hoch;
  hochFelder.hidden = !hoch;
  runterFelder.hidden = hoch;
  gesamtbogenRow.hidden = !hoch;
  gesamtbogenLabelRow.hidden = !hoch || !toggleGesamtbogen.checked;
  // Hochrechnen: Linie startet immer beim ersten Schritt (kleinstes Paar
  // groesser 0). Runterrechnen: Linie startet immer beim Zielpaar (letzter
  // Schritt) - man rechnet ja vom Ziel aus rueckwaerts. Die Eingabefelder
  // selbst bleiben beim Wechsel unveraendert.
  if (hoch) {
    linieSchritt = 1;
  } else {
    const raster = berechneRaster();
    linieSchritt = raster.error ? 1 : raster.count;
  }
  renderAlles();
}

modusHoch.addEventListener("change", () => setModus(true));
modusRunter.addEventListener("change", () => setModus(false));

// --- Runterrechnen: Anzahl Schritte vs. Größe der Schritte ---

document.querySelectorAll('input[name="runter-modus"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const anzahlGewaehlt = document.querySelector('input[name="runter-modus"]:checked').value === "anzahl";
    runterAnzahlFeld.hidden = !anzahlGewaehlt;
    runterGroesseFelder.hidden = anzahlGewaehlt;
    syncRunterSchrittgroesse();
    renderAlles();
  });
});

// Die Schrittgröße der jeweils anderen Linie wird automatisch nachgezogen,
// damit auf beiden Linien immer dieselbe Anzahl Schritte entsteht - das
// laestige "passt nicht zusammen" soll so gar nicht erst vorkommen.
let runterFuehrendeSeite = "top";

function syncRunterSchrittgroesse() {
  const groesseGewaehlt = document.querySelector('input[name="runter-modus"]:checked').value === "groesse";
  if (!groesseGewaehlt) return;

  const targetTop = parseFloat(runterTargetTop.value);
  const targetBottom = parseFloat(runterTargetBottom.value);
  if (!isFinite(targetTop) || targetTop <= 0 || !isFinite(targetBottom) || targetBottom <= 0) return;

  const EPS = 1e-6;
  if (runterFuehrendeSeite === "top") {
    const stepTop = parseFloat(runterStepTop.value);
    if (!isFinite(stepTop) || stepTop <= 0) return;
    const count = Math.round(targetTop / stepTop);
    if (count >= 1 && Math.abs(targetTop / stepTop - count) < EPS) {
      runterStepBottom.value = formatEingabe(targetBottom / count);
    }
  } else {
    const stepBottom = parseFloat(runterStepBottom.value);
    if (!isFinite(stepBottom) || stepBottom <= 0) return;
    const count = Math.round(targetBottom / stepBottom);
    if (count >= 1 && Math.abs(targetBottom / stepBottom - count) < EPS) {
      runterStepTop.value = formatEingabe(targetTop / count);
    }
  }
}

runterStepTop.addEventListener("input", () => {
  runterFuehrendeSeite = "top";
  syncRunterSchrittgroesse();
  renderAlles();
});
runterStepBottom.addEventListener("input", () => {
  runterFuehrendeSeite = "bottom";
  syncRunterSchrittgroesse();
  renderAlles();
});
[runterTargetTop, runterTargetBottom].forEach((input) => {
  input.addEventListener("input", () => {
    syncRunterSchrittgroesse();
    renderAlles();
  });
});

// --- Bögen / Gesamtbogen Sichtbarkeit der Unter-Schalter ---

toggleBoegen.addEventListener("change", () => {
  boegenLabelRow.hidden = !toggleBoegen.checked;
  renderAlles();
});
toggleGesamtbogen.addEventListener("change", () => {
  gesamtbogenLabelRow.hidden = !modusHoch.checked || !toggleGesamtbogen.checked;
  renderAlles();
});

// --- Werte eingeben: dynamische Liste ---

function neueWerteZeile(oben = "", unten = "") {
  const zeile = document.createElement("div");
  zeile.className = "werte-zeile";
  zeile.innerHTML = `
    <label>Wert oben <input type="number" class="werte-oben" value="${oben}"></label>
    <label>Wert unten <input type="number" class="werte-unten" value="${unten}"></label>
    <button type="button" class="werte-entfernen" title="Wertepaar entfernen" aria-label="Wertepaar entfernen">×</button>
  `;
  zeile.querySelectorAll("input").forEach((input) => input.addEventListener("input", renderAlles));
  zeile.querySelector(".werte-entfernen").addEventListener("click", () => {
    zeile.remove();
    renderAlles();
  });
  werteListe.appendChild(zeile);
}

toggleWerte.addEventListener("change", () => {
  const an = toggleWerte.checked;
  werteListe.hidden = !an;
  werteHinzufuegen.hidden = !an;
  if (an && werteListe.children.length === 0) {
    neueWerteZeile();
  }
  renderAlles();
});

werteHinzufuegen.addEventListener("click", () => {
  neueWerteZeile();
  renderAlles();
});

function gelesenerWerte() {
  const paare = [];
  werteListe.querySelectorAll(".werte-zeile").forEach((zeile) => {
    const oben = parseFloat(zeile.querySelector(".werte-oben").value);
    const unten = parseFloat(zeile.querySelector(".werte-unten").value);
    if (isFinite(oben) && isFinite(unten)) {
      paare.push({ oben, unten });
    }
  });
  return paare;
}

// --- Live-Reaktion auf alle Eingaben ---

[
  hochStepTop, hochStepBottom, hochCount,
  runterCount,
].forEach((input) => input.addEventListener("input", renderAlles));

[toggleAchsen, toggleBoegenLabel, toggleGesamtbogenLabel].forEach((cb) => cb.addEventListener("change", renderAlles));

// --- Berechnung von Schrittgröße / Anzahl Schritte / Zielwert ---

const MAX_SCHRITTE = 60;

function pruefeSchrittAnzahl(count) {
  if (!Number.isInteger(count) || count < 1) return "Bitte eine gültige Anzahl Schritte eingeben (mindestens 1, ganzzahlig).";
  if (count > MAX_SCHRITTE) return `Bitte höchstens ${MAX_SCHRITTE} Schritte verwenden.`;
  return null;
}

function berechneRaster() {
  if (modusHoch.checked) {
    const stepTop = parseFloat(hochStepTop.value);
    const stepBottom = parseFloat(hochStepBottom.value);
    const count = parseInt(hochCount.value, 10);

    if (!isFinite(stepTop) || stepTop <= 0) return { error: "Bitte eine gültige Schrittgröße oben eingeben (größer als 0)." };
    if (!isFinite(stepBottom) || stepBottom <= 0) return { error: "Bitte eine gültige Schrittgröße unten eingeben (größer als 0)." };
    const schrittFehler = pruefeSchrittAnzahl(count);
    if (schrittFehler) return { error: schrittFehler };

    return { stepTop, stepBottom, count, targetTop: stepTop * count, targetBottom: stepBottom * count };
  }

  const targetTop = parseFloat(runterTargetTop.value);
  const targetBottom = parseFloat(runterTargetBottom.value);
  if (!isFinite(targetTop) || targetTop <= 0) return { error: "Bitte einen gültigen Zielwert oben eingeben (größer als 0)." };
  if (!isFinite(targetBottom) || targetBottom <= 0) return { error: "Bitte einen gültigen Zielwert unten eingeben (größer als 0)." };

  const anzahlGewaehlt = document.querySelector('input[name="runter-modus"]:checked').value === "anzahl";

  if (anzahlGewaehlt) {
    const count = parseInt(runterCount.value, 10);
    const schrittFehler = pruefeSchrittAnzahl(count);
    if (schrittFehler) return { error: schrittFehler };
    return { stepTop: targetTop / count, stepBottom: targetBottom / count, count, targetTop, targetBottom };
  }

  const stepTop = parseFloat(runterStepTop.value);
  const stepBottom = parseFloat(runterStepBottom.value);
  if (!isFinite(stepTop) || stepTop <= 0) return { error: "Bitte eine gültige Schrittgröße oben eingeben (größer als 0)." };
  if (!isFinite(stepBottom) || stepBottom <= 0) return { error: "Bitte eine gültige Schrittgröße unten eingeben (größer als 0)." };

  const EPS = 1e-6;
  const countTopRaw = targetTop / stepTop;
  const countBottomRaw = targetBottom / stepBottom;
  const countTop = Math.round(countTopRaw);
  const countBottom = Math.round(countBottomRaw);

  if (Math.abs(countTopRaw - countTop) > EPS || countTop < 1) {
    return { error: `Die Schrittgröße oben (${formatZahl(stepTop)}) ist kein Teiler des Zielwerts oben (${formatZahl(targetTop)}).` };
  }
  if (Math.abs(countBottomRaw - countBottom) > EPS || countBottom < 1) {
    return { error: `Die Schrittgröße unten (${formatZahl(stepBottom)}) ist kein Teiler des Zielwerts unten (${formatZahl(targetBottom)}).` };
  }
  if (countTop !== countBottom) {
    return {
      error: `Die Schrittanzahl passt nicht zusammen: oben ergeben sich ${countTop} Schritte, unten ${countBottom}. `
        + `Passe die Schrittgrößen so an, dass auf beiden Linien die gleiche Anzahl Schritte entsteht.`,
    };
  }
  if (countTop > MAX_SCHRITTE) return { error: `Bitte höchstens ${MAX_SCHRITTE} Schritte verwenden.` };

  return { stepTop, stepBottom, count: countTop, targetTop, targetBottom };
}

// --- SVG-Rendering ---

// Platz links fuer die Einheiten-Beschriftung, Basis-Breite fuer die
// Schritte und Mindestbreite pro Schritt. Bei vielen Schritten wird die
// Zeichenflaeche (viewBox + Mindestbreite in Px) automatisch breiter,
// statt dass sich Beschriftungen ueberlappen - die Karte scrollt dann
// horizontal, wie es schon fuer schmale Handy-Breiten funktioniert.
const LINE_LEFT_SCHMAL = 55;
const LINE_LEFT_BREIT = 100;
const BASIS_LINE_WIDTH = 500;
const AXIS_UEBERSTAND = 55;
const RAND_RECHTS = 30;
const BASIS_VIEWBOX_BREITE = LINE_LEFT_BREIT + BASIS_LINE_WIDTH + AXIS_UEBERSTAND + RAND_RECHTS;
const BASIS_MIN_PX = 480;
const MIN_EINHEIT_PRO_SCHRITT = 55;

let LINE_LEFT = LINE_LEFT_SCHMAL;
let LINE_WIDTH = BASIS_LINE_WIDTH;
let TARGET_X = LINE_LEFT + LINE_WIDTH;
let AXIS_END_X = TARGET_X + AXIS_UEBERSTAND;

const TOP_LINE_Y = 100;
const BOTTOM_LINE_Y = 160;
const SVG_HOEHE = 265;
const ARC_STEP_HOEHE = 26;
const ARC_GESAMT_HOEHE = 95;

// "hoehe" bleibt bewusst fest (SVG_HOEHE, preserveAspectRatio="none"): so
// bleiben Schrift- und Bogengroessen physisch konstant, egal wie breit die
// Zeichenflaeche bei vielen Schritten wird. Wuerde die Hoehe stattdessen
// im festen Seitenverhaeltnis zur (wachsenden) Breite mitlaufen (bisheriges
// "height:auto"-Verhalten), wuerde die Karte bei mehr Schritten sichtbar
// "einsacken" - genau das Springen, das das Treffen der Spinner-Pfeile
// erschwert hat.
let viewboxBreiteAktuell = BASIS_VIEWBOX_BREITE;

function layoutAktualisieren(count, achsenBeschriftung) {
  LINE_LEFT = achsenBeschriftung ? LINE_LEFT_BREIT : LINE_LEFT_SCHMAL;
  LINE_WIDTH = Math.max(BASIS_LINE_WIDTH, count * MIN_EINHEIT_PRO_SCHRITT);
  TARGET_X = LINE_LEFT + LINE_WIDTH;
  AXIS_END_X = TARGET_X + AXIS_UEBERSTAND;
  viewboxBreiteAktuell = AXIS_END_X + RAND_RECHTS;
  svg.setAttribute("viewBox", `0 0 ${viewboxBreiteAktuell} ${SVG_HOEHE}`);
  svg.style.minWidth = `${Math.round(viewboxBreiteAktuell * (BASIS_MIN_PX / BASIS_VIEWBOX_BREITE))}px`;
}

// Die Einheiten-Felder sind echte HTML-<textarea>, die ueber der SVG liegen
// (statt eines gezeichneten Labels) - dadurch kann man direkt hineinklicken
// und tippen, mit nativem Zeilenumbruch bei langen Woertern. Sie muessen bei
// jeder Layout-Aenderung (Schrittanzahl, Fensterbreite) neu positioniert
// werden, weil die SVG-Breite sich dynamisch skaliert.
const EINHEIT_FELD_HOEHE = 34;

function positioniereEinheitenFelder(achsenBeschriftung) {
  einheitObenFeld.hidden = !achsenBeschriftung;
  einheitUntenFeld.hidden = !achsenBeschriftung;
  if (!achsenBeschriftung) return;

  const svgRect = svg.getBoundingClientRect();
  const karteRect = strahlKarte.getBoundingClientRect();
  const skalaX = svgRect.width / viewboxBreiteAktuell;
  const rechtsKanteSvg = LINE_LEFT - 8;
  const breiteSvg = rechtsKanteSvg - 8;
  const linksPx = (svgRect.left - karteRect.left) + (rechtsKanteSvg - breiteSvg) * skalaX;
  const breitePx = breiteSvg * skalaX;

  [
    [einheitObenFeld, TOP_LINE_Y],
    [einheitUntenFeld, BOTTOM_LINE_Y],
  ].forEach(([feld, mitteY]) => {
    feld.style.left = `${linksPx}px`;
    feld.style.width = `${breitePx}px`;
    feld.style.top = `${(svgRect.top - karteRect.top) + mitteY - EINHEIT_FELD_HOEHE / 2}px`;
    feld.style.height = `${EINHEIT_FELD_HOEHE}px`;
  });
}

function el(tag, attrs, text) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

function bogenPfad(x1, y1, x2, y2, hoehe, nachOben) {
  const mx = (x1 + x2) / 2;
  const my = nachOben ? y1 - hoehe : y1 + hoehe;
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

// Eine quadratische Bezierkurve mit Kontrollpunkt-Versatz "hoehe" erreicht
// an ihrer Spitze (t=0.5) nur die Haelfte davon (y(t) = y - 2t(1-t)*hoehe).
// Beschriftungen werden relativ zu dieser tatsaechlichen Spitze plus einem
// kleinen festen Abstand platziert, damit der Abstand bei jeder Bogengroesse
// (Einzelbogen wie Gesamtbogen) automatisch passt.
function bogenSpitze(hoehe) {
  return hoehe / 2;
}

// (0,0) ist immer sichtbar; das Zielpaar (i===count) je nach Modus immer
// oder wie jede andere Markierung erst nach Erreichen durch die Linie -
// sonst waeren die Einrastpunkte schon vorab an den Strichen zu erkennen.
function istPunktSichtbar(i, count, sichtbareSchritte, zielImmerSichtbar) {
  return i === 0 || i <= sichtbareSchritte || (i === count && zielImmerSichtbar);
}

function zeichneLinie(g, lineY, count, step, achsenBeschriftung, nachOben, sichtbareSchritte, zielImmerSichtbar) {
  g.appendChild(el("line", { class: "achse", x1: LINE_LEFT, y1: lineY, x2: AXIS_END_X, y2: lineY }));
  g.appendChild(el("polygon", {
    class: "achse",
    fill: "currentColor",
    points: `${AXIS_END_X},${lineY} ${AXIS_END_X - 10},${lineY - 5} ${AXIS_END_X - 10},${lineY + 5}`,
  }));

  const sichtbar = sichtbareSchritte === undefined ? count : sichtbareSchritte;

  for (let i = 0; i <= count; i++) {
    if (!istPunktSichtbar(i, count, sichtbar, zielImmerSichtbar)) continue;
    const x = LINE_LEFT + (i / count) * LINE_WIDTH;
    g.appendChild(el("line", { class: "gitterlinie", x1: x, y1: lineY - 6, x2: x, y2: lineY + 6 }));
    if (achsenBeschriftung) {
      const wert = i * step;
      g.appendChild(el("text", {
        class: "achsen-label",
        x, y: nachOben ? lineY - 14 : lineY + 25,
        "text-anchor": "middle",
      }, formatZahl(wert)));
    }
  }
}

function zeichneBoegen(g, lineY, count, step, nachOben, mitLabel, sichtbareSchritte) {
  const sichtbar = sichtbareSchritte === undefined ? count : sichtbareSchritte;
  for (let i = 0; i < count; i++) {
    if (i + 1 > sichtbar) break;
    const x1 = LINE_LEFT + (i / count) * LINE_WIDTH;
    const x2 = LINE_LEFT + ((i + 1) / count) * LINE_WIDTH;
    g.appendChild(el("path", { class: "bogen", d: bogenPfad(x1, lineY, x2, lineY, ARC_STEP_HOEHE, nachOben) }));
    if (mitLabel) {
      const mx = (x1 + x2) / 2;
      const spitze = bogenSpitze(ARC_STEP_HOEHE);
      const my = nachOben ? lineY - spitze - 6 : lineY + spitze + 16;
      g.appendChild(el("text", { class: "bogen-label", x: mx, y: my, "text-anchor": "middle" }, `${formatZahl(step)}er`));
    }
  }
}

function zeichneGesamtbogen(g, lineY, count, step, nachOben, mitLabel, sichtbareSchritte) {
  const sichtbar = sichtbareSchritte === undefined ? count : sichtbareSchritte;
  if (sichtbar < 1) return;
  const x2 = LINE_LEFT + (sichtbar / count) * LINE_WIDTH;
  // Bei weniger sichtbaren Schritten auch die Bogenhoehe verkleinern, damit
  // ein kurzer Gesamtbogen nicht unproportional steil/hoch wirkt - aber nie
  // unter die Hoehe der Einzelboegen, sonst ueberlappen sich die Labels.
  const hoehe = ARC_STEP_HOEHE + (ARC_GESAMT_HOEHE - ARC_STEP_HOEHE) * (sichtbar / count);
  g.appendChild(el("path", {
    class: "gesamtbogen",
    d: bogenPfad(LINE_LEFT, lineY, x2, lineY, hoehe, nachOben),
  }));
  if (mitLabel) {
    const mx = (LINE_LEFT + x2) / 2;
    const spitze = bogenSpitze(hoehe);
    const my = nachOben ? lineY - spitze - 8 : lineY + spitze + 18;
    g.appendChild(el("text", {
      class: "gesamtbogen-label", x: mx, y: my, "text-anchor": "middle",
    }, `${zahlwortVorNomen(sichtbar)} ${formatZahl(step)}er`));
  }
}

function zeichneVerbindung(g, x) {
  g.appendChild(el("line", { class: "verbindung", x1: x, y1: TOP_LINE_Y, x2: x, y2: BOTTOM_LINE_Y }));
}

function zeichneVerschiebbareLinie(g, x) {
  // Breiterer unsichtbarer Streifen nur fuers Cursor-Feedback: zeigt den
  // Verschiebe-Cursor schon im gesamten Greifbereich (GRAB_TOLERANZ) an,
  // nicht erst exakt auf der duennen Linie - so sieht man vorab, ob man
  // an dieser Stelle greifen kann, bevor man klickt.
  g.appendChild(el("line", {
    class: "markierungslinie-hitbox",
    x1: x, y1: TOP_LINE_Y - 20, x2: x, y2: BOTTOM_LINE_Y + 20,
    "stroke-width": GRAB_TOLERANZ * 2,
  }));
  g.appendChild(el("line", {
    class: "markierungslinie", x1: x, y1: TOP_LINE_Y - 10, x2: x, y2: BOTTOM_LINE_Y + 10,
  }));
  g.appendChild(el("circle", { class: "markierungslinie-griff", cx: x, cy: TOP_LINE_Y - 10, r: 3.5 }));
  g.appendChild(el("circle", { class: "markierungslinie-griff", cx: x, cy: BOTTOM_LINE_Y + 10, r: 3.5 }));
}

// --- Ziehen der Markierungslinie (Hoch- und Runterrechnen) ---
// Hit-Testing per Koordinaten statt an einem konkreten DOM-Element, weil
// renderAlles() bei jedem Schritt die komplette SVG neu aufbaut - ein
// waehrend des Ziehens ausgetauschtes Element wuerde die Pointer-Capture
// verlieren.

const GRAB_TOLERANZ = 20;
let ziehtMarkierungslinie = false;

// Beim Ziehen bewegt sich die Linie frei/stufenlos mit dem Zeiger mit.
// Nur in der Naehe eines Wertepaars (innerhalb SNAP_ANTEIL eines Schritts)
// rastet sie exakt darauf ein - sonst wuerde die Linie bei wenigen/grossen
// Schritten ausschliesslich zwischen den Wertepaaren "springen" koennen.
const SNAP_ANTEIL = 0.12;

function clientNachSvg(clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function schrittAusPointer(evt, count) {
  const svgPt = clientNachSvg(evt.clientX, evt.clientY);
  const roh = ((svgPt.x - LINE_LEFT) / LINE_WIDTH) * count;
  const begrenzt = Math.min(count, Math.max(0, roh));
  const naechster = Math.round(begrenzt);
  return Math.abs(begrenzt - naechster) < SNAP_ANTEIL ? naechster : begrenzt;
}

svg.addEventListener("pointerdown", (evt) => {
  const raster = berechneRaster();
  if (raster.error) return;
  const svgPt = clientNachSvg(evt.clientX, evt.clientY);
  const linieX = LINE_LEFT + (linieSchritt / raster.count) * LINE_WIDTH;
  const imBereich = svgPt.y >= TOP_LINE_Y - 20 && svgPt.y <= BOTTOM_LINE_Y + 20;
  if (!imBereich || Math.abs(svgPt.x - linieX) > GRAB_TOLERANZ) return;
  evt.preventDefault();
  ziehtMarkierungslinie = true;
  document.addEventListener("pointermove", beiMarkierungslinieZiehen);
  document.addEventListener("pointerup", beiMarkierungslinieLoslassen);
});

function beiMarkierungslinieZiehen(evt) {
  if (!ziehtMarkierungslinie) return;
  const raster = berechneRaster();
  if (raster.error) return;
  const neu = schrittAusPointer(evt, raster.count);
  if (neu !== linieSchritt) {
    linieSchritt = neu;
    renderAlles();
  }
}

function beiMarkierungslinieLoslassen() {
  ziehtMarkierungslinie = false;
  document.removeEventListener("pointermove", beiMarkierungslinieZiehen);
  document.removeEventListener("pointerup", beiMarkierungslinieLoslassen);
}

function zeichneWertMarker(g, lineY, target, wert, nachOben) {
  const x = LINE_LEFT + (wert / target) * LINE_WIDTH;
  g.appendChild(el("circle", { class: "wert-marker", cx: x, cy: lineY, r: 4 }));
  g.appendChild(el("text", {
    class: "wert-label", x, y: nachOben ? lineY - 12 : lineY + 24, "text-anchor": "middle",
  }, formatZahl(wert)));
}

// Passt ein Wertepaar zum eingestellten Verhaeltnis (oben/unten = stepTop/
// stepBottom), bekommt es dieselbe Verbindungslinie wie die regulaeren
// Schrittmarkierungen (in Gruen statt Grau) - sonst bleiben es zwei
// unabhaengige Punkte, damit man den Unterschied sofort sieht.
function zeichneWertePaare(g, paare, targetTop, targetBottom, stepTop, stepBottom) {
  const EPS = 1e-6;
  paare.forEach(({ oben, unten }) => {
    const obenGueltig = isFinite(oben) && targetTop > 0;
    const untenGueltig = isFinite(unten) && targetBottom > 0;
    if (obenGueltig && untenGueltig) {
      const differenz = Math.abs(oben * stepBottom - unten * stepTop);
      const toleranz = EPS * Math.max(1, Math.abs(oben * stepBottom), Math.abs(unten * stepTop));
      if (differenz < toleranz) {
        const x = LINE_LEFT + (oben / targetTop) * LINE_WIDTH;
        g.appendChild(el("line", { class: "wert-verbindung", x1: x, y1: TOP_LINE_Y, x2: x, y2: BOTTOM_LINE_Y }));
      }
    }
    if (obenGueltig) zeichneWertMarker(g, TOP_LINE_Y, targetTop, oben, true);
    if (untenGueltig) zeichneWertMarker(g, BOTTOM_LINE_Y, targetBottom, unten, false);
  });
}

function renderAlles() {
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const raster = berechneRaster();
  if (raster.error) {
    layoutAktualisieren(5, false);
    positioniereEinheitenFelder(false);
    fehlerEl.hidden = false;
    fehlerEl.textContent = raster.error;
    // Leere Basislinien zur Orientierung weiter anzeigen.
    const g = el("g", {});
    g.appendChild(el("line", { class: "achse", x1: LINE_LEFT, y1: TOP_LINE_Y, x2: AXIS_END_X, y2: TOP_LINE_Y }));
    g.appendChild(el("line", { class: "achse", x1: LINE_LEFT, y1: BOTTOM_LINE_Y, x2: AXIS_END_X, y2: BOTTOM_LINE_Y }));
    g.appendChild(el("text", { class: "achsen-label", x: LINE_LEFT, y: TOP_LINE_Y - 12 }, "0"));
    g.appendChild(el("text", { class: "achsen-label", x: LINE_LEFT, y: BOTTOM_LINE_Y - 12 }, "0"));
    svg.appendChild(g);
    return;
  }
  fehlerEl.hidden = true;

  const { stepTop, stepBottom, count, targetTop, targetBottom } = raster;
  const achsenBeschriftung = toggleAchsen.checked;
  const boegenAn = toggleBoegen.checked;
  const boegenLabel = toggleBoegenLabel.checked;
  const gesamtbogenAn = modusHoch.checked && toggleGesamtbogen.checked;
  const gesamtbogenLabel = toggleGesamtbogenLabel.checked;
  const werteAn = toggleWerte.checked;
  const paare = werteAn ? gelesenerWerte() : [];
  layoutAktualisieren(count, achsenBeschriftung);
  positioniereEinheitenFelder(achsenBeschriftung);

  linieSchritt = Math.min(Math.max(0, linieSchritt), count);
  // Die Linie selbst steht stufenlos (linieSchritt kann eine Kommazahl
  // sein), aber Boegen/Beschriftungen/Markierungen sollen erst erscheinen,
  // wenn ein Wertepaar tatsaechlich erreicht/ueberschritten wurde - daher
  // hier abrunden statt den rohen (freien) Wert zu verwenden.
  const sichtbareSchritte = Math.floor(linieSchritt + 1e-9);
  // Runterrechnen: Zielwertpaar (der Ausgangspunkt der Aufgabe) bleibt immer
  // sichtbar. Hochrechnen: das Zielpaar wird erst beim letzten Schritt wie
  // jede andere Beschriftung sichtbar - das (0,0)-Paar ist in beiden Modi
  // immer sichtbar.
  const zielImmerSichtbar = !modusHoch.checked;

  const gLinien = el("g", {});
  zeichneLinie(gLinien, TOP_LINE_Y, count, stepTop, achsenBeschriftung, true, sichtbareSchritte, zielImmerSichtbar);
  zeichneLinie(gLinien, BOTTOM_LINE_Y, count, stepBottom, achsenBeschriftung, false, sichtbareSchritte, zielImmerSichtbar);
  for (let i = 0; i <= count; i++) {
    if (!istPunktSichtbar(i, count, sichtbareSchritte, zielImmerSichtbar)) continue;
    zeichneVerbindung(gLinien, LINE_LEFT + (i / count) * LINE_WIDTH);
  }
  svg.appendChild(gLinien);

  if (boegenAn) {
    const gBoegen = el("g", {});
    zeichneBoegen(gBoegen, TOP_LINE_Y, count, stepTop, true, boegenLabel, sichtbareSchritte);
    zeichneBoegen(gBoegen, BOTTOM_LINE_Y, count, stepBottom, false, boegenLabel, sichtbareSchritte);
    svg.appendChild(gBoegen);
  }

  if (gesamtbogenAn) {
    const gGesamt = el("g", {});
    zeichneGesamtbogen(gGesamt, TOP_LINE_Y, count, stepTop, true, gesamtbogenLabel, sichtbareSchritte);
    zeichneGesamtbogen(gGesamt, BOTTOM_LINE_Y, count, stepBottom, false, gesamtbogenLabel, sichtbareSchritte);
    svg.appendChild(gGesamt);
  }

  const gMarkierung = el("g", {});
  const linieX = LINE_LEFT + (linieSchritt / count) * LINE_WIDTH;
  zeichneVerschiebbareLinie(gMarkierung, linieX);
  svg.appendChild(gMarkierung);

  if (werteAn && paare.length) {
    const gWerte = el("g", {});
    zeichneWertePaare(gWerte, paare, targetTop, targetBottom, stepTop, stepBottom);
    svg.appendChild(gWerte);
  }
}

window.addEventListener("resize", () => positioniereEinheitenFelder(toggleAchsen.checked));

setModus(true);
renderAlles();
