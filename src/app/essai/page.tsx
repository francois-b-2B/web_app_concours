"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { ScoreForm } from "@/components/tournament/score-form";
import { ChampionCelebration } from "@/components/tournament/champion-celebration";
import { FINALS_WAIT_MESSAGE, REGISTRATION_LOCK_MESSAGE, POOL_SCORE_LOCK_MESSAGE, planBracketScore, poolResultsComplete, validScore, scoreResult, type ScoreActionResult } from "@/lib/tournament/score-integrity";
import { FreeGlassBadge } from "@/components/free-glass-badge";
import {
  computePoolPlan,
  getDrawMinimumTeamMessage,
  InvalidTeamCountError,
  MIN_TEAMS_TO_DRAW,
} from "@/lib/tournament/pools";
import { generateRoundRobinMatches } from "@/lib/tournament/round-robin";
import { computeGeneralStandings, rankPoolStandings } from "@/lib/tournament/standings";
import {
  aurardBracketOverview,
  aurardQualificationDescription,
  AURARD_QUALIFIER_COUNTS,
  bracketSizeForAurardTeamCount,
  bracketSizeForPoolCount,
  buildBracket,
  QUALIFICATION_DESCRIPTION,
  type AurardQualifierCount,
} from "@/lib/tournament/bracket";
import { aurardRoundsComplete, drawAurardRound, rankAurardTeams, visibleAurardMatches } from "@/lib/tournament/aurard";
import type { BracketRoundName, PoolMatchResult, TeamRef } from "@/lib/tournament/types";

type Tab = "teams" | "draw" | "pools" | "standings" | "bracket" | "export" | "poster" | "share" | "rules" | "contact";
type ExportFormat = "pdf" | "xlsx" | "xls" | "ods" | "csv";
type Team = TeamRef & { name: string; player1: string; player2: string; contact: string; paymentStatus: "PENDING" | "PAID" };
type Pool = { letter: string; teams: Team[] };
type Match = PoolMatchResult & { id: string; letter: string; round: number; tableNumber: number };
type TrialBracketMatch = ReturnType<typeof buildBracket>[number] & { id: string; scoreA: number | null; scoreB: number | null; tableNumber: number };
type TrialFormat = "BOULES" | "BELOTE";
type TrialCompetitionMode = "POOLS" | "AURARD";
type TrialAurardMatch = {
  id: string;
  round: number;
  slotIndex: number;
  tableNumber: number | null;
  teamAId: string | null;
  teamBId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  status: "PENDING" | "DONE" | "TO_REPLAY";
  winnerId: string | null;
  isBye: boolean;
};

const tabs: Array<[Tab, string]> = [
  ["teams", "Inscriptions"], ["draw", "Tirage"], ["pools", "Poules"],
  ["standings", "Classement"], ["bracket", "Tableau final"], ["export", "Exporter"],
  ["poster", "Affiche"], ["share", "QR code"], ["rules", "Les règles"], ["contact", "Contact"],
];

const examples = [["Camille", "Lucas"], ["Emma", "Hugo"], ["Léa", "Jules"], ["Manon", "Théo"], ["Chloé", "Arthur"], ["Sarah", "Noah"], ["Louise", "Paul"], ["Inès", "Louis"], ["Alice", "Gabriel"], ["Jade", "Raphaël"]] as const;
const exportFormats: Array<{ id: ExportFormat; title: string; description: string; extension: string }> = [
  { id: "pdf", title: "Document PDF", description: "Prêt à imprimer ou à partager.", extension: ".pdf" },
  { id: "xlsx", title: "Excel", description: "Format récent, avec plusieurs feuilles.", extension: ".xlsx" },
  { id: "xls", title: "Ancien Excel", description: "Compatible avec les anciennes versions d’Excel.", extension: ".xls" },
  { id: "ods", title: "OpenOffice / LibreOffice", description: "Format tableur libre OpenDocument.", extension: ".ods" },
  { id: "csv", title: "CSV", description: "Format simple compatible avec tous les tableurs.", extension: ".csv" },
];

function scoreSettings(format: TrialFormat) {
  return format === "BELOTE"
    ? { label: "Belote", byeLabel: "2 000 à 1 000", pointsFor: 2000, pointsAgainst: 1000, instruction: "Barème : 2 000 points pour une victoire." }
    : { label: "Boules", byeLabel: "13 à 7", pointsFor: 13, pointsAgainst: 7, instruction: "Barème : 13 points pour gagner une partie." };
}

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function TrialScoreForm({ teamALabel, teamBLabel, initialScoreA, initialScoreB, onSave, disabled = false, scoreInstruction }: {
  teamALabel: string;
  teamBLabel: string;
  initialScoreA: number | null;
  initialScoreB: number | null;
  onSave: (scoreA: number | null, scoreB: number | null, confirmed: boolean) => ScoreActionResult;
  disabled?: boolean;
  scoreInstruction?: string;
}) {
  const winnerSide = initialScoreA !== null && initialScoreB !== null && initialScoreA !== initialScoreB
    ? initialScoreA > initialScoreB ? "A" : "B" : null;
  return <div className="flex flex-col gap-3">{scoreInstruction && <p className="text-[12px] text-muted">{scoreInstruction}</p>}<ScoreForm teamALabel={teamALabel} teamBLabel={teamBLabel} initialScoreA={initialScoreA} initialScoreB={initialScoreB}
    disabled={disabled} winnerSide={winnerSide}
    note={initialScoreA !== null && initialScoreA === initialScoreB ? "Égalité — à rejouer" : undefined}
    action={(form) => {
      const a = form.get("scoreA"), b = form.get("scoreB");
      return onSave(a === null || a === "" ? null : Number(a), b === null || b === "" ? null : Number(b), form.get("confirmReset") === "yes");
    }} /></div>;
}

function TrialRemoveButton({ teamName, disabled, onRemove }: {
  teamName: string;
  disabled?: boolean;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="ghost" size="md" className="text-danger" disabled={disabled} onClick={() => setOpen(true)}>
        Retirer
      </Button>
      <ConfirmDialog
        open={open}
        message={`Retirer définitivement l’équipe « ${teamName} » ?\n\nCette action est irréversible.`}
        onCancel={() => setOpen(false)}
        onConfirm={() => { setOpen(false); onRemove(); }}
        confirmLabel="Retirer"
      />
    </>
  );
}

