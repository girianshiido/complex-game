const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const screens = {
  home: $("#homeScreen"),
  lab: $("#labScreen"),
  game: $("#gameScreen"),
  result: $("#resultScreen")
};

const MODES = {
  add: { label: "Addition", badge: "Addition", operations: ["+"] },
  sub: { label: "Soustraction", badge: "Soustraction", operations: ["−"] },
  mul: { label: "Multiplication", badge: "Multiplication", operations: ["×"] },
  div: { label: "Division", badge: "Division", operations: ["÷"] },
  mix: { label: "Défi mixte", badge: "Mélange", operations: ["+", "−", "×", "÷"] }
};

const OPERATION_META = {
  "+": { label: "Addition", className: "add", color: "var(--blue)" },
  "−": { label: "Soustraction", className: "sub", color: "var(--mint)" },
  "×": { label: "Multiplication", className: "mul", color: "var(--orange)" },
  "÷": { label: "Division", className: "div", color: "var(--pink)" }
};

const ERROR_FEEDBACK = {
  crossed_parts: {
    title: "Réel avec réel, imaginaire avec imaginaire",
    message: "Vous avez croisé les parties réelle et imaginaire. Elles se calculent séparément."
  },
  imaginary_sign: {
    title: "Attention au signe de la partie imaginaire",
    message: "Le calcul de la partie réelle est juste, mais le signe de la partie imaginaire a changé."
  },
  subtraction_distribution: {
    title: "Le signe moins agit sur les deux termes",
    message: "Quand on retire un nombre complexe, on soustrait sa partie réelle et sa partie imaginaire."
  },
  reversed_subtraction: {
    title: "L’ordre de la soustraction compte",
    message: "Vous avez calculé le second nombre moins le premier. Une soustraction n’est pas commutative."
  },
  i_squared_sign: {
    title: "N’oubliez pas que i² = −1",
    message: "Le produit des parties imaginaires contribue à la partie réelle avec un changement de signe."
  },
  term_by_term: {
    title: "Il faut effectuer les quatre produits",
    message: "Multiplier seulement réel par réel et imaginaire par imaginaire oublie les deux produits croisés."
  },
  cross_product_sign: {
    title: "Les produits croisés s’additionnent",
    message: "La partie imaginaire vaut ad + bc. Vérifiez le signe entre les deux produits croisés."
  },
  conjugate_sign: {
    title: "Vérifiez le signe du conjugué",
    message: "Le conjugué conserve la partie réelle et change uniquement le signe de la partie imaginaire."
  },
  swapped_parts: {
    title: "Les parties ont été interverties",
    message: "La partie réelle s’écrit avant la partie imaginaire ; leurs rôles ne sont pas interchangeables."
  },
  arithmetic: {
    title: "Presque : reprenez le calcul numérique",
    message: "La méthode semble comprise, mais une petite erreur de calcul s’est glissée dans le résultat."
  }
};

function emptyOperationStats() {
  return Object.fromEntries(Object.keys(OPERATION_META).map((op) => [op, { seen: 0, correct: 0, skipped: 0, errors: {} }]));
}

const state = {
  mode: "mix",
  round: 0,
  total: 10,
  score: 0,
  streak: 0,
  bestStreak: 0,
  level: 1,
  answered: false,
  current: null,
  stats: emptyOperationStats()
};

const complex = (re, im) => ({ re, im });
const add = (a, b) => complex(a.re + b.re, a.im + b.im);
const sub = (a, b) => complex(a.re - b.re, a.im - b.im);
const mul = (a, b) => complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const equal = (a, b) => a.re === b.re && a.im === b.im;
const keyOf = (z) => `${z.re},${z.im}`;
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomOf = (items) => items[randomInt(0, items.length - 1)];

function formatComplex(z, html = false) {
  const i = html ? "<i>i</i>" : "i";
  if (z.im === 0) return rawNumber(z.re);
  if (z.re === 0) {
    if (z.im === 1) return i;
    if (z.im === -1) return `−${i}`;
    return `${z.im < 0 ? "−" : ""}${Math.abs(z.im)}${i}`;
  }
  const coefficient = Math.abs(z.im) === 1 ? "" : Math.abs(z.im);
  return `${rawNumber(z.re)} ${z.im < 0 ? "−" : "+"} ${coefficient}${i}`;
}

