import Link from "next/link";
import { Card, Badge } from "@/components/ui/card";
import { TrendChart, type TrendPoint } from "@/components/admin/trend-chart";
import { prisma } from "@/lib/prisma";

const formatLabels = { BOULES: "Boules", BELOTE: "Belote" } as const;

function buildTrendPoints(dates: Date[], firstActivityDate: Date): TrendPoint[] {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(firstActivityDate);
  start.setUTCHours(0, 0, 0, 0);
  const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1);
  const counts = new Map<string, number>();

  for (const date of dates) {
    const day = new Date(date);
    day.setUTCHours(0, 0, 0, 0);
    if (day < start || day > end) continue;
    const key = day.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let cumulative = dates.filter((date) => date < start).length;
  const labelFormatter = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    ...(start.getUTCFullYear() === end.getUTCFullYear() ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
  const points: TrendPoint[] = [];

  for (let index = 0; index < days; index += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    const key = day.toISOString().slice(0, 10);
    cumulative += counts.get(key) ?? 0;
    points.push({ label: labelFormatter.format(day), value: cumulative });
  }

  return points;
}

export default async function PublicStatisticsPage() {
  const [users, tournaments, teams, aurardMatches, poolMatches, bracketMatches, formats] = await Promise.all([
    prisma.user.findMany({ select: { createdAt: true } }),
    prisma.tournament.findMany({ select: { createdAt: true } }),
    prisma.team.findMany({ select: { createdAt: true } }),
    prisma.aurardMatch.count({ where: { status: "DONE" } }),
    prisma.poolMatch.count({ where: { status: "DONE" } }),
    prisma.bracketMatch.count({ where: { status: "DONE" } }),
    prisma.tournament.groupBy({ by: ["format"], _count: { _all: true } }),
  ]);

  const playedMatches = aurardMatches + poolMatches + bracketMatches;
  const accountDates = users.map((user) => user.createdAt);
  const tournamentDates = tournaments.map((tournament) => tournament.createdAt);
  const teamDates = teams.map((team) => team.createdAt);
  const allActivityDates = [...accountDates, ...tournamentDates, ...teamDates];
  const firstActivityDate = allActivityDates.length > 0
    ? new Date(Math.min(...allActivityDates.map((date) => date.getTime())))
    : new Date();
  const accountTrend = buildTrendPoints(accountDates, firstActivityDate);
  const tournamentTrend = buildTrendPoints(tournamentDates, firstActivityDate);
  const teamTrend = buildTrendPoints(teamDates, firstActivityDate);

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div>
          <Link href="/" className="text-[15px] text-muted hover:text-foreground">← Accueil</Link>
          <p className="mt-8 text-[14px] font-semibold uppercase tracking-wide text-accent">L’application en chiffres</p>
          <h1 className="mt-2 text-3xl font-bold">Statistiques</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Une vue d’ensemble de l’activité de l&apos;application.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Comptes créés", users.length],
            ["Concours créés", tournaments.length],
            ["Équipes inscrites", teams.length],
            ["Parties jouées", playedMatches],
          ].map(([label, value]) => (
            <Card key={label} className="flex flex-col gap-2">
              <p className="text-[14px] text-muted">{label}</p>
              <p className="text-3xl font-bold text-accent">{value}</p>
            </Card>
          ))}
        </div>

        <section aria-labelledby="evolution-title">
          <div>
            <h2 id="evolution-title" className="text-2xl font-bold">La croissance de l’application</h2>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <TrendChart id="public-accounts" title="Comptes créés" description="Progression cumulée des comptes utilisateurs." color="#0a84ff" points={accountTrend} />
            </div>
            <TrendChart id="public-tournaments" title="Concours créés" description="Progression cumulée des concours." color="#bf7af0" points={tournamentTrend} />
            <TrendChart id="public-teams" title="Équipes inscrites" description="Progression cumulée des équipes." color="#30d158" points={teamTrend} />
          </div>
        </section>

        <div>
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Disciplines</h2>
              </div>
              <Badge>{tournaments.length}</Badge>
            </div>
            <div className="mt-5 flex flex-col gap-3">
              {formats.length === 0 ? <p className="text-muted">Aucun concours.</p> : formats.map((item) => (
                <div key={item.format} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <span>{formatLabels[item.format]}</span>
                  <Badge>{item._count._all}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <p className="text-center text-[13px] text-muted">Statistiques mises à jour automatiquement.</p>
      </div>
    </main>
  );
}
