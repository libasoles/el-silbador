import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

const SITE_URL = "https://elsilbador.com.ar";
const TITLE = "Acordes de Canciones para Guitarra y Folklore | El Silbador";
const DESCRIPTION =
  "Acordes de canciones para guitarra, folklore argentino y más. El Silbador es un cancionero para encontrar, crear y compartir letras con acordes.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s — El Silbador" },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  icons: {
    icon: [
      {
        url: "/favicon-light.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon-dark.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    siteName: "El Silbador",
    locale: "es_AR",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/banner.png", width: 1734, height: 907, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/banner.png"],
  },
};

export const viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <div className="page-shell">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