function parenthesize(z, html = false) {
  const value = formatComplex(z, html);
  return z.re !== 0 && z.im !== 0 || z.re < 0 || z.im < 0 ? `(${value})` : value;
}

function formatExpression(problem) {
  const a = parenthesize(problem.a, true);
  const b = parenthesize(problem.b, true);
  if (problem.op === "÷") {
    return `<span class="frac"><span class="num">${formatComplex(problem.a, true)}</span><span class="den">${formatComplex(problem.b, true)}</span></span>`;
  }
  return `${a} <span>${problem.op}</span> ${b}`;
}

function nonZeroComplex(limit, allowPure = true) {
  let z;
  do {
    z = complex(randomInt(-limit, limit), randomInt(-limit, limit));
  } while ((z.re === 0 && z.im === 0) || (!allowPure && (z.re === 0 || z.im === 0)));
  return z;
}

function buildProblem() {
  const mode = MODES[state.mode];
  const op = randomOf(mode.operations);
  const limits = [0, 4, 7, 10];
  const limit = limits[state.level];
  let a;
  let b;
  let result;

  if (op === "+" || op === "−") {
    a = nonZeroComplex(limit);
    b = nonZeroComplex(limit);
    result = op === "+" ? add(a, b) : sub(a, b);
  } else if (op === "×") {
    const mulLimit = state.level === 1 ? 3 : state.level === 2 ? 5 : 7;
    a = nonZeroComplex(mulLimit);
    b = nonZeroComplex(mulLimit);
    result = mul(a, b);
  } else {
    const divisorLimit = state.level === 1 ? 3 : state.level === 2 ? 4 : 5;
    const quotientLimit = state.level === 1 ? 3 : state.level === 2 ? 5 : 7;
    b = nonZeroComplex(divisorLimit);
    result = nonZeroComplex(quotientLimit);
    a = mul(result, b);
  }
  return { a, b, op, result };
}

function distractor(value, errorKey) {
  return { value, errorKey };
}

function plausibleErrors(problem) {
  const { a, b, op, result } = problem;
  const candidates = [];
  if (op === "+") {
    candidates.push(
      distractor(complex(a.re + b.im, a.im + b.re), "crossed_parts"),
      distractor(complex(a.re + b.re, a.im - b.im), "imaginary_sign")
    );
  } else if (op === "−") {
    candidates.push(
      distractor(complex(a.re - b.re, a.im + b.im), "subtraction_distribution"),
      distractor(complex(b.re - a.re, b.im - a.im), "reversed_subtraction")
    );
  } else if (op === "×") {
    candidates.push(
      distractor(complex(a.re * b.re + a.im * b.im, a.re * b.im + a.im * b.re), "i_squared_sign"),
      distractor(complex(a.re * b.re, a.im * b.im), "term_by_term"),
      distractor(complex(a.re * b.re - a.im * b.im, a.re * b.im - a.im * b.re), "cross_product_sign")
    );
  } else {
    candidates.push(
      distractor(complex(-result.re, result.im), "conjugate_sign"),
      distractor(complex(result.re, -result.im), "conjugate_sign")
    );
  }
  candidates.push(
    distractor(complex(result.im, result.re), "swapped_parts"),
    distractor(complex(result.re + randomOf([-2, -1, 1, 2]), result.im), "arithmetic"),
    distractor(complex(result.re, result.im + randomOf([-2, -1, 1, 2])), "arithmetic")
  );
  return candidates;
}

function buildOptions(problem) {
  const count = Math.min(4, state.level + 2);
  const result = [{ value: problem.result, errorKey: null }];
  const used = new Set([keyOf(problem.result)]);
  const candidates = plausibleErrors(problem);
  while (result.length < count) {
    const candidate = candidates.shift() || distractor(complex(
      problem.result.re + randomInt(-6, 6),
      problem.result.im + randomInt(-6, 6)
    ), "arithmetic");
    if (!used.has(keyOf(candidate.value))) {
      used.add(keyOf(candidate.value));
      result.push(candidate);
    }
  }
  return result.sort(() => Math.random() - .5);
}

function signedNumber(value) {
  return value < 0 ? `(−${Math.abs(value)})` : `${value}`;
}

