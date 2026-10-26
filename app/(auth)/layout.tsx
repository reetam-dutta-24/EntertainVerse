import { AuthShowcase } from "@/components/auth/auth-showcase";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid min-h-dvh w-full lg:grid-cols-2">
      <AuthShowcase />
      <div className="flex min-h-dvh min-w-0 items-center justify-center bg-night px-5 py-10">
        {children}
      </div>
    </div>
  );
}
