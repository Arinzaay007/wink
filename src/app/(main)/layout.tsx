import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="relative min-h-[calc(100vh-200px)]">{children}</main>
      <Footer />
    </>
  );
}
