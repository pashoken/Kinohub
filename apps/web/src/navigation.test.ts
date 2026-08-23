// @vitest-environment jsdom
import { cleanup, fireEvent, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { focusAndReveal, gridNavigationTarget, useDialogFocus, useSpatialNavigation } from "./navigation.js";

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

function element(left: number, top: number, width = 180, height = 280) {
  const node = document.createElement("a");
  node.getBoundingClientRect = () => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) });
  return node;
}

describe("TV grid navigation", () => {
  it("keeps the focused item centered while content scrolls beneath it", () => {
    const card = document.createElement("a");
    card.focus = vi.fn();
    card.scrollIntoView = vi.fn();

    focusAndReveal(card);

    expect(card.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(card.scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({
      block: "center",
      inline: "center",
    }));
  });

  it("allows initial page focus to avoid horizontal repositioning", () => {
    const card = document.createElement("a");
    card.scrollIntoView = vi.fn();

    focusAndReveal(card, "center", "nearest");

    expect(card.scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({
      block: "center",
      inline: "nearest",
    }));
  });

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

  it("moves through every torrent row without escaping the modal", () => {
    const header = document.createElement("header");
    const home = document.createElement("button");
    home.textContent = "Главная";
    header.append(home);
    const dialog = document.createElement("section");
    dialog.setAttribute("role", "dialog");
    const list = document.createElement("div");
    list.className = "choice-list";
    const choices = [0, 100, 200].map((top, index) => {
      const button = document.createElement("button");
      button.textContent = `Раздача ${index + 1}`;
      button.getBoundingClientRect = () => ({ left: 0, top, width: 500, height: 80, right: 500, bottom: top + 80, x: 0, y: top, toJSON: () => ({}) });
      button.scrollIntoView = vi.fn();
      list.append(button);
      return button;
    });
    dialog.append(list);
    document.body.append(header, dialog);
    renderHook(() => useSpatialNavigation());

    choices[0]!.focus();
    fireEvent.keyDown(choices[0]!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(choices[1]);
    fireEvent.keyDown(choices[1]!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(choices[2]);
    fireEvent.keyDown(choices[2]!, { key: "ArrowUp" });
    expect(document.activeElement).toBe(choices[1]);
    expect(document.activeElement).not.toBe(home);
  });

  it("returns programmatic focus from the header to the top modal", async () => {
    const home = document.createElement("button");
    home.textContent = "Главная";
    const dialog = document.createElement("section");
    dialog.setAttribute("role", "dialog");
    const close = document.createElement("button");
    close.textContent = "Закрыть";
    close.scrollIntoView = vi.fn();
    dialog.append(close);
    document.body.append(home, dialog);
    const ref = { current: dialog };
    renderHook(() => useDialogFocus(true, ref));
    await waitFor(() => expect(document.activeElement).toBe(close));

    home.focus();
    await waitFor(() => expect(document.activeElement).toBe(close));
  });
});