function rawNumber(value) {
  return value < 0 ? `−${Math.abs(value)}` : `${value}`;
}

function additionStep(first, second) {
  return `${rawNumber(first)} + ${signedNumber(second)}`;
}

function subtractionStep(first, second) {
  return `${rawNumber(first)} − ${signedNumber(second)}`;
}

function productStep(first, second) {
  return `${signedNumber(first)} × ${signedNumber(second)}`;
}

function squareStep(value) {
  return `${signedNumber(value)}²`;
}

function solutionSteps(problem) {
  const { a, b, op, result } = problem;
  const R = formatComplex(result, true);
  if (op === "+") {
    const real = additionStep(a.re, b.re);
    const imaginary = additionStep(a.im, b.im);
    return [
      { label: "Regrouper", content: `(${real}) + (${imaginary})<i>i</i>` },
      { label: "Calculer", content: `${rawNumber(result.re)} + ${signedNumber(result.im)}<i>i</i>` },
      { label: "Réduire", content: `<b>${R}</b>` }
    ];
  }
  if (op === "−") {
    const real = subtractionStep(a.re, b.re);
    const imaginary = subtractionStep(a.im, b.im);
    return [
      { label: "Distribuer le signe −", content: `(${real}) + (${imaginary})<i>i</i>` },
      { label: "Calculer", content: `${rawNumber(result.re)} + ${signedNumber(result.im)}<i>i</i>` },
      { label: "Réduire", content: `<b>${R}</b>` }
    ];
  }
  if (op === "×") {
    const ac = productStep(a.re, b.re);
    const bd = productStep(a.im, b.im);
    const ad = productStep(a.re, b.im);
    const bc = productStep(a.im, b.re);
    return [
      { label: "Développer", content: `(${ac}) + (${ad})<i>i</i> + (${bc})<i>i</i> + (${bd})<i>i</i>²` },
      { label: "Utiliser i² = −1", content: `[${ac} − ${bd}] + [${ad} + ${bc}]<i>i</i>` },
      { label: "Réduire", content: `<b>${R}</b>` }
    ];
  }
  const conjugate = formatComplex(complex(b.re, -b.im), true);
  const numeratorReal = additionStep(a.re * b.re, a.im * b.im);
  const numeratorImaginary = subtractionStep(a.im * b.re, a.re * b.im);
  return [
    { label: "Multiplier par le conjugué", content: `Conjugué : ${conjugate}` },
    { label: "Calculer", content: `<span class="mini-frac"><span>[${numeratorReal}] + [${numeratorImaginary}]<i>i</i></span><span>${squareStep(b.re)} + ${squareStep(b.im)}</span></span>` },
    { label: "Simplifier", content: `<b>${R}</b>` }
  ];
}

function explain(problem) {
  return solutionSteps(problem).map((step, index) => `
    <div class="solution-step">
      <span class="step-number">${index + 1}</span>
      <div><small>${step.label}</small><span class="step-math">${step.content}</span></div>
    </div>
  `).join("");
}

const labState = {
  z: complex(3, 2),
  transform: "identity",
  mode: "free",
  dragging: false,
  challenge: {
    round: 0,
    total: 5,
    score: 0,
    target: complex(2, -3),
    answered: false,
    finished: false
  }
};

const LAB_CENTER = 300;
const LAB_SCALE = 50;
const LAB_LIMIT = 5;

function clampLab(value) {
  return Math.max(-LAB_LIMIT, Math.min(LAB_LIMIT, value));
}

function labToSvg(z) {
  return { x: LAB_CENTER + z.re * LAB_SCALE, y: LAB_CENTER - z.im * LAB_SCALE };
}

function transformComplex(z, transformation) {
  if (transformation === "conjugate") return complex(z.re, -z.im);
  if (transformation === "opposite") return complex(-z.re, -z.im);
  if (transformation === "times-i") return complex(-z.im, z.re);
  return complex(z.re, z.im);
}

function labTransformMeta() {
  const transformed = transformComplex(labState.z, labState.transform);
  const metadata = {
    identity: { label: "z", title: "Point original", rule: "z = a + bi" },
    conjugate: { label: "z̄", title: "Symétrie par rapport à l’axe réel", rule: "z̄ = a − bi" },
    opposite: { label: "−z", title: "Symétrie par rapport à l’origine", rule: "−z = −a − bi" },
    "times-i": { label: "iz", title: "Rotation de 90° dans le sens direct", rule: "i(a + bi) = −b + ai" }
  }[labState.transform];
  return { ...metadata, transformed };
}

