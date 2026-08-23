// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { gridNavigationTarget } from "./navigation.js";

function element(left: number, top: number, width = 180, height = 280) {
  const node = document.createElement("a");
  node.getBoundingClientRect = () => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) });
  return node;
}

describe("TV grid navigation", () => {
  it("moves strictly through every card in a visual row", () => {
    const cards = [element(0, 0), element(200, 0), element(400, 0), element(600, 0)];
    expect(gridNavigationTarget(cards[0]!, cards, "ArrowRight")).toBe(cards[1]);
    expect(gridNavigationTarget(cards[1]!, cards, "ArrowRight")).toBe(cards[2]);
    expect(gridNavigationTarget(cards[2]!, cards, "ArrowLeft")).toBe(cards[1]);
  });

  it("keeps the closest column between wrapped rows", () => {
    const cards = [element(0, 0), element(200, 0), element(400, 0), element(0, 320), element(200, 320), element(400, 320)];
    expect(gridNavigationTarget(cards[1]!, cards, "ArrowDown")).toBe(cards[4]);
    expect(gridNavigationTarget(cards[5]!, cards, "ArrowUp")).toBe(cards[2]);
  });

  it("does not jump to a different row at a horizontal edge", () => {
    const cards = [element(0, 0), element(200, 0), element(0, 320)];
    expect(gridNavigationTarget(cards[1]!, cards, "ArrowRight")).toBeUndefined();
  });
});
