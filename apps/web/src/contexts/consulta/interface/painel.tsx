"use client";

import { Activity, CalendarDays, TrendingUp, Users, Zap } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge } from "@/platform/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/ui/card";
import { useEventos } from "@/contexts/recepcao";
import { usePainelDoEvento } from "../application/consulta";
import { presencaPorEvento, resumoDosEventos } from "../domain/consulta";

const icons = [CalendarDays, Users, Zap, TrendingUp, Activity];

export default function DashboardPage() {
  const { data: events = [] } = useEventos();
  const { data: eventDashboard } = usePainelDoEvento(events[0]?.id);
  const { totalEvents, totalGuests, totalCheckins, activeEvents, attendanceRate } = resumoDosEventos(events);

  const metrics = [
    { label: "Eventos", value: String(totalEvents), delta: `${activeEvents} ativos` },
    { label: "Convidados", value: totalGuests.toLocaleString("pt-BR"), delta: "total" },
    { label: "Check-ins", value: totalCheckins.toLocaleString("pt-BR"), delta: "total" },
    { label: "Taxa de presenca", value: `${attendanceRate}%`, delta: "media" },
    { label: "Eventos ativos", value: String(activeEvents), delta: "agora" }
  ];

  const checkinsByHour = (eventDashboard?.checkinsByHour ?? []).map((item) => ({
    hour: new Date(item.hour).toLocaleTimeString("pt-BR", { hour: "2-digit" }),
    total: item.count
  }));

  const eventPresence = presencaPorEvento(events);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Operacao, presenca e receita em tempo real.</p>
        </div>
        <Badge tone="success">Conta ativa</Badge>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric, index) => {
          const Icon = icons[index];
          return (
            <Card key={metric.label}>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{metric.label}</span>
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-semibold">{metric.value}</p>
                <Badge tone="success">{metric.delta}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Check-ins por hora {events[0] ? `· ${events[0].name}` : ""}</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={checkinsByHour}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Presenca por evento</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventPresence}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="presentes" stackId="a" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ausentes" stackId="a" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Proximos eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="responsive-table text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-3">Evento</th>
                <th>Local</th>
                <th>Capacidade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b last:border-0">
                  <td className="py-3 font-medium" data-label="Evento">
                    {event.name}
                  </td>
                  <td data-label="Local">{event.locationName}</td>
                  <td data-label="Capacidade">{event.capacity}</td>
                  <td data-label="Status">
                    <Badge tone={event.status === "ACTIVE" ? "success" : "warning"}>{event.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
