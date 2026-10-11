// Price Snake (L03 Inflation): the classic phone snake, but the snake is Mehngai, rising prices.
// Every "+1 year" calendar it eats makes a year pass: a bag of groceries that cost ₹100 at the
// start costs 6% more, and the snake grows longer and heavier. Crash into a wall or yourself, or
// reach age 36, and the result screen shows how heavy prices got. Pure logic, no DOM.

export const SNAKE = {
  cols: 20,
  rows: 12,
  start: 100,
  rate: 0.06,
  maxYears: 25,
  startAge: 11,
};

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

export const priceAt = (year) => Math.round(SNAKE.start * (1 + SNAKE.rate) ** year);
// How much of the bag ₹100 kept in a tin box still buys, in percent.
export const buysPct = (year) => Math.round((SNAKE.start / priceAt(year)) * 100);
// Seconds per step: a little faster every year.
export const stepEvery = (year) => Math.max(0.085, 0.18 - year * 0.004);

export function createSnake(rng = Math.random) {
  const y = Math.floor(SNAKE.rows / 2);
  const body = [
    { x: 5, y },
    { x: 4, y },
    { x: 3, y },
  ];
  const s = {
    id: "priceSnake",
    body,
    prev: body,
    dir: "right",
    queue: [],
    year: 0,
    price: SNAKE.start,
    history: [SNAKE.start],
    acc: 0,
    time: 0,
    state: "running",
    reason: null,
    pops: [],
    rng,
  };
  s.food = placeFood(s);
  return s;
}

function placeFood(s) {
  const free = [];
  for (let y = 0; y < SNAKE.rows; y++) for (let x = 0; x < SNAKE.cols; x++) if (!s.body.some((b) => b.x === x && b.y === y)) free.push({ x, y });
  return free[Math.floor(s.rng() * free.length)] ?? null;
}

// Queue a turn (at most two ahead, never straight back).
export function turn(s, dir) {
  if (!DIRS[dir]) return;
  const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
  if (dir === last || dir === OPPOSITE[last] || s.queue.length >= 2) return;
  s.queue.push(dir);
}

// Advances by dt seconds; returns true when the game is over.
export function stepSnake(s, dt) {
  if (s.state !== "running") return true;
  s.time += dt;
  s.pops = s.pops.filter((p) => s.time - p.at < 1.1);
  s.acc += dt;
  const every = stepEvery(s.year);
  while (s.acc >= every && s.state === "running") {
    s.acc -= every;
    move(s);
  }
  return s.state !== "running";
}

function move(s) {
  if (s.queue.length) s.dir = s.queue.shift();
  const [dx, dy] = DIRS[s.dir];
  const head = { x: s.body[0].x + dx, y: s.body[0].y + dy };
  const eats = s.food && head.x === s.food.x && head.y === s.food.y;
  s.prev = s.body;
  if (head.x < 0 || head.y < 0 || head.x >= SNAKE.cols || head.y >= SNAKE.rows) return end(s, "wall");
  // The tail moves away this step unless the snake is growing.
  const body = eats ? s.body : s.body.slice(0, -1);
  if (body.some((b) => b.x === head.x && b.y === head.y)) return end(s, "self");
  s.body = [head, ...body];
  if (!eats) return;
  const before = s.price;
  s.year += 1;
  s.price = priceAt(s.year);
  s.history.push(s.price);
  s.pops.push({
    x: head.x,
    y: head.y,
    text: `+₹${s.price - before}`,
    at: s.time,
  });
  if (s.year >= SNAKE.maxYears) return end(s, "win");
  s.food = placeFood(s);
}

function end(s, reason) {
  s.state = "over";
  s.reason = reason;
}

export function snakeResult(s) {
  return {
    id: "priceSnake",
    score: s.year,
    years: s.year,
    price: s.price,
    history: s.history,
    reason: s.reason,
  };
}
