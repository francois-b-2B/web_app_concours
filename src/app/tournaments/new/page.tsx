"use client";

import { useActionState } from "react";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTournamentAction } from "./actions";

export default function NewTournamentPage() {
  const [state, formAction, pending] = useActionState(createTournamentAction, {});

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-20">
      <Card className="w-full max-w-md flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Nouveau concours</h1>
          <p className="text-[15px] text-muted">Les informations de base, modifiables plus tard.</p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nom du concours</Label>
            <Input id="name" name="name" required placeholder="Concours de la Saint-Jean" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="format">Format</Label>
            <Select id="format" name="format" defaultValue="BELOTE">
              <option value="BELOTE">Belote</option>
              <option value="BOULES">Boules</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="maxTeams">Équipes max</Label>
              <Input
                id="maxTeams"
                name="maxTeams"
                type="number"
                min={3}
                max={128}
                defaultValue={128}
                required
              />
            </div>
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
