import { useEffect, type RefObject } from "react";

const focusSelector =
  'a[href]:not([tabindex="-1"]), button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusAndReveal(element: HTMLElement | null, block: ScrollLogicalPosition = "center") {
  if (!element) return;
  element.focus({ preventScroll: true });
  if (typeof element.scrollIntoView !== "function") return;
  element.scrollIntoView({
    block,
    inline: "nearest",
    behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
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

export function useSpatialNavigation() {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" ||
        event.key === "BrowserBack" ||
        (event.key === "Backspace" &&
          !(event.target instanceof HTMLInputElement))
      ) {
        const dialog = [
          ...document.querySelectorAll<HTMLElement>('[role="dialog"]'),
        ].at(-1);
        const close = dialog?.querySelector<HTMLElement>("[data-dialog-close]");
        if (close) {
          event.preventDefault();
          close.click();
          return;
        }
      }
      if (
        !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      )
        return;
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
        candidates[0]?.focus();
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const horizontalScope = current.closest<HTMLElement>(".rail, nav, .actions, .player-ready");
        if (horizontalScope) {
          const scoped = [...horizontalScope.querySelectorAll<HTMLElement>(focusSelector)].filter(visible);
          const index = scoped.indexOf(current);
          const offset = event.key === "ArrowLeft" ? -1 : 1;
          const next = scoped[index + offset];
          event.preventDefault();
          if (next) {
            next.focus({ preventScroll: true });
            next.scrollIntoView({
              block: "nearest",
              inline: "center",
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
            });
          }
          return;
        }
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const currentRail = current.closest<HTMLElement>(".rail");
        if (currentRail) {
          const rails = [...document.querySelectorAll<HTMLElement>(".rail")];
          const railIndex = rails.indexOf(currentRail);
          const offset = event.key === "ArrowUp" ? -1 : 1;
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
              focusAndReveal(target, "nearest");
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
      const ranked = candidates
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
      if (ranked[0]) {
        event.preventDefault();
        ranked[0].candidate.focus({ preventScroll: true });
        ranked[0].candidate.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
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
