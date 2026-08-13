import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./crud.css";
import "./local-login.css";
import "./workflow.css";
import "./repository.css";
import "./public-dashboard.css";
import "./public-drilldown.css";
import "./public-hero.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SatuNilai — Manajemen Penilaian Pemerintah",
  description: "Kelola penilaian SPBE, EPSS, Indeks SDI, ITKP, dan bukti dukung dalam satu ruang kerja.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