function setSvgPosition(element, position) {
  element.setAttribute("cx", position.x);
  element.setAttribute("cy", position.y);
}

function setSvgLine(element, position) {
  element.setAttribute("x2", position.x);
  element.setAttribute("y2", position.y);
}

function setSvgLabel(element, position, text) {
  const xOffset = position.x > 510 ? -42 : 14;
  const yOffset = position.y < 78 ? 27 : -16;
  element.setAttribute("x", position.x + xOffset);
  element.setAttribute("y", position.y + yOffset);
  element.textContent = text;
}

function setSvgVisibility(element, visible) {
  element.toggleAttribute("hidden", !visible);
}

function renderLab() {
  const point = labToSvg(labState.z);
  const meta = labTransformMeta();
  const transformedPoint = labToSvg(meta.transformed);
  const showTransformation = labState.mode === "free" && labState.transform !== "identity";

  setSvgLine($("#labVector"), point);
  setSvgPosition($("#labPoint"), point);
  setSvgPosition($("#labPointHalo"), point);
  setSvgLabel($("#labPointLabel"), point, "z");

  setSvgVisibility($("#transformVector"), showTransformation);
  setSvgVisibility($("#transformPoint"), showTransformation);
  setSvgVisibility($("#transformLabel"), showTransformation);
  $("#transformLegend").hidden = !showTransformation;
  if (showTransformation) {
    setSvgLine($("#transformVector"), transformedPoint);
    setSvgPosition($("#transformPoint"), transformedPoint);
    setSvgLabel($("#transformLabel"), transformedPoint, meta.label);
  }

  $("#labAffix").textContent = `z = ${formatComplex(labState.z)}`;
  $("#labCoordinates").textContent = `Re(z) = ${rawNumber(labState.z.re)} · Im(z) = ${rawNumber(labState.z.im)}`;
  $("#labRuleTitle").textContent = meta.title;
  $("#labRuleText").textContent = showTransformation
    ? `${meta.rule}  →  ${meta.label} = ${formatComplex(meta.transformed)}`
    : meta.rule;
  $("#planeDescription").textContent = `Le point z a pour affixe ${formatComplex(labState.z)}.`;
}

function buildPlaneTicks() {
  const group = $("#planeTicks");
  group.innerHTML = "";
  for (let value = -5; value <= 5; value += 1) {
    if (value === 0) continue;
    const horizontal = LAB_CENTER + value * LAB_SCALE;
    const vertical = LAB_CENTER - value * LAB_SCALE;
    group.insertAdjacentHTML("beforeend", `
      <line x1="${horizontal}" y1="295" x2="${horizontal}" y2="305"></line>
      <text x="${horizontal}" y="322" text-anchor="middle">${rawNumber(value)}</text>
      <line x1="295" y1="${vertical}" x2="305" y2="${vertical}"></line>
      <text x="287" y="${vertical + 4}" text-anchor="end">${rawNumber(value)}</text>
    `);
  }
}

function updateLabPointFromPointer(event) {
  if (labState.mode === "challenge" && labState.challenge.answered) return;
  const rect = $("#complexPlane").getBoundingClientRect();
  const svgX = ((event.clientX - rect.left) / rect.width) * 600;
  const svgY = ((event.clientY - rect.top) / rect.height) * 600;
  labState.z = complex(
    clampLab(Math.round((svgX - LAB_CENTER) / LAB_SCALE)),
    clampLab(Math.round((LAB_CENTER - svgY) / LAB_SCALE))
  );
  setSvgVisibility($("#targetRing"), false);
  renderLab();
}

