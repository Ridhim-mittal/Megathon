import test from "node:test";
import assert from "node:assert/strict";
import { SNAKE, buysPct, createSnake, priceAt, snakeResult, stepEvery, stepSnake, turn } from "./priceSnake.js";

const run = (s, steps) => {
  for (let i = 0; i < steps && s.state === "running"; i++) stepSnake(s, stepEvery(s.year) + 1e-6);
};

test("price snake: prices grow 6% a year, so ₹100 buys less", () => {
  assert.equal(priceAt(0), 100);
  assert.equal(priceAt(1), 106);
  assert.equal(priceAt(12), 201);
  assert.equal(buysPct(12), 50);
});

test("price snake: eating a year grows the snake, the price and the history", () => {
  const s = createSnake(() => 0);
  s.food = { x: 6, y: s.body[0].y };
  run(s, 1);
  assert.equal(s.year, 1);
  assert.equal(s.price, 106);
  assert.equal(s.body.length, 4);
  assert.deepEqual(s.history, [100, 106]);
  assert.equal(s.pops[0].text, "+₹6");
});

test("price snake: hitting the wall ends the game; turning back is ignored", () => {
  const s = createSnake(() => 0.99);
  s.food = { x: 0, y: 0 };
  turn(s, "left");
  assert.deepEqual(s.queue, []);
  run(s, 50);
  assert.equal(s.state, "over");
  assert.equal(s.reason, "wall");
  assert.equal(snakeResult(s).score, 0);
});

test("price snake: reaching age 36 is a win", () => {
  const s = createSnake(() => 0);
  for (let i = 0; i < SNAKE.maxYears && s.state === "running"; i++) {
    s.dir = "right";
    s.body = [
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    s.food = { x: 2, y: 1 };
    run(s, 1);
  }
  assert.equal(s.reason, "win");
  assert.equal(s.year, SNAKE.maxYears);
  assert.equal(s.history.length, SNAKE.maxYears + 1);
});
