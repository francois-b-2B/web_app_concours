# Concours Belote & Boules

Web app de gestion de concours de belote/boules (doublettes) : inscriptions, tirage des
poules, feuilles de match, classement, tableau final à élimination directe.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Prisma](https://www.prisma.io) + PostgreSQL ([Neon](https://neon.tech) recommandé)
- [Auth.js](https://authjs.dev) (Google OAuth + email/mot de passe)
- [Tailwind CSS](https://tailwindcss.com)
- [Vitest](https://vitest.dev) pour les tests de la logique métier

## Configuration

Copier `.env.example` en `.env` et remplir :

- `DATABASE_URL` — chaîne de connexion Postgres (Neon : Dashboard → projet → Connection string)
- `AUTH_SECRET` — générer avec `npx auth secret`
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — Google Cloud Console → Identifiants → ID client OAuth

## Développement

```bash
npm install
npx prisma migrate dev   # applique le schéma à la base
npm run dev
```

## Tests

```bash
npm test
```

Les tests couvrent la logique métier pure (`src/lib/tournament/`) : répartition en
poules, génération des rencontres (round-robin), classement, seeding du tableau final.

## Structure

- `src/lib/tournament/` — algorithmes purs (poules, tirage, rencontres, classement, bracket, tables)
- `prisma/schema.prisma` — modèle de données
- `src/auth.ts` / `src/auth.config.ts` — authentification
- `src/app/` — pages (App Router)
