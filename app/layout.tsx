import "./globals.css";

export const metadata = {
  title: "Diecast Chile Market",
  description: "Ventas, permutas y expos de la comunidad Diecast Chile",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
