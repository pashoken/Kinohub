import { useEffect, type RefObject } from "react";

const focusSelector =
  'a[href]:not([tabindex="-1"]), button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusAndReveal(
  element: HTMLElement | null,
  block: ScrollLogicalPosition = "center",
  inline: ScrollLogicalPosition = "center",
) {
  if (!element) return;
  element.focus({ preventScroll: true });
  if (typeof element.scrollIntoView !== "function") return;
  element.scrollIntoView({
    block,
    inline,
    behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}

function focusNavigationTarget(element: HTMLElement) {
  const isPageChrome = Boolean(element.closest("header, nav")) || element.matches(".back");
  focusAndReveal(
    element,
    isPageChrome ? "nearest" : "center",
    isPageChrome ? "nearest" : "center",
  );
}
function visible(element: HTMLElement) {
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return (
    style.visibility !== "hidden" &&
    style.display !== "none" &&
    rect.width > 0 &&
    rect.height > 0
  );
}

type Direction = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";
const navigationGridSelector = ".rail, .movie-grid, .result-grid, .actions, .episode-picker, .player-ready, .file-list, .choice-list, .rating-grid, .season-grid, .search-field, nav";

function visualRows(elements: HTMLElement[]): HTMLElement[][] {
  const sorted = [...elements].sort((left, right) => {
    const a = left.getBoundingClientRect();
    const b = right.getBoundingClientRect();
    return a.top - b.top || a.left - b.left;
  });
  const rows: Array<{ center: number; height: number; items: HTMLElement[] }> = [];
  for (const element of sorted) {
    const rect = element.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const row = rows.find((candidate) => Math.abs(candidate.center - center) <= Math.max(18, Math.min(candidate.height, rect.height) * 0.45));
    if (row) {
      row.items.push(element);
      row.center = row.items.reduce((sum, item) => { const itemRect = item.getBoundingClientRect(); return sum + itemRect.top + itemRect.height / 2; }, 0) / row.items.length;
      row.height = Math.max(row.height, rect.height);
    } else rows.push({ center, height: rect.height, items: [element] });
  }
  return rows.sort((left, right) => left.center - right.center).map((row) => row.items.sort((left, right) => left.getBoundingClientRect().left - right.getBoundingClientRect().left));
}

export function gridNavigationTarget(current: HTMLElement, elements: HTMLElement[], direction: Direction): HTMLElement | undefined {
  const rows = visualRows(elements);
  const rowIndex = rows.findIndex((row) => row.includes(current));
  if (rowIndex < 0) return undefined;
  const row = rows[rowIndex]!;
  if (direction === "ArrowLeft" || direction === "ArrowRight") {
    const index = row.indexOf(current);
    return row[index + (direction === "ArrowLeft" ? -1 : 1)];
  }
  const targetRow = rows[rowIndex + (direction === "ArrowUp" ? -1 : 1)];
  if (!targetRow) return undefined;
  const rect = current.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  return [...targetRow].sort((left, right) => {
    const a = left.getBoundingClientRect();
    const b = right.getBoundingClientRect();
    return Math.abs(a.left + a.width / 2 - x) - Math.abs(b.left + b.width / 2 - x);
  })[0];
}

export function useSpatialNavigation() {
  useEffect(() => {
    const handleBack = (event: Event): boolean => {
      const dialog = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].at(-1);
      const close = dialog?.querySelector<HTMLElement>("[data-dialog-close]");
      if (close) { event.preventDefault(); close.click(); return true; }
      if (document.activeElement instanceof HTMLInputElement) {
        event.preventDefault(); document.activeElement.blur(); return true;
      }
      return false;
    };
    const handler = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" ||
        event.key === "BrowserBack" ||
        (event.key === "Backspace" &&
          !(event.target instanceof HTMLInputElement))
      ) {
        if (handleBack(event)) return;
      }
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key))
        return;
      const direction = event.key as Direction;
      if (
        event.target instanceof HTMLInputElement &&
        ["ArrowLeft", "ArrowRight"].includes(event.key)
      )
        return;
      const dialog = [
        ...document.querySelectorAll<HTMLElement>('[role="dialog"]'),
      ].at(-1);
      const scope: ParentNode = dialog ?? document;
      const candidates = [
        ...scope.querySelectorAll<HTMLElement>(focusSelector),
      ].filter(visible);
      if (!candidates.length) return;
      const current =
        document.activeElement instanceof HTMLElement &&
        candidates.includes(document.activeElement)
          ? document.activeElement
          : undefined;
      if (!current) {
        event.preventDefault();
        focusNavigationTarget(candidates[0]!);
        return;
      }
      const navigationGrid = current.closest<HTMLElement>(navigationGridSelector);
      if (navigationGrid) {
        const scoped = [...navigationGrid.querySelectorAll<HTMLElement>(focusSelector)].filter(visible);
        const target = gridNavigationTarget(current, scoped, direction);
        if (target) {
          event.preventDefault();
          focusNavigationTarget(target);
          return;
        }
        if (direction === "ArrowLeft" || direction === "ArrowRight") {
          event.preventDefault();
          return;
        }
      }
      if (direction === "ArrowUp" || direction === "ArrowDown") {
        const currentRail = current.closest<HTMLElement>(".rail");
        if (currentRail) {
          const rails = [...document.querySelectorAll<HTMLElement>(".rail")];
          const railIndex = rails.indexOf(currentRail);
          const offset = direction === "ArrowUp" ? -1 : 1;
          const targetRail = rails[railIndex + offset];
          if (targetRail) {
            const from = current.getBoundingClientRect();
            const fromX = from.left + from.width / 2;
            const target = [...targetRail.querySelectorAll<HTMLElement>(focusSelector)]
              .filter(visible)
              .sort((left, right) => {
                const leftRect = left.getBoundingClientRect();
                const rightRect = right.getBoundingClientRect();
                return Math.abs(leftRect.left + leftRect.width / 2 - fromX)
                  - Math.abs(rightRect.left + rightRect.width / 2 - fromX);
              })[0];
            if (target) {
              event.preventDefault();
              focusNavigationTarget(target);
              return;
            }
          }
        }
      }
      const from = current.getBoundingClientRect();
      const fx = from.left + from.width / 2;
      const fy = from.top + from.height / 2;
      const vertical = event.key === "ArrowUp" || event.key === "ArrowDown";
      const sign =
        event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1;
      const rankDirectional = (pool: HTMLElement[]) => pool
        .filter((candidate) => candidate !== current)
        .map((candidate) => {
          const rect = candidate.getBoundingClientRect();
          const dx = rect.left + rect.width / 2 - fx;
          const dy = rect.top + rect.height / 2 - fy;
          const primary = vertical ? dy : dx;
          const secondary = vertical ? dx : dy;
          return {
            candidate,
            primary,
            score: Math.abs(primary) * 10 + Math.abs(secondary),
          };
        })
        .filter((entry) => Math.sign(entry.primary) === sign)
        .sort((a, b) => a.score - b.score);
      const contentScope = current.closest<HTMLElement>("section, article");
      const contentCandidates = contentScope
        ? [...contentScope.querySelectorAll<HTMLElement>(focusSelector)].filter(visible)
        : [];
      const localRanked = rankDirectional(contentCandidates);
      if (localRanked[0]) {
        event.preventDefault();
        focusNavigationTarget(localRanked[0].candidate);
        return;
      }
      const ranked = rankDirectional(candidates);
      if (ranked[0]) {
        event.preventDefault();
        focusNavigationTarget(ranked[0].candidate);
      }
    };
    const nativeBack = (event: Event) => { handleBack(event); };
    document.addEventListener("keydown", handler);
    window.addEventListener("kinohub-back", nativeBack);
    return () => { document.removeEventListener("keydown", handler); window.removeEventListener("kinohub-back", nativeBack); };
  }, []);
}

