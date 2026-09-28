import "./globals.css";
import type { Metadata, Viewport } from "next";
import InstallPrompt from "../components/InstallPrompt";

export const metadata: Metadata = {
  title: "Culture Diecast Chile Market",
  description: "Ventas, permutas y búsquedas de la comunidad Culture Diecast Chile",
  applicationName: "Culture Diecast Chile Market",
  appleWebApp: { capable: true, title: "CDC Market", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#151515",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
        />
        {/* Tema oscuro por defecto (como Hot Wheels Showcase); respeta la elección guardada. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('theme')==='light'){document.documentElement.classList.remove('dark');}}catch(e){}`,
          }}
        />
      </head>
      <body>
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
