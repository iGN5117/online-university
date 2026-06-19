import { useEffect, useState } from "react";

// Height (px) of the on-screen keyboard currently covering the bottom of the
// layout viewport — 0 when no keyboard is shown. Lets fixed-position panels
// lift above the keyboard instead of being hidden behind it on mobile.
// Relies on the visualViewport API (supported on iOS Safari and Chrome).
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // How far the visual viewport's bottom sits above the layout viewport's
      // bottom — i.e. how much the keyboard (and browser UI) covers.
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      setInset(Math.max(0, Math.round(covered)));
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
