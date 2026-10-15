import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  QrCode,
  ShieldCheck,
  Smartphone,
  Users
} from "lucide-react";
import Link from "next/link";
import { PLAN_CATALOG } from "@eventguard/shared";
import { Button } from "@/platform/ui/button";
import { Card, CardContent } from "@/platform/ui/card";
import { money } from "@/platform/ui/formatacao";

const benefits = [
  { icon: QrCode, title: "QR Code seguro", text: "Token opaco, hash no banco e bloqueio de duplicidade." },
  { icon: Smartphone, title: "Recepcao mobile", text: "Check-in rapido em celular, tablet ou notebook." },
  { icon: BarChart3, title: "Tempo real", text: "Presenca, ausencias e tentativas suspeitas no painel." },
  { icon: CreditCard, title: "Receita recorrente", text: "Planos, implantacao, excedentes e webhook Mercado Pago." }
];

export default function LandingPage() {
  return (
    <main className="bg-background">
      <section
        className="relative flex min-h-[82vh] items-center bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(8, 13, 23, 0.82), rgba(8, 13, 23, 0.46)), url('https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=2200&q=80')"
        }}
      >
        <div className="mx-auto w-full max-w-7xl px-5 py-20 text-white">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm backdrop-blur">
              <ShieldCheck className="h-4 w-4" />
              SaaS premium para buffets e casas de eventos
            </div>
            <h1 className="text-4xl font-semibold tracking-normal md:text-6xl">EventGuard</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/84">
              Convites digitais com QR Code, check-in mobile, relatorios de presenca e cobranca recorrente em uma base multi-tenant segura.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-11 px-5">
                <Link href="/register">
                  Criar conta
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" className="h-11 px-5 bg-white text-zinc-950 hover:bg-white/90">
                <Link href="/login">Entrar no painel</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-10 md:grid-cols-4">
        {benefits.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <Card key={benefit.title}>
              <CardContent className="space-y-3">
                <Icon className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">{benefit.title}</h2>
                <p className="text-sm leading-6 text-muted-foreground">{benefit.text}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="border-y bg-muted/40">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-2xl font-semibold">Como funciona</h2>
            <p className="mt-3 text-muted-foreground">
              Cadastre o evento, importe convidados, gere convites seguros, opere a recepcao e acompanhe tudo em tempo real.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {["Evento", "Convidados", "Convites", "Check-in"].map((step, index) => (
              <div key={step} className="rounded-lg border bg-card p-4">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <h3 className="font-medium">{step}</h3>
                <p className="mt-2 text-sm text-muted-foreground">Fluxo operacional pronto para equipes de evento.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Planos</h2>
            <p className="mt-2 text-muted-foreground">Mensalidade recorrente com controle de excedentes.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {PLAN_CATALOG.map((plan) => (
            <Card key={plan.code} className="overflow-hidden">
              <CardContent className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-2 text-3xl font-semibold">{money(plan.priceCents)}</p>
                  <p className="text-sm text-muted-foreground">por mes</p>
                </div>
                <div className="space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <p key={feature} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      {feature}
                    </p>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Inclui {plan.includedGuests.toLocaleString("pt-BR")} convidados/mes. Excedente: {money(plan.overageCents)} por convidado.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>EventGuard MVP SaaS</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy">Privacidade</Link>
            <Link href="/terms">Termos</Link>
            <span className="inline-flex items-center gap-1">
              <Users className="h-4 w-4" />
              Multi-tenant
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
