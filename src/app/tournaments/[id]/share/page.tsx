import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function ShareTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user.id) notFound();

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament || tournament.ownerId !== session.user.id) notFound();

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const publicUrl = `${protocol}://${host}/public/tournaments/${id}`;
  const qrCode = await QRCode.toDataURL(publicUrl, {
    width: 520,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">QR code public</h1>
          <p className="mt-2 text-muted">
            Les participants peuvent suivre le concours en lecture seule.
          </p>
        </div>

        <Card className="flex flex-col items-center gap-5 text-center py-8">
          <div className="rounded-2xl bg-white p-3">
            <Image src={qrCode} alt={`QR code du concours ${tournament.name}`} width={300} height={300} />
          </div>
          <p className="text-lg font-semibold">{tournament.name}</p>
          <a className="text-sm text-accent break-all hover:underline" href={publicUrl} target="_blank">
            {publicUrl}
          </a>
          <p className="text-sm text-muted">
            Ce QR code restera identique pour ce concours. Il fonctionnera sur les téléphones après la mise en ligne du site.
          </p>
        </Card>
      </div>
    </main>
  );
}
