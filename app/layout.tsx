import "./globals.css";
import type { Metadata, Viewport } from "next";
import InstallPrompt from "../components/InstallPrompt";

export const metadata: Metadata = {
  title: "Culture Diecast Chile Market",
  description: "Ventas, permutas y búsquedas de la comunidad Culture Diecast Chile",
  applicationName: "Culture Diecast Chile Market",
  appleWebApp: {
    capable: true,
    title: "CDC Market",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f59e0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme');
                if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
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