export function usePageFocus(key: string, active = true) {
  useEffect(() => {
    if (!active) return;
    queueMicrotask(() => {
      if (document.querySelector('[role="dialog"]')) return;
      const preferred = document.querySelector<HTMLElement>("[data-page-autofocus]");
      const fallback = document.querySelector<HTMLElement>(`main ${focusSelector}`);
      const target = preferred ?? fallback;
      focusAndReveal(
        target,
        target?.dataset.pageAutofocusBlock === "nearest" ? "nearest" : "center",
        "nearest",
      );
    });
  }, [key, active]);
}

export function useDialogFocus(
  active: boolean,
  ref: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const origin =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const first = ref.current.querySelector<HTMLElement>(focusSelector);
    queueMicrotask(() => first?.focus());
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !ref.current) return;
      const items = [
        ...ref.current.querySelectorAll<HTMLElement>(focusSelector),
      ].filter(visible);
      if (!items.length) return;
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        items.at(-1)?.focus();
      }
      if (!event.shiftKey && index === items.length - 1) {
        event.preventDefault();
        items[0]?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      queueMicrotask(() => {
        if (origin?.isConnected) origin.focus();
        else
          document
            .querySelector<HTMLElement>(".details .actions button")
            ?.focus();
      });
    };
  }, [active, ref]);
}
