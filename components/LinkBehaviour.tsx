"use client";

import * as React from "react";
import NextLink, { type LinkProps as NextLinkProps } from "next/link";

// Adapter so MUI components (Link, Button, CardActionArea, …) navigate via
// next/link. Registered on the theme as the default link component, which lets
// Server Components pass only `href` (a string) — never a function across the
// RSC boundary.
const LinkBehaviour = React.forwardRef<
  HTMLAnchorElement,
  Omit<NextLinkProps, "href"> &
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
      href: NextLinkProps["href"];
    }
>(function LinkBehaviour(props, ref) {
  return <NextLink ref={ref} {...props} />;
});

export default LinkBehaviour;
