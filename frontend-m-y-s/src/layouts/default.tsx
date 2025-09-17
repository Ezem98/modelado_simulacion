import { Link } from "@heroui/link";
import { Divider } from "@heroui/react";

import NavbarComponent from "@/components/navbar";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#020617] relative">
      {/* Dark Radial Glow Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(circle 500px at 50% 200px, #3e3e3e, transparent)`,
        }}
      />
      
      {/* Content Container */}
      <div className="relative z-10 flex flex-col h-screen">
        <NavbarComponent />
        <main className="flex-1 grid grid-cols-[1fr_3fr] overflow-hidden">
          {children}
        </main>
        <Divider className="bg-gray-600" />
        <footer className="w-full flex items-center justify-center py-3 flex-shrink-0">
          <Link
            isExternal
            className="flex items-center gap-1 text-current"
            href="https://heroui.com"
            title="heroui.com homepage"
          >
            <span className="text-gray-400">Diseño por Ezequiel Machado.</span>
            <p className="text-primary">Grupo 02</p>
          </Link>
        </footer>
      </div>
    </div>
  );
}
