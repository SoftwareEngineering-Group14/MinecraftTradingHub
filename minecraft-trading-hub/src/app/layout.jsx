import "./globals.css";

export const metadata = {
  title: "Minecraft Trading Hub",
  description: "Your one-stop destination for all Minecraft trading needs!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className="antialiased"
      >
        {children}
      </body>
    </html>
  );
}
