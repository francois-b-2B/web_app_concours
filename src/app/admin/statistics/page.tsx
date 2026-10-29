import { Card, Badge } from "@/components/ui/card";
import { TrendChart, type TrendPoint } from "@/components/admin/trend-chart";
import { prisma } from "@/lib/prisma";

const formatLabels = { BOULES: "Boules", BELOTE: "Belote" } as const;
const statusLabels = {
  REGISTRATION: "Inscriptions",
  DRAWN: "Tirage effectué",
  POOLS_IN_PROGRESS: "Phase de qualification",
  FINALS: "Tableau final",
  DONE: "Terminés",
} as const;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

function buildTrendPoints(dates: Date[], days = 30): TrendPoint[] {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  const counts = new Map<string, number>();

  for (const date of dates) {
    const day = new Date(date);
    day.setUTCHours(0, 0, 0, 0);
    if (day < start || day > end) continue;
    const key = day.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let cumulative = dates.filter((date) => date < start).length;
  const labelFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
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

export default async function AdminStatisticsPage() {
  const [userCount, tournamentCount, teamCount, contactCount, formats, statuses, users, tournamentsForTrend, teamsForTrend] = await Promise.all([
    prisma.user.count(),
    prisma.tournament.count(),
    prisma.team.count(),
    prisma.contactMessage.count(),
    prisma.tournament.groupBy({ by: ["format"], _count: { _all: true } }),
    prisma.tournament.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        createdAt: true,
        accounts: { select: { provider: true } },
        _count: { select: { tournaments: true, contactMessages: true } },
      },
    }),
    prisma.tournament.findMany({ select: { createdAt: true } }),
    prisma.team.findMany({ select: { createdAt: true } }),
  ]);

  const accountTrend = buildTrendPoints(users.map((user) => user.createdAt));
  const tournamentTrend = buildTrendPoints(tournamentsForTrend.map((tournament) => tournament.createdAt));
  const teamTrend = buildTrendPoints(teamsForTrend.map((team) => team.createdAt));

  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <div>
          <p className="text-[14px] font-semibold uppercase tracking-wide text-accent">Vue d’ensemble</p>
          <h1 className="mt-2 text-3xl font-bold">Statistiques</h1>
          <p className="mt-2 text-muted">Suivi global de l’utilisation de Concours Belote &amp; Boules.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Comptes créés", userCount],
            ["Concours créés", tournamentCount],
            ["Équipes inscrites", teamCount],
            ["Messages reçus", contactCount],
          ].map(([label, value]) => (
            <Card key={label} className="flex flex-col gap-2">
              <p className="text-[14px] text-muted">{label}</p>
              <p className="text-3xl font-bold text-accent">{value}</p>
            </Card>
          ))}
        </div>

        <section aria-labelledby="evolution-title">
          <div>
            <p className="text-[14px] font-semibold uppercase tracking-wide text-accent">Évolution sur 30 jours</p>
            <h2 id="evolution-title" className="mt-2 text-2xl font-bold">La croissance de l’application</h2>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <TrendChart id="accounts" title="Comptes créés" description="Progression cumulée des comptes utilisateurs." color="#0a84ff" points={accountTrend} />
            </div>
            <TrendChart id="tournaments" title="Concours créés" description="Progression cumulée des concours." color="#bf7af0" points={tournamentTrend} />
            <TrendChart id="teams" title="Équipes inscrites" description="Progression cumulée des équipes." color="#30d158" points={teamTrend} />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card>
            <h2 className="text-xl font-semibold">Disciplines</h2>
            <div className="mt-5 flex flex-col gap-3">
              {formats.length === 0 ? <p className="text-muted">Aucun concours.</p> : formats.map((item) => (
                <div key={item.format} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <span>{formatLabels[item.format]}</span>
                  <Badge>{item._count._all}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">État des concours</h2>
            <div className="mt-5 flex flex-col gap-3">
              {statuses.length === 0 ? <p className="text-muted">Aucun concours.</p> : statuses.map((item) => (
                <div key={item.status} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <span>{statusLabels[item.status]}</span>
                  <Badge>{item._count._all}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Comptes utilisateurs</h2>
              <p className="mt-1 text-[14px] text-muted">Les mots de passe ne sont jamais affichés.</p>
            </div>
            <Badge>{users.length} compte(s)</Badge>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="px-3 py-3 font-medium">Identifiant</th>
                  <th className="px-3 py-3 font-medium">E-mail</th>
                  <th className="px-3 py-3 font-medium">Connexion</th>
                  <th className="px-3 py-3 font-medium">Créé le</th>
                  <th className="px-3 py-3 text-right font-medium">Concours</th>
                  <th className="px-3 py-3 text-right font-medium">Messages</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const providers = user.accounts.map((account) => account.provider);
                  const connection = providers.includes("google")
                    ? providers.includes("credentials") ? "Google + identifiant" : "Google"
                    : "Identifiant";

                  return (
                    <tr key={user.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-3 font-medium">{user.username ?? user.name ?? "—"}</td>
                      <td className="px-3 py-3 text-muted">{user.email ?? "—"}</td>
                      <td className="px-3 py-3 text-muted">{connection}</td>
                      <td className="px-3 py-3 text-muted">{formatDate(user.createdAt)}</td>
                      <td className="px-3 py-3 text-right">{user._count.tournaments}</td>
                      <td className="px-3 py-3 text-right">{user._count.contactMessages}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  );
}