function TrialPosterPreview({ format }: { format: TrialFormat }) {
  const isBoules = format === "BOULES";
  return <section className="poster-print-area mx-auto w-full max-w-[620px] overflow-hidden rounded-[18px] border border-border bg-surface shadow-2xl">
    <svg viewBox="0 0 1000 1414" role="img" aria-label="Aperçu de l’affiche du concours" className="block h-auto w-full" xmlns="http://www.w3.org/2000/svg">
      <image href={isBoules ? "/images/affiche-boules-fond.png" : "/images/affiche-belote-vierge-v2.png"} width="1000" height="1414" preserveAspectRatio="none" />
      {isBoules ? <>
        <rect x="0" y="42" width="1000" height="270" fill="#ffffff" />
        <rect x="0" y="360" width="1000" height="92" fill="#ffffff" />
        <rect x="0" y="580" width="1000" height="72" fill="#ffffff" />
        <text x="500" y="160" textAnchor="middle" fill="#050505" fontFamily="Impact, Arial Black, sans-serif" fontSize="78" fontWeight="900">CONCOURS</text>
        <text x="500" y="260" textAnchor="middle" fill="#050505" fontFamily="Impact, Arial Black, sans-serif" fontSize="78" fontWeight="900">DE BOULES</text>
        <text x="500" y="407" textAnchor="middle" dominantBaseline="central" fill="#050505" fontFamily="Impact, Arial Black, sans-serif" fontSize="34" fontWeight="900">15 AOÛT 2026 - PERO-CASEVECCHIE - 14H30</text>
        <text x="500" y="616" textAnchor="middle" dominantBaseline="central" fill="#050505" fontFamily="Impact, Arial Black, sans-serif" fontSize="37" fontWeight="900">20 € LA DOUBLETTE</text>
        <text x="170" y="1258" textAnchor="middle" fill="#ffffff" fontFamily="Arial Black, Arial, sans-serif" fontSize="23" fontWeight="900">CI SERA DA BEIE{`\n`}È{`\n`}DA MANGHJÀ</text>
        <text x="500" y="1258" textAnchor="middle" fill="#ffffff" fontFamily="Arial Black, Arial, sans-serif" fontSize="22" fontWeight="900">LES MISES SONT{`\n`}INTEGRALEMENT{`\n`}REVERSEES</text>
        <text x="830" y="1305" textAnchor="middle" fill="#ffffff" fontFamily="Arial Black, Arial, sans-serif" fontSize="24" fontWeight="900">VENEZ NOMBREUX !</text>
      </> : <>
        <defs><path id="trial-poster-title-curve" d="M 54 365 Q 500 95 946 365" fill="none" /></defs>
        <text x="500" y="82" textAnchor="middle" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="21" letterSpacing="1.2">ORGANISÉ PAR L’ASSOCIATION U SANTISSIMU RUSARIU</text>
        <text fill="#efad4c" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="59" letterSpacing="-1"><textPath href="#trial-poster-title-curve" startOffset="50%" textAnchor="middle" textLength="760" lengthAdjust="spacingAndGlyphs">CONCOURS DE BELOTE CONTRÉE</textPath></text>
        <text x="500" y="400" textAnchor="middle" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="51" fontWeight="800" fontStyle="italic" letterSpacing="1">PERO-CASEVECCHIE</text>
        <text x="500" y="488" textAnchor="middle" dominantBaseline="central" fill="#e60000" fontFamily="Arial Black, Arial, sans-serif" fontSize="37" fontWeight="900">VENDREDI 21 AOÛT 2026</text>
        <text x="500" y="588" textAnchor="middle" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="31" fontWeight="700">à partir de 17h00 - Casa cumuna</text>
        <text x="758" y="1094" textAnchor="middle" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="67" fontWeight="800">20€</text>
        <text x="758" y="1225" textAnchor="middle" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="700">70 % des mises reversées</text>
        <rect x="222" y="1310" width="556" height="52" rx="26" fill="#ce160c" />
        <text x="500" y="1346" textAnchor="middle" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="700" letterSpacing="4">Ci serà da beie è da manghjà</text>
      </>}
    </svg>
  </section>;
}

