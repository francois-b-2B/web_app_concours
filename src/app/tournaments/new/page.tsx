"use client";

import { useActionState, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTournamentAction } from "./actions";

function todayInFrance() {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

export default function NewTournamentPage() {
  const [state, formAction, pending] = useActionState(createTournamentAction, {});
  const [format, setFormat] = useState("BOULES");
  const today = todayInFrance();

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-20">
      <Card className="w-full max-w-md flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Nouveau concours</h1>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nom du concours</Label>
            <Input id="name" name="name" required placeholder="Concours de la Saint-Jean" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="format">Type de concours</Label>
            <Select id="format" name="format" value={format} onChange={(event) => setFormat(event.target.value)}>
              <option value="BOULES">Boules</option>
              <option value="BELOTE">Belote</option>
            </Select>
            <p className="text-[13px] text-muted">
              Ce choix adapte les scores, les classements et les règles de repêchage.
            </p>
          </div>

          {format === "BOULES" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="teamComposition">Composition des équipes</Label>
              <Select id="teamComposition" name="teamComposition" defaultValue="DOUBLETTES">
                <option value="DOUBLETTES">Doublettes - 2 joueurs</option>
                <option value="TRIPLETTES">Triplettes - 3 joueurs</option>
              </Select>
            </div>
          ) : (
            <input type="hidden" name="teamComposition" value="DOUBLETTES" />
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="competitionMode">Format du concours</Label>
            <Select id="competitionMode" name="competitionMode" defaultValue="AURARD">
              <option value="AURARD">Rondes + tableau final (recommandé)</option>
              <option value="POOLS">Poules qualificatives + tableau final</option>
            </Select>
            <div className="mt-2 flex flex-col gap-2 text-[13px] leading-relaxed text-muted">
              <p>
                <strong className="text-accent">• Rondes (recommandé) :</strong>{" "}
                chaque équipe joue 2, 3 ou 4 parties, selon le choix de l’organisateur,
                contre des adversaires tirés au sort. Il n’y a pas de poules fixes
                (système Aurard). Si le nombre d’équipes est impair, une équipe est
                dispensée à chaque ronde et reçoit une victoire d’office. Une même équipe
                ne peut pas être dispensée deux fois.
              </p>
              <p>
                <strong className="text-accent">• Poules qualificatives :</strong>{" "}
                les équipes sont réparties en groupes et rencontrent les autres équipes
                de leur poule.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" defaultValue={today} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location">Lieu (optionnel)</Label>
            <Input id="location" name="location" placeholder="Salle des fêtes" />
          </div>

          {state.error && <p className="text-[14px] text-danger">{state.error}</p>}

          <Button type="submit" className="w-full mt-2" disabled={pending}>
            {pending ? "Création…" : "Créer le concours"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
