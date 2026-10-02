"use client";

import { createContext, useContext } from "react";
import { createPortal } from "react-dom";

/** The footer element of the BottomSheet a component is rendered in, if any. */
export const SheetFooterContext = createContext<HTMLElement | null>(null);

/**
 * A form's action buttons. Inside a BottomSheet they move into the sheet's
 * fixed footer, so they stay in view while the content above scrolls;
 * anywhere else they render in place with `inlineClassName`.
 *
 * List the primary action first, as inline rows do — in the sheet footer
 * the row is reversed, so the primary lands at the right edge with the
 * secondary action just before it.
 *
 * A moved submit button leaves its <form> in the DOM, so give the form an
 * id and the button a matching `form` attribute.
 */
export function SheetActions({
  children,
  inlineClassName = "flex flex-wrap gap-3",
}: {
  children: React.ReactNode;
  inlineClassName?: string;
}) {
  const footer = useContext(SheetFooterContext);
  if (!footer) return <div className={inlineClassName}>{children}</div>;
  return createPortal(
    <div className="flex flex-row-reverse flex-wrap justify-start gap-2">
      {children}
    </div>,
    footer,
  );
}