export default function TrialPage() {
  const [activeTab, setActiveTab] = useState<Tab>("teams");
  const [title, setTitle] = useState("Mon concours d’essai");
  const [format, setFormat] = useState<TrialFormat>("BOULES");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [contact, setContact] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "PAID">("PENDING");
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitionMode, setCompetitionMode] = useState<TrialCompetitionMode>("AURARD");
  const [aurardRounds, setAurardRounds] = useState(2);
  const [aurardRoundsEditing, setAurardRoundsEditing] = useState(true);
  const [aurardRoundsSaved, setAurardRoundsSaved] = useState(false);
  const [aurardQualifierCount, setAurardQualifierCount] = useState<AurardQualifierCount | null>(null);
  const [aurardQualifierEditing, setAurardQualifierEditing] = useState(true);
  const [aurardQualifierSaved, setAurardQualifierSaved] = useState(false);
  const [frozenAurardQualifierCount, setFrozenAurardQualifierCount] = useState<AurardQualifierCount | null>(null);
  const [aurardMatches, setAurardMatches] = useState<TrialAurardMatch[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [bracketMatches, setBracketMatches] = useState<TrialBracketMatch[]>([]);
  const [selectedPoolLetter, setSelectedPoolLetter] = useState<string | null>(null);
  const [nextNumber, setNextNumber] = useState(1);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [trialQrCode, setTrialQrCode] = useState("");
  const competitionName = title.trim() || "Concours d’essai";
  const scoreConfig = scoreSettings(format);
  const teamLabel = format === "BOULES" ? "Équipe" : "Doublette";
  const paidCount = teams.filter((team) => team.paymentStatus === "PAID").length;
  const nameOf = (id: string) => teams.find((team) => team.id === id)?.name ?? "Équipe inconnue";
  const competitionStarted = pools.length > 0 || aurardMatches.length > 0;
  const automaticAurardQualifierCount = bracketSizeForAurardTeamCount(teams.length);
  const currentAurardQualifierCount = frozenAurardQualifierCount ?? aurardQualifierCount ?? automaticAurardQualifierCount;

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL("MODE ESSAI — QR code non actif", { width: 520, margin: 2, color: { dark: "#000000", light: "#ffffff" } })
      .then((code) => { if (active) setTrialQrCode(code); });
    return () => { active = false; };
  }, []);

  const drawHelp = useMemo(() => {
    if (pools.length > 0 || aurardMatches.length > 0) {
      return "Le tirage a déjà été effectué. Modifiez les inscriptions pour en préparer un nouveau.";
    }

    const minimumTeamsMessage = getDrawMinimumTeamMessage(teams.length);
    if (minimumTeamsMessage) return minimumTeamsMessage;

    if (competitionMode === "AURARD") {
      return `${aurardRounds} rondes prévues · ${currentAurardQualifierCount} équipes qualifiées pour le tableau final.`;
    }
    try {
      return `${computePoolPlan(teams.length).pools.length} poule(s) prête(s) à être tirée(s).`;
    } catch (e) {
      return e instanceof InvalidTeamCountError ? e.message : "";
    }
  }, [aurardMatches.length, aurardRounds, competitionMode, currentAurardQualifierCount, pools.length, teams.length]);

  const rankedPools = useMemo(() => pools.map((pool) => ({
    ...pool,
    standings: rankPoolStandings(pool.teams, matches.filter((match) => match.letter === pool.letter)),
  })), [pools, matches]);

  const generalStanding = useMemo(() => computeGeneralStandings(pools.map((pool) => ({
    letter: pool.letter,
    teams: pool.teams,
    matches: matches.filter((match) => match.letter === pool.letter),
  }))), [pools, matches]);
  const qualifiedCount = Math.min(bracketSizeForPoolCount(pools.length), generalStanding.length);
  const aurardStanding = useMemo(() => rankAurardTeams(
    teams,
    aurardMatches,
    { pointsFor: scoreConfig.pointsFor, pointsAgainst: scoreConfig.pointsAgainst },
  ), [aurardMatches, scoreConfig.pointsAgainst, scoreConfig.pointsFor, teams]);
  const aurardComplete = aurardRoundsComplete(teams.map((team) => team.id), aurardMatches, aurardRounds);

  function add(firstName: string, secondName: string, teamContact = "", teamPaymentStatus: "PENDING" | "PAID" = "PENDING") {
    if (competitionStarted) { setError(REGISTRATION_LOCK_MESSAGE); return; }
    if (teams.length >= 256) { setError("Le concours est limité à 256 équipes."); return; }
    if (!firstName.trim() || !secondName.trim()) {
      setError("Indiquez les deux joueurs.");
      return;
    }
    setTeams((current) => [...current, {
      id: crypto.randomUUID(),
      registrationNumber: nextNumber,
      name: `${firstName.trim()} et ${secondName.trim()}`,
      player1: firstName.trim(),
      player2: secondName.trim(),
      contact: teamContact.trim(),
      paymentStatus: teamPaymentStatus,
    }]);
    setNextNumber((value) => value + 1);
    setError("");
  }

  function addTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    add(first, second, contact, paymentStatus);
    if (first.trim() && second.trim()) {
      setFirst("");
      setSecond("");
      setContact("");
      setPaymentStatus("PENDING");
    }
  }

  function addExamples() {
    if (competitionStarted) { setError(REGISTRATION_LOCK_MESSAGE); return; }
    if (teams.length + examples.length > 256) { setError("Le concours est limité à 256 équipes."); return; }
    setTeams((current) => [...current, ...examples.map(([a, b], index) => ({
      id: crypto.randomUUID(), registrationNumber: nextNumber + index, name: `${a} et ${b}`, player1: a, player2: b, contact: "", paymentStatus: "PENDING" as const,
    }))]);
    setNextNumber((value) => value + examples.length);
    setError("");
  }

  function draw() {
    if (competitionStarted) {
      setError("Le tirage a déjà été effectué.");
      return;
    }

    const minimumTeamsMessage = getDrawMinimumTeamMessage(teams.length);
    if (minimumTeamsMessage) {
      setError(minimumTeamsMessage);
      return;
    }

    try {
      if (competitionMode === "AURARD") {
        if (!aurardRoundsSaved || !aurardQualifierSaved) {
          setError("Enregistrez les deux réglages avant de lancer la première ronde.");
          return;
        }
        if (aurardQualifierCount !== null && aurardQualifierCount >= teams.length) {
          setError("Choisissez à nouveau la taille du tableau final.");
          return;
        }
        const frozenCount = aurardQualifierCount ?? automaticAurardQualifierCount;
        const pairings = drawAurardRound(teams.map((team) => team.id));
        setFrozenAurardQualifierCount(frozenCount);
        setAurardMatches(pairings.map((pairing) => ({
          ...pairing,
          id: crypto.randomUUID(),
          round: 1,
          scoreA: pairing.isBye ? scoreConfig.pointsFor : null,
          scoreB: pairing.isBye ? scoreConfig.pointsAgainst : null,
          status: pairing.isBye ? "DONE" : "PENDING",
        })));
        setError("");
        setActiveTab("pools");
        return;
      }
      const plan = computePoolPlan(teams.length);
      const shuffled = shuffle(teams);
      let cursor = 0;
      const nextPools = plan.pools.map((planPool) => {
        const poolTeams = shuffled.slice(cursor, cursor + planPool.size);
        cursor += planPool.size;
        return { letter: planPool.letter, teams: poolTeams };
      });
      setPools(nextPools);
      const tableCountByRound = new Map<number, number>();
      const generatedMatches = nextPools.flatMap((pool) => generateRoundRobinMatches(pool.teams.map((team) => team.id)).map((match) => {
        const tableNumber = (tableCountByRound.get(match.round) ?? 0) + 1;
        tableCountByRound.set(match.round, tableNumber);
        return { ...match, id: crypto.randomUUID(), letter: pool.letter, tableNumber, scoreA: null, scoreB: null };
      }));
      setMatches(generatedMatches);
      setError("");
      setActiveTab("pools");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le tirage ne peut pas être effectué.");
    }
  }

  function saveAurardScore(matchId: string, scoreA: number | null, scoreB: number | null): ScoreActionResult {
    if (bracketMatches.length) return { error: "Le tableau final a commencé : les scores des rondes sont verrouillés." };
    if (!validScore(scoreA) || !validScore(scoreB)) return { error: "Score invalide." };
    const status = scoreA === scoreB ? "TO_REPLAY" : "DONE";
    setAurardMatches((current) => current.map((match) => match.id === matchId ? {
      ...match,
      scoreA,
      scoreB,
      status,
      winnerId: status === "DONE" ? (scoreA! > scoreB! ? match.teamAId : match.teamBId) : null,
    } : match));
    return {};
  }

  function startNextAurardRound() {
    if (!aurardMatches.length || aurardComplete) return;
    const currentRound = Math.max(...aurardMatches.map((match) => match.round));
    const currentMatches = aurardMatches.filter((match) => match.round === currentRound);
    if (!currentMatches.length || currentMatches.some((match) => match.status !== "DONE")) {
      setError(`Terminez la ronde ${currentRound} avant de préparer la suivante.`);
      return;
    }
    const pairings = drawAurardRound(teams.map((team) => team.id), aurardMatches);
    setAurardMatches((current) => [...current, ...pairings.map((pairing) => ({
      ...pairing,
      id: crypto.randomUUID(),
      round: currentRound + 1,
      scoreA: pairing.isBye ? scoreConfig.pointsFor : null,
      scoreB: pairing.isBye ? scoreConfig.pointsAgainst : null,
      status: pairing.isBye ? "DONE" as const : "PENDING" as const,
    }))]);
    setError("");
  }

  function saveMatchScore(matchId: string, scoreA: number | null, scoreB: number | null): ScoreActionResult {
    if (bracketMatches.length) return { error: POOL_SCORE_LOCK_MESSAGE };
    if (!validScore(scoreA) || !validScore(scoreB)) return { error: "Score invalide." };
    setMatches((current) => current.map((match) => match.id === matchId ? { ...match, scoreA, scoreB } : match));
    return {};
  }

  function launchFinals() {
    const resultsComplete = competitionMode === "AURARD" ? aurardComplete : poolResultsComplete(matches);
    if (!resultsComplete || bracketMatches.length) { setError(FINALS_WAIT_MESSAGE); return; }
    setError("");
    const bracketSize = competitionMode === "AURARD" ? currentAurardQualifierCount : bracketSizeForPoolCount(pools.length);
    const finalists = competitionMode === "AURARD"
      ? aurardStanding.slice(0, bracketSize)
      : qualified;
    const plans = buildBracket(finalists.map((row) => ({
      id: row.teamId,
      registrationNumber: teams.find((team) => team.id === row.teamId)?.registrationNumber ?? 0,
    })), bracketSize);
    const tableCountByRound = new Map<BracketRoundName, number>();
    setBracketMatches(plans.map((plan) => {
      const tableNumber = (tableCountByRound.get(plan.roundName) ?? 0) + 1;
      tableCountByRound.set(plan.roundName, tableNumber);
      return { ...plan, id: crypto.randomUUID(), scoreA: null, scoreB: null, tableNumber };
    }));
  }

  function saveBracketScore(matchId: string, scoreA: number | null, scoreB: number | null, confirmed = false): ScoreActionResult {
    if (!validScore(scoreA) || !validScore(scoreB)) return { error: "Score invalide." };
    const scored = bracketMatches.map((match) => ({
      ...match,
      status: scoreResult(match.teamAId, match.teamBId, match.scoreA, match.scoreB).status,
      sourceMatchAId: bracketMatches.find((item) => item.roundName === match.sourceRoundA && item.slotIndex === match.sourceSlotA)?.id ?? null,
      sourceMatchBId: bracketMatches.find((item) => item.roundName === match.sourceRoundB && item.slotIndex === match.sourceSlotB)?.id ?? null,
    }));
    const match = scored.find((item) => item.id === matchId);
    if (!match?.teamAId || !match.teamBId) return { error: "Les deux équipes doivent être connues." };
    const plan = planBracketScore(scored, matchId, scoreA, scoreB);
    if (plan.resetsPlayedMatches && !confirmed) return { confirmationRequired: true };
    setBracketMatches((current) => current.map((item) => plan.changes.find((changed) => changed.id === item.id) ?? item));
    return {};
  }

  function togglePayment(teamId: string) {
    setTeams((current) => current.map((team) => team.id === teamId
      ? { ...team, paymentStatus: team.paymentStatus === "PAID" ? "PENDING" : "PAID" }
      : team));
  }

  function removeTeam(teamId: string) {
    if (competitionStarted) { setError(REGISTRATION_LOCK_MESSAGE); return; }
    const nextCount = teams.length - 1;
    setTeams((current) => current.filter((team) => team.id !== teamId));
    if (aurardQualifierCount !== null && aurardQualifierCount >= nextCount) {
      setAurardQualifierCount(null);
      setAurardQualifierSaved(false);
      setAurardQualifierEditing(true);
      setError("Le précédent choix de tableau n’est plus possible. Choisissez à nouveau.");
    }
  }

  function saveTeam(event: FormEvent<HTMLFormElement>, teamId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const player1 = String(form.get("player1") ?? "").trim();
    const player2 = String(form.get("player2") ?? "").trim();
    if (!player1 || !player2) return;
    const update = (team: Team) => team.id === teamId
      ? { ...team, player1, player2, name: `${player1} et ${player2}`, contact: String(form.get("contact") ?? "").trim() }
      : team;
    setTeams((current) => current.map(update));
    setPools((current) => current.map((pool) => ({ ...pool, teams: pool.teams.map(update) })));
    setEditingTeamId(null);
  }

  function aurardPreparationContent() {
    if (competitionMode !== "AURARD") return null;
    if (competitionStarted) {
      return <p className="text-center text-[15px] font-semibold text-accent">Réglages verrouillés : {aurardRounds} parties · {currentAurardQualifierCount} équipes qualifiées</p>;
    }
    const hasAvailableQualifier = AURARD_QUALIFIER_COUNTS.some((count) => count < teams.length);
    const settingsSaved = aurardRoundsSaved && aurardQualifierSaved;
    const editButtonClass = "rounded-pill border border-accent bg-transparent px-5 py-3 font-semibold text-accent transition-colors hover:bg-accent/10 disabled:pointer-events-none disabled:opacity-40";
    const saveButtonClass = "rounded-pill bg-accent px-5 py-3 font-semibold text-white transition-colors hover:bg-accent/90 disabled:pointer-events-none disabled:opacity-40";
    return <Card className="flex flex-col gap-5">
      <div><h2 className="text-xl font-semibold">Préparer les rondes</h2></div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-2 text-[14px] font-medium"><select aria-label="Nombre de parties" value={aurardRounds} disabled={competitionStarted || !aurardRoundsEditing} onChange={(event) => { setAurardRounds(Number(event.target.value)); setAurardRoundsSaved(false); setAurardRoundsEditing(true); }} className="rounded-pill border border-border bg-surface-2 px-4 py-3 text-foreground disabled:opacity-50"><option value={2}>2 parties</option><option value={3}>3 parties</option><option value={4}>4 parties</option></select></label>
        <Button type="button" disabled={competitionStarted} className={aurardRoundsEditing ? saveButtonClass : editButtonClass} onClick={() => { if (aurardRoundsEditing) { setAurardRoundsSaved(true); setAurardRoundsEditing(false); } else setAurardRoundsEditing(true); }}>{aurardRoundsEditing ? "Enregistrer" : "Modifier"}</Button>
      </div>
      {competitionStarted && <p className="text-[14px] text-muted">Le réglage est verrouillé car le concours a commencé.</p>}
      <div className="border-t border-border pt-5"><h2 className="text-xl font-semibold">Préparer le tableau final</h2><div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-2 text-[14px] font-medium">Équipes qualifiées · Modifiable tant que les inscriptions sont ouvertes<select aria-label="Équipes qualifiées" value={currentAurardQualifierCount} disabled={competitionStarted || !aurardQualifierEditing || !hasAvailableQualifier} onChange={(event) => { setAurardQualifierCount(Number(event.target.value) as AurardQualifierCount); setAurardQualifierSaved(false); setAurardQualifierEditing(true); }} className="rounded-pill border border-border bg-surface-2 px-4 py-3 text-foreground disabled:opacity-50">{AURARD_QUALIFIER_COUNTS.map((count) => { const overview = aurardBracketOverview(count); return <option key={count} value={count} disabled={count >= teams.length}>{count} équipes · {overview.firstRound}</option>; })}</select></label>
        <Button type="button" disabled={competitionStarted || !hasAvailableQualifier} className={aurardQualifierEditing ? saveButtonClass : editButtonClass} onClick={() => { if (aurardQualifierEditing) { setAurardQualifierCount(currentAurardQualifierCount); setAurardQualifierSaved(true); setAurardQualifierEditing(false); } else setAurardQualifierEditing(true); }}>{aurardQualifierEditing ? "Enregistrer" : "Modifier"}</Button>
      </div></div>
      <p className={`flex min-h-10 items-center justify-center text-center text-[13px] ${settingsSaved ? "text-success" : "text-danger"}`}>{settingsSaved ? "Réglage enregistré." : "Réglage non enregistré."}</p>
    </Card>;
  }

  function teamsContent() {
    return <div className="flex flex-col gap-8">
      <div className="section-heading-with-badge relative min-h-28 pr-32"><FreeGlassBadge withBeams /><h1 className="text-3xl font-bold">Inscriptions</h1><Badge className="mt-2 w-fit border-accent/60 text-accent">Concours de {scoreConfig.label}</Badge>{competitionMode === "AURARD" && <Badge className="mt-2 w-fit border-accent/60 text-accent">Ronde + Tableau final (pour association), réduit le temps d’attente</Badge>}</div>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-2"><Label htmlFor="trial-title">Nom du concours</Label><Input id="trial-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} /></div>
        <label className="flex max-w-md flex-col gap-2 text-[14px] font-medium">Type de concours<Select aria-label="Type de concours" value={format} disabled={competitionStarted} onChange={(event) => { setFormat(event.target.value as TrialFormat); setError(""); }}><option value="BOULES">Boules</option><option value="BELOTE">Belote</option></Select><span className="text-[13px] font-normal text-muted">Ce choix adapte les scores, les classements, les règles et l’affiche.</span></label>
        <label className="flex max-w-md flex-col gap-2 text-[14px] font-medium">Formule du concours · Modifiable plus tard<Select value={competitionMode} disabled={competitionStarted} onChange={(event) => { setCompetitionMode(event.target.value as TrialCompetitionMode); setError(""); }}>{<><option value="POOLS">Poules + Tableau final (concours officiel)</option><option value="AURARD">Ronde + Tableau final (pour association), réduit le temps d’attente</option></>}</Select></label>
        <form onSubmit={addTeam} className="flex flex-col items-start gap-3 sm:flex-row"><fieldset disabled={competitionStarted} className="contents"><Input value={first} onChange={(event) => setFirst(event.target.value)} placeholder="Joueur 1" aria-label={`${teamLabel} - joueur 1`} className="sm:flex-1" /><Input value={second} onChange={(event) => setSecond(event.target.value)} placeholder="Joueur 2" aria-label={`${teamLabel} - joueur 2`} className="sm:flex-1" /><Select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as "PENDING" | "PAID")} aria-label="Statut du paiement" className="sm:w-40"><option value="PENDING">En attente</option><option value="PAID">Réglée</option></Select><Input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Tél. (facultatif)" aria-label="Tél." className="sm:flex-1" /><Button type="submit" className="whitespace-nowrap">Ajouter</Button></fieldset></form>
        <Button type="button" variant="secondary" onClick={addExamples} disabled={competitionStarted} className="self-start">Ajouter 10 équipes d’exemple</Button>
        {competitionStarted && <p className="text-sm text-muted">{REGISTRATION_LOCK_MESSAGE}</p>}
        {error && <p className="text-[14px] text-danger" role="alert">{error}</p>}
      </Card>
      <p className="text-[15px] text-muted"><strong className="font-semibold text-accent">{teams.length}</strong> / 256 équipes max · <strong className="font-semibold text-accent">{paidCount}</strong> réglée(s)</p>
      <div className="flex flex-col gap-2">{teams.map((team) => <Card key={team.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="flex items-center gap-4"><span className="w-8 text-[14px] text-muted">#{team.registrationNumber}</span><div><p className="font-medium">{team.name}</p>{team.contact && <p className="text-[13px] text-muted">{team.contact}</p>}</div></div><div className="flex items-center gap-3"><button type="button" onClick={() => togglePayment(team.id)}><Badge className={team.paymentStatus === "PAID" ? "border-success/50 text-success" : "border-white/20 text-muted"}>{team.paymentStatus === "PAID" ? "Réglée" : "En attente"}</Badge></button><TrialRemoveButton teamName={team.name} disabled={competitionStarted} onRemove={() => removeTeam(team.id)} /><Button type="button" variant="ghost" size="md" onClick={() => setEditingTeamId(team.id)}>Modifier</Button></div>{editingTeamId === team.id && <form onSubmit={(event) => saveTeam(event, team.id)} className="basis-full flex flex-col gap-3 pt-3 sm:flex-row"><Input name="player1" defaultValue={team.player1} aria-label="Joueur 1" required /><Input name="player2" defaultValue={team.player2} aria-label="Joueur 2" required /><Input name="contact" defaultValue={team.contact} placeholder="Tél. (facultatif)" aria-label="Tél." /><div className="flex gap-2"><Button type="submit" size="md">Enregistrer</Button><Button type="button" variant="secondary" size="md" onClick={() => setEditingTeamId(null)}>Annuler</Button></div></form>}</Card>)}{teams.length === 0 && <p className="py-8 text-center text-muted">Aucune équipe inscrite pour l’instant.</p>}</div>
    </div>;
  }

  function drawContent() {
    return <div className="flex flex-col gap-5">{aurardPreparationContent()}<Card className="flex flex-col gap-5"><div><h2 className="text-xl font-semibold">{competitionMode === "AURARD" ? "Tirage des rondes" : "Tirage des poules"}</h2><p className="mt-1 text-[14px] text-muted">{drawHelp}</p></div><p className="text-[15px] text-muted">{competitionMode === "AURARD" ? "Le tirage crée une première ronde et évite ensuite les rencontres déjà jouées autant que possible." : "Le tirage mélange les équipes et crée les feuilles de match."}</p><p className="text-[13px] text-muted">{scoreConfig.instruction}</p>{error && <p className="text-[14px] text-danger">{error}</p>}<div className="flex flex-wrap gap-3"><Button type="button" onClick={draw} disabled={competitionStarted || teams.length < MIN_TEAMS_TO_DRAW}>{competitionStarted ? "Tirage effectué" : competitionMode === "AURARD" ? "Lancer la première ronde" : "Tirer les poules"}</Button><Button type="button" variant="ghost" onClick={() => setActiveTab("teams")}>Modifier les inscriptions</Button></div></Card></div>;
  }

  function aurardContent() {
    if (!aurardMatches.length) return <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center"><h1 className="text-3xl font-bold">Rondes</h1><p className="text-muted">La première ronde n’a pas encore été lancée.</p><Button type="button" onClick={() => setActiveTab("draw")}>Aller au tirage</Button></div>;
    const visibleMatches = visibleAurardMatches(aurardMatches);
    const rounds = [...new Set(visibleMatches.map((match) => match.round))].sort((a, b) => a - b);
    const currentRound = Math.max(...aurardMatches.map((match) => match.round));
    const currentRoundDone = aurardMatches.filter((match) => match.round === currentRound).every((match) => match.status === "DONE");
    return <div className="mx-auto flex max-w-4xl flex-col gap-8"><div><h1 className="text-3xl font-bold">Rondes</h1><p className="mt-2 text-muted">{scoreConfig.label} · {aurardRounds} rondes prévues · tableau final de {currentAurardQualifierCount} équipes.</p><p className="mt-1 text-sm text-muted">{scoreConfig.instruction}</p></div>{rounds.map((round) => <div key={round} className="flex flex-col gap-4"><h2 className="text-xl font-semibold">Ronde {round}</h2><div className="grid grid-cols-1 gap-4 md:grid-cols-2">{visibleMatches.filter((match) => match.round === round).map((match) => <Card key={match.id} className="flex flex-col gap-4"><div className="flex items-center justify-between"><span className="font-semibold">{match.isBye ? "Victoire d’office" : `Table ${match.tableNumber}`}</span><Badge className={match.status === "DONE" ? "border-success/50 text-success" : "border-border text-muted"}>{match.status === "DONE" ? "Joué" : match.status === "TO_REPLAY" ? "À rejouer" : "À jouer"}</Badge></div>{match.isBye ? <div><p>{nameOf(match.teamAId ?? "")}</p><p className="mt-1 text-sm text-muted">Score attribué : {scoreConfig.byeLabel}</p></div> : <TrialScoreForm scoreInstruction={scoreConfig.instruction} teamALabel={nameOf(match.teamAId ?? "")} teamBLabel={nameOf(match.teamBId ?? "")} initialScoreA={match.scoreA} initialScoreB={match.scoreB} disabled={bracketMatches.length > 0} onSave={(scoreA, scoreB) => saveAurardScore(match.id, scoreA, scoreB)} />}</Card>)}</div></div>)}{!aurardComplete && currentRound < aurardRounds && <div className="flex flex-col items-center gap-2"><Button type="button" onClick={startNextAurardRound} disabled={!currentRoundDone}>Préparer la ronde {currentRound + 1}</Button>{!currentRoundDone && <p className="text-sm text-muted">Terminez la ronde {currentRound} pour continuer dans cette démonstration.</p>}</div>}{aurardComplete && <Card className="text-center"><p className="font-semibold">Les rondes sont terminées.</p><p className="mt-1 text-sm text-muted">{aurardQualificationDescription(currentAurardQualifierCount)}</p></Card>}{error && <p className="text-center text-sm text-danger">{error}</p>}</div>;
  }

  function poolsContent() {
    if (competitionMode === "AURARD") return aurardContent();
    if (!pools.length) return <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center"><h1 className="text-3xl font-bold">Poules</h1><p className="text-muted">Le tirage n’a pas encore été effectué.</p><Button type="button" onClick={() => setActiveTab("draw")}>Aller au tirage</Button></div>;
    if (!selectedPoolLetter) return <div className="mx-auto flex max-w-4xl flex-col gap-8"><h1 className="text-3xl font-bold">Poules</h1><div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{pools.map((pool) => {
      const poolMatches = matches.filter((match) => match.letter === pool.letter);
      const playedCount = poolMatches.filter((match) => match.scoreA !== null && match.scoreB !== null && match.scoreA !== match.scoreB).length;
      const isComplete = poolMatches.length > 0 && playedCount === poolMatches.length;
      return <Card key={pool.letter} className="flex flex-col gap-4"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Poule {pool.letter}</h2><span className="text-[13px] text-muted">{playedCount} / {poolMatches.length} matchs joués</span></div><ul className="flex flex-col gap-1">{pool.teams.map((team, index) => <li key={team.id} className="text-[14px] text-muted">{index + 1}. {team.name}</li>)}</ul><Button type="button" variant={isComplete ? "secondary" : "primary"} onClick={() => setSelectedPoolLetter(pool.letter)}>Feuille de match</Button></Card>;
    })}</div></div>;
    const pool = pools.find((item) => item.letter === selectedPoolLetter);
    if (!pool) return null;
    const poolMatches = matches.filter((match) => match.letter === pool.letter).sort((a, b) => a.round - b.round || a.tableNumber - b.tableNumber);
    const rounds = [...new Set(poolMatches.map((match) => match.round))];
    return <div className="mx-auto flex max-w-2xl flex-col gap-8"><Button type="button" variant="ghost" className="self-start px-0" onClick={() => setSelectedPoolLetter(null)}>← Poules</Button><h1 className="text-3xl font-bold">Poule {pool.letter}</h1>{bracketMatches.length > 0 && <p className="text-sm text-muted">{POOL_SCORE_LOCK_MESSAGE}</p>}{rounds.map((round) => <div key={round} className="flex flex-col gap-4"><h2 className="text-[15px] font-semibold uppercase tracking-wide text-muted">Ronde {round}</h2><div className="flex flex-col gap-4">{poolMatches.filter((match) => match.round === round).map((match) => { const status = match.scoreA === null || match.scoreB === null ? "À jouer" : match.scoreA === match.scoreB ? "Égalité — à rejouer" : "Terminé"; return <Card key={match.id} className="flex flex-col gap-4"><div className="flex items-center justify-between"><span className="text-[13px] text-muted">{status}</span><Badge>Table {match.tableNumber}</Badge></div><TrialScoreForm scoreInstruction={scoreConfig.instruction} teamALabel={nameOf(match.teamAId)} teamBLabel={nameOf(match.teamBId)} initialScoreA={match.scoreA} initialScoreB={match.scoreB} disabled={bracketMatches.length > 0} onSave={(scoreA, scoreB) => saveMatchScore(match.id, scoreA, scoreB)} /></Card>; })}</div></div>)}</div>;
  }

  function standingsContent() {
    if (competitionMode === "AURARD") {
      if (!aurardMatches.length) return <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center"><h1 className="text-3xl font-bold">Classement</h1><p className="text-muted">Le classement apparaîtra après le lancement de la première ronde.</p><Button type="button" onClick={() => setActiveTab("draw")}>Aller au tirage</Button></div>;
      return <div className="mx-auto flex max-w-4xl flex-col gap-8"><div><h1 className="text-3xl font-bold">Classement des rondes</h1><p className="mt-2 text-muted">Victoires, points marqués puis différence de points.</p></div><Card className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-[14px]"><thead><tr className="border-b border-border text-left text-muted"><th className="px-4 py-3">#</th><th className="px-4 py-3">Équipe</th><th className="px-4 py-3 text-center">J</th><th className="px-4 py-3 text-center">V</th><th className="px-4 py-3 text-center">Points</th><th className="px-4 py-3 text-center">Diff.</th><th className="px-4 py-3 text-right">Qualifiée</th></tr></thead><tbody>{aurardStanding.map((row, index) => <tr key={row.teamId} className="border-b border-border last:border-0"><td className="px-4 py-3 text-muted">{index + 1}</td><td className="px-4 py-3">{nameOf(row.teamId)}</td><td className="px-4 py-3 text-center">{row.played}</td><td className="px-4 py-3 text-center">{row.wins}</td><td className="px-4 py-3 text-center">{row.pointsFor}</td><td className="px-4 py-3 text-center">{row.diff > 0 ? `+${row.diff}` : row.diff}</td><td className="px-4 py-3 text-right">{aurardComplete && index < currentAurardQualifierCount && <Badge>Qualifiée</Badge>}</td></tr>)}</tbody></table></div></Card>{aurardComplete && <p className="text-center text-muted">{aurardQualificationDescription(currentAurardQualifierCount)}</p>}</div>;
    }
    if (!pools.length) return <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center"><h1 className="text-3xl font-bold">Classement</h1><p className="text-muted">Le tirage n’a pas encore été effectué.</p><Button type="button" onClick={() => setActiveTab("draw")}>Aller au tirage</Button></div>;
    return <div className="mx-auto flex max-w-4xl flex-col gap-10"><h1 className="text-3xl font-bold">Classement</h1><div className="flex flex-col gap-6"><h2 className="text-xl font-semibold">Classement général</h2><Card className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-[14px]"><thead><tr className="border-b border-border text-left text-muted"><th className="px-4 py-3 font-medium">#</th><th className="px-4 py-3 font-medium">{teamLabel}</th><th className="px-4 py-3 font-medium">Poule</th><th className="px-4 py-3 text-center font-medium">V</th><th className="px-4 py-3 text-center font-medium">Diff</th><th className="px-4 py-3 text-right font-medium">Qualifié</th></tr></thead><tbody>{generalStanding.map((row) => <tr key={row.teamId} className="border-b border-border last:border-0"><td className="px-4 py-3 text-muted">{row.rankGeneral}</td><td className="px-4 py-3">{nameOf(row.teamId)}</td><td className="px-4 py-3 text-muted">{row.poolLetter} ({row.rankInPool}{row.rankInPool === 1 ? "re" : "e"})</td><td className="px-4 py-3 text-center">{row.wins}</td><td className="px-4 py-3 text-center">{row.diff > 0 ? `+${row.diff}` : row.diff}</td><td className="px-4 py-3 text-right">{row.rankGeneral <= qualifiedCount && <Badge>Qualifié</Badge>}</td></tr>)}</tbody></table></div></Card></div><div className="flex flex-col gap-6"><h2 className="text-xl font-semibold">Par poule</h2><div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{rankedPools.map((pool) => <Card key={pool.letter} className="flex flex-col gap-3"><h3 className="text-lg font-semibold">Poule {pool.letter}</h3><table className="w-full text-[14px]"><thead><tr className="text-left text-muted"><th className="py-1.5 font-medium">{teamLabel}</th><th className="py-1.5 text-center font-medium">J</th><th className="py-1.5 text-center font-medium">V</th><th className="py-1.5 text-center font-medium">Diff</th></tr></thead><tbody>{pool.standings.map((row) => <tr key={row.teamId}><td className="py-1.5">{nameOf(row.teamId)}</td><td className="py-1.5 text-center">{row.played}</td><td className="py-1.5 text-center">{row.wins}</td><td className="py-1.5 text-center">{row.diff > 0 ? `+${row.diff}` : row.diff}</td></tr>)}</tbody></table></Card>)}</div></div></div>;
  }

  const qualified = generalStanding.slice(0, qualifiedCount);
  function bracketContent() {
    const drawExists = competitionMode === "AURARD" ? aurardMatches.length > 0 : pools.length > 0;
    const resultsComplete = competitionMode === "AURARD" ? aurardComplete : poolResultsComplete(matches);
    if (!drawExists) return <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center"><h1 className="text-3xl font-bold">Tableau final</h1><p className="text-muted">Le tirage n’a pas encore été effectué.</p><Button type="button" onClick={() => setActiveTab("draw")}>Aller au tirage</Button></div>;
    if (!bracketMatches.length) return <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center"><h1 className="text-3xl font-bold">Tableau final</h1><p className="text-muted">{competitionMode === "AURARD" ? aurardQualificationDescription(currentAurardQualifierCount) : QUALIFICATION_DESCRIPTION}</p><Button type="button" onClick={launchFinals} disabled={!resultsComplete}>Lancer le tableau final</Button>{!resultsComplete && <p className="text-sm text-muted">{FINALS_WAIT_MESSAGE}</p>}</div>;
    const labels: Record<BracketRoundName, string> = { R64: "32èmes de finale", R32: "16èmes de finale", R16: "Huitièmes de finale", QF: "Quarts de finale", SF: "Demi-finales", FINAL: "Finale" };
    const order: BracketRoundName[] = ["R64", "R32", "R16", "QF", "SF", "FINAL"];
    const rounds = order.filter((round) => bracketMatches.some((match) => match.roundName === round));
    const champion = bracketMatches.find((match) => match.roundName === "FINAL" && match.winnerId)?.winnerId ?? null;
    return <div className="mx-auto flex max-w-5xl flex-col gap-10"><h1 className="text-3xl font-bold">Tableau final</h1>{champion && <><ChampionCelebration /><Card id="champion-card" className="champion-reveal border-accent/50 py-8 text-center"><p className="mb-1 text-[14px] text-accent">Champion du concours</p><p className="text-2xl font-bold text-[#30d158]">{nameOf(champion)}</p></Card></>}<div className="grid auto-cols-[minmax(260px,1fr)] grid-flow-col items-stretch gap-6 overflow-x-auto pb-4">{rounds.map((round) => <div key={round} className="grid min-w-[260px] grid-rows-[auto_1fr] gap-4"><h2 className="text-[14px] font-semibold uppercase tracking-wide text-muted">{labels[round]}</h2><div className="flex flex-col justify-around gap-4">{bracketMatches.filter((match) => match.roundName === round).sort((a, b) => a.slotIndex - b.slotIndex).map((match) => <Card key={match.id} className="flex flex-col gap-3"><Badge className="self-start">Table {match.tableNumber}</Badge>{match.isBye ? <p className="text-[14px] text-muted">{nameOf(match.teamAId ?? match.teamBId ?? "")} qualifié(e) d’office (bye)</p> : <TrialScoreForm scoreInstruction={scoreConfig.instruction} key={`${match.id}:${match.scoreA}:${match.scoreB}:${match.teamAId}:${match.teamBId}`} teamALabel={match.teamAId ? nameOf(match.teamAId) : "En attente"} teamBLabel={match.teamBId ? nameOf(match.teamBId) : "En attente"} initialScoreA={match.scoreA} initialScoreB={match.scoreB} disabled={!match.teamAId || !match.teamBId} onSave={(scoreA, scoreB, confirmed) => saveBracketScore(match.id, scoreA, scoreB, confirmed)} />}</Card>)}</div></div>)}</div></div>;
  }

  function exportContent() {
    return <div className="mx-auto flex max-w-4xl flex-col gap-8"><div><h1 className="text-3xl font-bold">Exporter le concours : 5 formats</h1><p className="mt-2 text-muted">Télécharge les inscriptions, {competitionMode === "AURARD" ? "les rondes" : "les poules"}, les matchs, le classement et le tableau final.</p><p className="mt-3 text-[14px] font-bold text-[#60a5fa]">En mode essai, les données ne sont pas sauvegardées : l’exportation n’est donc pas disponible.</p></div><div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{exportFormats.map((format) => <Card key={format.id} className="flex flex-col gap-4"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{format.title}</h2><p className="mt-1 text-[14px] text-muted">{format.description}</p></div><span className="shrink-0 rounded-full border border-border px-3 py-1 text-[12px] text-muted">{format.extension}</span></div><Button type="button" className="mt-auto" disabled>Télécharger</Button></Card>)}</div></div>;
  }

  const staticContent: Record<Exclude<Tab, "teams" | "draw" | "pools" | "standings" | "bracket" | "export">, ReactNode> = {
    poster: <div className="mx-auto flex max-w-6xl flex-col gap-8"><div><h1 className="text-3xl font-bold">Créer l’affiche</h1><p className="mt-2 text-muted">Modifie les informations et observe le résultat directement sur l’affiche.</p><p className="mt-3 text-[14px] font-bold text-[#60a5fa]">En mode essai, l’affiche est présentée à titre d’exemple : la personnalisation et le téléchargement ne sont pas disponibles.</p></div><div className="poster-editor-shell grid grid-cols-1 gap-8 lg:grid-cols-[minmax(300px,380px)_1fr] lg:items-start"><section className="flex flex-col gap-5 rounded-card border border-border bg-surface p-6"><h2 className="text-xl font-semibold">Informations</h2><label className="flex flex-col gap-2 text-[14px] font-medium">Type de concours<Input disabled value={scoreConfig.label} /></label>{format === "BELOTE" && <label className="flex flex-col gap-2 text-[14px] font-medium">Organisateur<Input disabled value="ASSOCIATION U SANTISSIMU RUSARIU" /></label>}<label className="flex flex-col gap-2 text-[14px] font-medium">Titre<Input disabled value={format === "BOULES" ? "CONCOURS DE BOULES" : "CONCOURS DE BELOTE CONTRÉE"} /></label><label className="flex flex-col gap-2 text-[14px] font-medium">Lieu<Input disabled value="PERO-CASEVECCHIE" /></label><div className="grid grid-cols-2 gap-4"><label className="flex flex-col gap-2 text-[14px] font-medium">Date<Input disabled value="21/08/2026" /></label><label className="flex flex-col gap-2 text-[14px] font-medium">Heure<Input disabled value="17:00" /></label></div>{format === "BELOTE" && <label className="flex flex-col gap-2 text-[14px] font-medium">Adresse<Input disabled value="Casa cumuna" /></label>}<div className="grid grid-cols-2 gap-4"><label className="flex flex-col gap-2 text-[14px] font-medium">Mise par équipe (€)<Input disabled value="20" /></label>{format === "BELOTE" && <label className="flex flex-col gap-2 text-[14px] font-medium">Mises reversées (%)<Input disabled value="70" /></label>}</div><label className="flex flex-col gap-2 text-[14px] font-medium">Texte inférieur<Input disabled value="Ci serà da beie è da manghjà" /></label><div className="mt-2 flex flex-col gap-3 sm:flex-row"><Button type="button" disabled className="flex-1">Télécharger en PNG</Button><Button type="button" variant="outline" disabled className="flex-1">Télécharger en PDF</Button></div></section><TrialPosterPreview format={format} /></div></div>,
    share: <div className="mx-auto flex max-w-2xl flex-col gap-6"><div><h1 className="text-3xl font-bold">QR code public</h1><p className="mt-2 text-muted">Les participants peuvent suivre le concours en lecture seule.</p><p className="mt-3 text-[14px] font-bold text-[#60a5fa]">En mode essai, ce QR code est présenté à titre d’exemple : il n’est pas actif.</p></div><Card className="flex flex-col items-center gap-5 py-8 text-center"><div className="rounded-2xl bg-white p-3">{trialQrCode ? <Image unoptimized src={trialQrCode} alt="QR code d’exemple non actif" width={300} height={300} /> : <div className="size-[300px]" />}</div><p className="text-lg font-semibold">{competitionName}</p><p className="text-sm text-muted">Ce QR code restera identique pour ce concours. Il fonctionnera sur les téléphones après la mise en ligne du site.</p></Card></div>,
    rules: <Card className="flex flex-col gap-5"><h2 className="text-xl font-semibold">Fonctionnement du tirage · {scoreConfig.label}</h2><div><h3 className="font-semibold text-accent">Le barème</h3><p className="mt-2 leading-relaxed text-muted">Pour une victoire d’office, l’application attribue le score {scoreConfig.byeLabel}. {scoreConfig.instruction}</p></div><div><h3 className="font-semibold text-accent">Les Rondes</h3><p className="mt-2 leading-relaxed text-muted">De nouveaux adversaires sont tirés à chaque ronde. L’application évite les rencontres déjà jouées autant que possible. Le tableau proposé qualifie 4 équipes de 6 à 15 inscrites, 8 de 16 à 32, 16 de 33 à 64, 32 de 65 à 128 et 64 de 129 à 256. Un choix manuel doit toujours rester inférieur au nombre d’inscrites.</p></div><div><h3 className="font-semibold text-accent">Les Poules</h3><p className="mt-2 leading-relaxed text-muted">Les équipes sont réparties aléatoirement en poules de 3 ou 4. Chaque équipe rencontre les autres équipes de sa poule. Le tableau final conserve 8 places.</p></div></Card>,
    contact: <div className="mx-auto flex max-w-3xl flex-col gap-6"><div><h1 className="text-3xl font-bold">Contact</h1><p className="mt-2 text-muted">Une question, une idée ou un problème ? Écrivez-nous.</p><p className="mt-3 text-[14px] font-bold text-[#60a5fa]">En mode essai, les données ne sont pas sauvegardées : l’envoi de messages n’est donc pas disponible.</p></div><Card><form className="flex flex-col gap-6"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="flex flex-col gap-2"><Label htmlFor="trial-contact-name">Nom</Label><Input id="trial-contact-name" disabled value="Votre nom" /></div><div className="flex flex-col gap-2"><Label htmlFor="trial-contact-email">Adresse e-mail</Label><Input id="trial-contact-email" disabled value="votre@email.fr" /></div></div><fieldset disabled className="flex flex-col gap-3"><legend className="mb-2 text-[14px] font-medium text-muted">Motif</legend><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{["Suggestion d’amélioration", "Donner votre avis", "Signaler un problème", "Question sur l’utilisation", "Autre demande"].map((subject) => <label key={subject} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 opacity-60"><input type="checkbox" className="size-5 accent-[var(--accent)]" /><span className="text-[15px]">{subject}</span></label>)}</div></fieldset><div className="flex flex-col gap-2"><Label htmlFor="trial-contact-message">Message</Label><textarea id="trial-contact-message" disabled rows={6} placeholder="Expliquez-nous votre demande…" className="w-full resize-y rounded-xl border border-border bg-surface-2 px-4 py-3 text-[16px] text-foreground placeholder:text-muted opacity-60" /></div><Button type="button" disabled className="self-start">Envoyer</Button></form></Card><p className="mt-4 text-right text-[14px] text-muted">© François B.</p></div>,
  };

  const content: Record<Tab, () => ReactNode> = { teams: teamsContent, draw: drawContent, pools: poolsContent, standings: standingsContent, bracket: bracketContent, export: exportContent, poster: () => staticContent.poster, share: () => staticContent.share, rules: () => staticContent.rules, contact: () => staticContent.contact };

  return <main className="flex-1"><div className="border-b border-border"><div className="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-4"><Link href="/" className="text-[15px] text-muted hover:text-foreground">← Accueil</Link><div><p className="text-[15px] font-semibold text-accent">Mode essai · rien n’est sauvegardé</p><h1 className="text-3xl font-bold">{competitionName}</h1><p className="mt-1 text-sm text-muted">Concours de {scoreConfig.label} · {competitionMode === "AURARD" ? "Rondes" : "Poules qualificatives"}</p></div><nav className="flex flex-wrap gap-1 -mx-2" aria-label="Navigation du concours d’essai">{tabs.map(([id, label]) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`rounded-pill px-4 py-2 text-[14px] font-medium transition-colors ${activeTab === id ? "bg-accent text-white active-tab-shine" : "text-muted hover:text-foreground"}`}><span>{id === "pools" && competitionMode === "AURARD" ? "Rondes" : label}</span></button>)}</nav></div></div><section className="max-w-6xl mx-auto px-6 py-10">{content[activeTab]()}</section></main>;
}
