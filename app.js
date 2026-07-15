const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const screens = {
  home: $("#homeScreen"),
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

const state = {
  mode: "mix",
  round: 0,
  total: 10,
  score: 0,
  streak: 0,
  bestStreak: 0,
  level: 1,
  answered: false,
  current: null
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
  if (z.im === 0) return `${z.re}`;
  if (z.re === 0) {
    if (z.im === 1) return i;
    if (z.im === -1) return `−${i}`;
    return `${z.im < 0 ? "−" : ""}${Math.abs(z.im)}${i}`;
  }
  const coefficient = Math.abs(z.im) === 1 ? "" : Math.abs(z.im);
  return `${z.re} ${z.im < 0 ? "−" : "+"} ${coefficient}${i}`;
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

function plausibleErrors(problem) {
  const { a, b, op, result } = problem;
  const candidates = [];
  if (op === "+") {
    candidates.push(complex(a.re + b.im, a.im + b.re), complex(a.re + b.re, a.im - b.im));
  } else if (op === "−") {
    candidates.push(complex(a.re - b.re, a.im + b.im), complex(b.re - a.re, b.im - a.im));
  } else if (op === "×") {
    candidates.push(complex(a.re * b.re + a.im * b.im, a.re * b.im + a.im * b.re));
    candidates.push(complex(a.re * b.re, a.im * b.im));
  } else {
    candidates.push(complex(-result.re, result.im), complex(result.re, -result.im));
  }
  candidates.push(
    complex(result.re + randomOf([-2, -1, 1, 2]), result.im),
    complex(result.re, result.im + randomOf([-2, -1, 1, 2])),
    complex(result.im, result.re)
  );
  return candidates;
}

function buildOptions(problem) {
  const count = Math.min(4, state.level + 2);
  const result = [problem.result];
  const used = new Set([keyOf(problem.result)]);
  const candidates = plausibleErrors(problem);
  while (result.length < count) {
    const candidate = candidates.shift() || complex(
      problem.result.re + randomInt(-6, 6),
      problem.result.im + randomInt(-6, 6)
    );
    if (!used.has(keyOf(candidate))) {
      used.add(keyOf(candidate));
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

function explain(problem) {
  const { a, b, op, result } = problem;
  const B = formatComplex(b, true);
  const R = formatComplex(result, true);
  if (op === "+") {
    const real = additionStep(a.re, b.re);
    const imaginary = additionStep(a.im, b.im);
    return `On additionne séparément les parties réelles et imaginaires.<br>(${real}) + (${imaginary})<i>i</i> = ${rawNumber(result.re)} + ${signedNumber(result.im)}<i>i</i> = <b>${R}</b>.`;
  }
  if (op === "−") {
    const real = subtractionStep(a.re, b.re);
    const imaginary = subtractionStep(a.im, b.im);
    return `On soustrait séparément les parties réelles et imaginaires.<br>(${real}) + (${imaginary})<i>i</i> = ${rawNumber(result.re)} + ${signedNumber(result.im)}<i>i</i> = <b>${R}</b>.`;
  }
  if (op === "×") {
    const ac = productStep(a.re, b.re);
    const bd = productStep(a.im, b.im);
    const ad = productStep(a.re, b.im);
    const bc = productStep(a.im, b.re);
    return `On utilise (a + b<i>i</i>)(c + d<i>i</i>) = (ac − bd) + (ad + bc)<i>i</i>, car <i>i</i>² = −1.<br>[${ac} − ${bd}] + [${ad} + ${bc}]<i>i</i> = <b>${R}</b>.`;
  }
  const denominator = b.re * b.re + b.im * b.im;
  return `On multiplie le numérateur et le dénominateur par le conjugué de ${B}.<br>Le dénominateur devient ${squareStep(b.re)} + ${squareStep(b.im)} = ${denominator}. Après simplification, on obtient <b>${R}</b>.`;
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
    button.dataset.value = keyOf(option);
    button.innerHTML = `<span class="answer-key">${index + 1}</span><span>${formatComplex(option, true)}</span>`;
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

function answerQuestion(option, button) {
  if (state.answered) return;
  state.answered = true;
  const isCorrect = equal(option, state.current.result);
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
  $("#scoreValue").textContent = state.score;
  $("#streakValue").textContent = state.streak;
  showFeedback(isCorrect);
}

function skipQuestion() {
  if (state.answered) return;
  state.answered = true;
  state.streak = 0;
  $$(".answer").forEach((answer) => {
    answer.disabled = true;
    if (answer.dataset.value === keyOf(state.current.result)) answer.classList.add("correct");
  });
  showFeedback(false, true);
}

function showFeedback(isCorrect, skipped = false) {
  const drawer = $("#feedbackDrawer");
  drawer.classList.toggle("incorrect", !isCorrect);
  $("#feedbackIcon").textContent = isCorrect ? "✓" : skipped ? "?" : "×";
  $("#feedbackKicker").textContent = isCorrect ? "Bonne réponse" : skipped ? "Méthode" : "À retenir";
  $("#feedbackTitle").textContent = isCorrect ? randomOf(["Exactement !", "Bien joué !", "Impeccable !"]) : skipped ? `La réponse est ${formatComplex(state.current.result)}` : `La réponse était ${formatComplex(state.current.result)}`;
  $("#solution").innerHTML = explain(state.current);
  $("#nextButton").innerHTML = state.round === state.total ? "Voir mon bilan <span>→</span>" : "Question suivante <span>→</span>";
  drawer.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => drawer.classList.add("open"));
}

function finishGame() {
  const accuracy = Math.round((state.score / state.total) * 100);
  const oldBest = Number(localStorage.getItem(`astra-best-${state.mode}`) || 0);
  const best = Math.max(oldBest, state.score);
  localStorage.setItem(`astra-best-${state.mode}`, best);
  localStorage.setItem("astra-last-mode", state.mode);
  localStorage.setItem("astra-global-best", Math.max(Number(localStorage.getItem("astra-global-best") || 0), state.score));

  $("#resultScore").textContent = state.score;
  $("#resultAccuracy").textContent = `${accuracy} %`;
  $("#resultStreak").textContent = state.bestStreak;
  $("#resultLevel").textContent = state.level;
  $("#resultTitle").textContent = state.score >= 9 ? "Trajectoire parfaite !" : state.score >= 7 ? "Belle trajectoire !" : state.score >= 5 ? "Vous progressez !" : "Encore un tour ?";
  $("#resultMessage").textContent = state.score > oldBest ? "Nouveau record ! Vos réflexes sur les nombres complexes prennent de la vitesse." : "Chaque série renforce les automatismes. Votre meilleur score est conservé sur cet appareil.";
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

document.addEventListener("keydown", (event) => {
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