function setLabTransformation(transformation) {
  labState.transform = transformation;
  $$('[data-transform]').forEach((button) => {
    const active = button.dataset.transform === transformation;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderLab();
}

function updateLabBest() {
  const best = Number(localStorage.getItem("astra-lab-best") || 0);
  $("#labBestScore").textContent = best ? `${best} / 5` : "—";
}

function randomLabTarget() {
  let target;
  do {
    target = complex(randomInt(-4, 4), randomInt(-4, 4));
  } while (target.re === 0 && target.im === 0);
  return target;
}

function nextLabChallenge() {
  const challenge = labState.challenge;
  if (challenge.round >= challenge.total) {
    finishLabChallenge();
    return;
  }
  challenge.round += 1;
  challenge.target = randomLabTarget();
  challenge.answered = false;
  challenge.finished = false;
  labState.z = complex(0, 0);
  $("#challengeRound").textContent = `${challenge.round} / ${challenge.total}`;
  $("#challengeTarget").textContent = formatComplex(challenge.target);
  $("#challengeProgress").style.width = `${((challenge.round - 1) / challenge.total) * 100}%`;
  $("#challengeFeedback").textContent = "Touchez une intersection du quadrillage.";
  $("#challengeFeedback").className = "challenge-feedback";
  $("#challengeButton").textContent = "Valider la position";
  setSvgVisibility($("#targetRing"), false);
  renderLab();
}

function startLabChallenge() {
  labState.challenge = { ...labState.challenge, round: 0, score: 0, answered: false, finished: false };
  nextLabChallenge();
}

function validateLabChallenge() {
  const challenge = labState.challenge;
  if (challenge.finished) {
    startLabChallenge();
    return;
  }
  if (challenge.answered) {
    nextLabChallenge();
    return;
  }
  challenge.answered = true;
  const correct = equal(labState.z, challenge.target);
  const feedback = $("#challengeFeedback");
  if (correct) {
    challenge.score += 1;
    feedback.textContent = "Exact : le point est parfaitement placé.";
    feedback.className = "challenge-feedback success";
  } else {
    feedback.textContent = `Le point attendu est ${formatComplex(challenge.target)}.`;
    feedback.className = "challenge-feedback error";
    const target = labToSvg(challenge.target);
    setSvgPosition($("#targetRing"), target);
    setSvgVisibility($("#targetRing"), true);
  }
  $("#challengeProgress").style.width = `${(challenge.round / challenge.total) * 100}%`;
  $("#challengeButton").textContent = challenge.round === challenge.total ? "Voir le résultat" : "Point suivant";
}

function finishLabChallenge() {
  const challenge = labState.challenge;
  challenge.finished = true;
  const best = Math.max(Number(localStorage.getItem("astra-lab-best") || 0), challenge.score);
  localStorage.setItem("astra-lab-best", best);
  updateLabBest();
  $("#challengeRound").textContent = "Terminé";
  $("#challengeTarget").textContent = `${challenge.score} / ${challenge.total}`;
  $("#challengeFeedback").textContent = challenge.score === challenge.total
    ? "Trajectoire parfaite !"
    : challenge.score >= 3
      ? "Bien joué. Encore une série pour stabiliser vos repères."
      : "Reprenez le défi : observez bien le signe de chaque coordonnée.";
  $("#challengeFeedback").className = `challenge-feedback ${challenge.score >= 3 ? "success" : "error"}`;
  $("#challengeButton").textContent = "Recommencer";
  setSvgVisibility($("#targetRing"), false);
}

function setLabMode(mode) {
  labState.mode = mode;
  $$('[data-lab-mode]').forEach((button) => {
    const active = button.dataset.labMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const challengeMode = mode === "challenge";
  $("#challengePanel").hidden = !challengeMode;
  $("#transformationControls").hidden = challengeMode;
  $("#labRule").hidden = challengeMode;
  $("#labWorkspace").classList.toggle("challenge-mode", challengeMode);
  $("#labIntro").textContent = challengeMode
    ? "Lisez l’affixe demandé, puis touchez l’intersection correspondante dans le plan."
    : "Touchez le plan ou faites glisser le point z. Les flèches du clavier permettent aussi de le déplacer.";
  labState.transform = "identity";
  setLabTransformation("identity");
  if (challengeMode) startLabChallenge();
  else {
    labState.z = complex(3, 2);
    setSvgVisibility($("#targetRing"), false);
    renderLab();
  }
}

function openLab() {
  updateLabBest();
  setLabMode("free");
  showScreen("lab");
}

function resetLabPoint() {
  if (labState.mode === "challenge" && labState.challenge.answered) return;
  labState.z = labState.mode === "challenge" ? complex(0, 0) : complex(3, 2);
  setSvgVisibility($("#targetRing"), false);
  renderLab();
}

function moveLabPoint(deltaRe, deltaIm) {
  if (labState.mode === "challenge" && labState.challenge.answered) return;
  labState.z = complex(
    clampLab(labState.z.re + deltaRe),
    clampLab(labState.z.im + deltaIm)
  );
  setSvgVisibility($("#targetRing"), false);
  renderLab();
}

function showScreen(name) {
  Object.entries(screens).forEach(([key, element]) => element.classList.toggle("active", key === name));
  $("#feedbackDrawer").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startGame(mode) {
  state.mode = mode;
  state.round = 0;
  state.score = 0;
  state.streak = 0;
  state.bestStreak = 0;
  state.level = 1;
  state.answered = false;
  state.stats = emptyOperationStats();
  $("#gameModeKicker").textContent = MODES[mode].label;
  $("#operationBadge").textContent = MODES[mode].badge;
  showScreen("game");
  nextQuestion();
}

function nextQuestion() {
  if (state.round >= state.total) {
    finishGame();
    return;
  }
  state.round += 1;
  state.answered = false;
  state.current = buildProblem();
  renderQuestion();
}

function renderQuestion() {
  $("#gameModeTitle").textContent = `Question ${state.round} sur ${state.total}`;
  $("#scoreValue").textContent = state.score;
  $("#streakValue").textContent = state.streak;
  $("#progressBar").style.width = `${((state.round - 1) / state.total) * 100}%`;
  $("#equation").innerHTML = `<span class="expression-content">${formatExpression(state.current)}</span>`;
  updateLevelUI();

  const answers = $("#answers");
  answers.innerHTML = "";
  buildOptions(state.current).forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer";
    button.dataset.value = keyOf(option.value);
    button.dataset.error = option.errorKey || "";
    button.innerHTML = `<span class="answer-key">${index + 1}</span><span>${formatComplex(option.value, true)}</span>`;
    button.addEventListener("click", () => answerQuestion(option, button));
    answers.appendChild(button);
  });
}

function updateLevelUI() {
  const messages = ["", "Prenez vos marques.", "Le rythme s’accélère.", "Vous êtes en orbite."];
  $("#levelMessage").textContent = messages[state.level];
  $("#levelDots").setAttribute("aria-label", `Niveau ${state.level} sur 3`);
  $$("#levelDots i").forEach((dot, index) => dot.classList.toggle("active", index < state.level));
}

function recordAttempt(isCorrect, errorKey = null, skipped = false) {
  const operationStats = state.stats[state.current.op];
  operationStats.seen += 1;
  if (isCorrect) operationStats.correct += 1;
  if (skipped) operationStats.skipped += 1;
  if (errorKey) operationStats.errors[errorKey] = (operationStats.errors[errorKey] || 0) + 1;
}

function answerQuestion(option, button) {
  if (state.answered) return;
  state.answered = true;
  const isCorrect = equal(option.value, state.current.result);
  $$(".answer").forEach((answer) => {
    answer.disabled = true;
    if (answer.dataset.value === keyOf(state.current.result)) answer.classList.add("correct");
  });

  if (isCorrect) {
    state.score += 1;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    if (state.streak === 2) state.level = Math.min(2, state.level + 1);
    if (state.streak === 5) state.level = 3;
  } else {
    button.classList.add("wrong");
    state.streak = 0;
    if (state.level > 1 && state.round > 2) state.level -= 1;
  }
  recordAttempt(isCorrect, option.errorKey);
  $("#scoreValue").textContent = state.score;
  $("#streakValue").textContent = state.streak;
  showFeedback(isCorrect, false, option.errorKey);
}

function skipQuestion() {
  if (state.answered) return;
  state.answered = true;
  state.streak = 0;
  recordAttempt(false, null, true);
  $$(".answer").forEach((answer) => {
    answer.disabled = true;
    if (answer.dataset.value === keyOf(state.current.result)) answer.classList.add("correct");
  });
  showFeedback(false, true);
}

function showFeedback(isCorrect, skipped = false, errorKey = null) {
  const drawer = $("#feedbackDrawer");
  const diagnostic = $("#diagnostic");
  const errorFeedback = errorKey ? ERROR_FEEDBACK[errorKey] : null;
  drawer.classList.toggle("incorrect", !isCorrect);
  $("#feedbackIcon").textContent = isCorrect ? "✓" : skipped ? "?" : "×";
  $("#feedbackKicker").textContent = isCorrect ? "Bonne réponse" : skipped ? "Méthode guidée" : "Erreur identifiée";
  $("#feedbackTitle").textContent = isCorrect
    ? randomOf(["Exactement !", "Bien joué !", "Impeccable !"])
    : skipped
      ? `La réponse est ${formatComplex(state.current.result)}`
      : errorFeedback?.title || `La réponse était ${formatComplex(state.current.result)}`;
  diagnostic.hidden = !errorFeedback;
  diagnostic.textContent = errorFeedback?.message || "";
  $("#solution").innerHTML = explain(state.current);
  $("#nextButton").innerHTML = state.round === state.total ? "Voir mon bilan <span>→</span>" : "Question suivante <span>→</span>";
  drawer.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => drawer.classList.add("open"));
}

function saveCumulativeOperationStats() {
  const saved = JSON.parse(localStorage.getItem("astra-operation-stats") || "{}");
  Object.entries(state.stats).forEach(([op, stats]) => {
    const previous = saved[op] || { seen: 0, correct: 0, skipped: 0, errors: {} };
    previous.seen += stats.seen;
    previous.correct += stats.correct;
    previous.skipped += stats.skipped;
    Object.entries(stats.errors).forEach(([errorKey, count]) => {
      previous.errors[errorKey] = (previous.errors[errorKey] || 0) + count;
    });
    saved[op] = previous;
  });
  localStorage.setItem("astra-operation-stats", JSON.stringify(saved));
}

function renderOperationBreakdown() {
  const entries = Object.entries(state.stats).filter(([, stats]) => stats.seen > 0);
  $("#operationBreakdown").innerHTML = entries.map(([op, stats]) => {
    const meta = OPERATION_META[op];
    const percent = Math.round((stats.correct / stats.seen) * 100);
    const skipped = stats.skipped ? ` · ${stats.skipped} passée${stats.skipped > 1 ? "s" : ""}` : "";
    return `
      <div class="breakdown-row breakdown-${meta.className}">
        <span class="breakdown-symbol">${op}</span>
        <div class="breakdown-operation">
          <span><strong>${meta.label}</strong><small>${stats.correct} / ${stats.seen}${skipped}</small></span>
          <span class="breakdown-track"><i style="width:${percent}%"></i></span>
        </div>
        <strong class="breakdown-percent">${percent} %</strong>
      </div>
    `;
  }).join("");

  const weakest = entries.reduce((current, entry) => {
    const accuracy = entry[1].correct / entry[1].seen;
    if (!current || accuracy < current.accuracy) return { op: entry[0], stats: entry[1], accuracy };
    return current;
  }, null);
  const errors = entries.flatMap(([, stats]) => Object.entries(stats.errors));
  const commonError = errors.reduce((current, [key, count]) => !current || count > current.count ? { key, count } : current, null);
  const totalSeen = entries.reduce((total, [, stats]) => total + stats.seen, 0);
  const totalSkipped = entries.reduce((total, [, stats]) => total + stats.skipped, 0);
  let message = "Série parfaite : vous pouvez passer au niveau supérieur.";
  if (totalSeen > 0 && totalSkipped === totalSeen) {
    message = "Vous avez consulté toutes les méthodes. Rejouez la série et essayez maintenant de répondre avant de demander l’aide.";
  } else if (commonError?.count > 0) {
    message = `${ERROR_FEEDBACK[commonError.key].title}. ${ERROR_FEEDBACK[commonError.key].message}`;
  } else if (weakest && weakest.accuracy < 1) {
    message = `Reprenez quelques ${OPERATION_META[weakest.op].label.toLowerCase()}s pour consolider cette opération.`;
  }
  $("#coachMessage").textContent = message;
}

function finishGame() {
  const accuracy = Math.round((state.score / state.total) * 100);
  const oldBest = Number(localStorage.getItem(`astra-best-${state.mode}`) || 0);
  const best = Math.max(oldBest, state.score);
  localStorage.setItem(`astra-best-${state.mode}`, best);
  localStorage.setItem("astra-last-mode", state.mode);
  localStorage.setItem("astra-global-best", Math.max(Number(localStorage.getItem("astra-global-best") || 0), state.score));
  saveCumulativeOperationStats();

  $("#resultScore").textContent = state.score;
  $("#resultAccuracy").textContent = `${accuracy} %`;
  $("#resultStreak").textContent = state.bestStreak;
  $("#resultLevel").textContent = state.level;
  $("#resultTitle").textContent = state.score >= 9 ? "Trajectoire parfaite !" : state.score >= 7 ? "Belle trajectoire !" : state.score >= 5 ? "Vous progressez !" : "Encore un tour ?";
  $("#resultMessage").textContent = state.score > oldBest ? "Nouveau record ! Vos réflexes sur les nombres complexes prennent de la vitesse." : "Chaque série renforce les automatismes. Votre meilleur score est conservé sur cet appareil.";
  renderOperationBreakdown();
  updateBestScore();
  showScreen("result");
}

function updateBestScore() {
  const best = Number(localStorage.getItem("astra-global-best") || 0);
  $("#headerBest").textContent = best ? `${best} / 10` : "—";
}

function goHome() {
  showScreen("home");
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("astra-theme", theme);
  $("#themeButton").setAttribute("aria-label", theme === "dark" ? "Activer le thème clair" : "Activer le thème sombre");
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#101b32" : "#f4f7fb";
}

$$('[data-start]').forEach((button) => button.addEventListener("click", () => startGame(button.dataset.start)));
$("#discoverButton").addEventListener("click", () => $("#modeSection").scrollIntoView({ behavior: "smooth" }));
$("#openLabButton").addEventListener("click", openLab);
$("#labBackButton").addEventListener("click", goHome);
$("#labResetButton").addEventListener("click", resetLabPoint);
$$('[data-transform]').forEach((button) => button.addEventListener("click", () => setLabTransformation(button.dataset.transform)));
$$('[data-lab-mode]').forEach((button) => button.addEventListener("click", () => setLabMode(button.dataset.labMode)));
$("#challengeButton").addEventListener("click", validateLabChallenge);
$("#brandButton").addEventListener("click", goHome);
$("#homeButton").addEventListener("click", goHome);
$("#replayButton").addEventListener("click", () => startGame(state.mode));
$("#skipButton").addEventListener("click", skipQuestion);
$("#nextButton").addEventListener("click", () => {
  $("#feedbackDrawer").classList.remove("open");
  $("#feedbackDrawer").setAttribute("aria-hidden", "true");
  window.setTimeout(nextQuestion, 220);
});
$("#quitButton").addEventListener("click", () => $("#quitDialog").showModal());
$("#cancelQuit").addEventListener("click", () => $("#quitDialog").close());
$("#confirmQuit").addEventListener("click", () => { $("#quitDialog").close(); goHome(); });
$("#themeButton").addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));

