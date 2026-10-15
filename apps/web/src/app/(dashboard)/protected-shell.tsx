"use client";

import {
  BarChart3,
  CalendarDays,
  CreditCard,
  Gauge,
  LogOut,
  Menu,
  Moon,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  UserRound,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/identidade";
import { Button } from "@/platform/ui/button";
import { cn } from "@/platform/ui/formatacao";
import { Input } from "@/platform/ui/input";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/events", label: "Eventos", icon: CalendarDays },
  { href: "/guests", label: "Convidados", icon: Users },
  { href: "/checkin", label: "Check-in", icon: QrCode },
  { href: "/reports", label: "Relatorios", icon: BarChart3 },
  { href: "/users", label: "Usuarios", icon: ShieldCheck },
  { href: "/billing", label: "Financeiro", icon: CreditCard },
  { href: "/settings", label: "Configuracoes", icon: Settings },
  { href: "/profile", label: "Perfil", icon: UserRound }
];

export function ProtectedShell({ children }: PropsWithChildren) {
  const { session, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (ready && !session) {
      router.push("/login");
    }
  }, [ready, router, session]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!ready || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">EventGuard</p>
          <p className="text-xs text-muted-foreground">{session.user.tenant?.name ?? "Admin global"}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm transition",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <Button variant="ghost" className="w-full justify-start" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{sidebar}</div>
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden">
          <div className="h-full w-72">{sidebar}</div>
          <Button
            size="icon"
            variant="secondary"
            className="absolute right-4 top-4"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <Button size="icon" variant="ghost" className="lg:hidden" aria-label="Abrir menu" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="relative hidden flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="max-w-md pl-9" placeholder="Buscar eventos, convidados e pagamentos" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Alternar tema"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="hidden h-4 w-4 dark:block" />
            </Button>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{session.user.name}</p>
              <p className="text-xs text-muted-foreground">{session.user.roles.join(", ")}</p>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1560px] px-4 py-5 md:px-6">{children}</main>
      </div>
    </div>
  );
}
