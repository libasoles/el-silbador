import { Inter } from "next/font/google";
import type { ReactNode } from "react";

// Article prose font, scoped to /articulos so the rest of the app doesn't preload it.
const inter = Inter({ subsets: ["latin"], variable: "--article-sans", display: "swap" });

export default function ArticlesLayout({ children }: { children: ReactNode }) {
  return <div className={inter.variable}>{children}</div>;
}