$("#complexPlane").addEventListener("pointerdown", (event) => {
  labState.dragging = true;
  $("#complexPlane").setPointerCapture(event.pointerId);
  updateLabPointFromPointer(event);
});
$("#complexPlane").addEventListener("pointermove", (event) => {
  if (labState.dragging) updateLabPointFromPointer(event);
});
$("#complexPlane").addEventListener("pointerup", () => { labState.dragging = false; });
$("#complexPlane").addEventListener("pointercancel", () => { labState.dragging = false; });

document.addEventListener("keydown", (event) => {
  if (screens.lab.classList.contains("active") && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
    event.preventDefault();
    const moves = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, 1],
      ArrowDown: [0, -1]
    };
    moveLabPoint(...moves[event.key]);
    return;
  }
  if (!screens.game.classList.contains("active")) return;
  if (event.key >= "1" && event.key <= "4" && !state.answered) {
    const answer = $$(".answer")[Number(event.key) - 1];
    if (answer) answer.click();
  }
  if ((event.key === "Enter" || event.key === " ") && state.answered) {
    event.preventDefault();
    $("#nextButton").click();
  }
});

const preferredTheme = localStorage.getItem("astra-theme") || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
setTheme(preferredTheme);
updateBestScore();
buildPlaneTicks();
updateLabBest();
renderLab();
