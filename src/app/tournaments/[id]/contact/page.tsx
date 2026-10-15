import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { ContactForm } from "./contact-form";
import { sendContactAction } from "./actions";

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user.id) notFound();

  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Contact</h1>
          <p className="mt-2 text-muted">Une question, une idée ou un problème ? Écrivez-nous.</p>
        </div>

        <Card>
          <ContactForm
            action={sendContactAction.bind(null, id)}
            defaultName={session.user.name ?? ""}
            defaultEmail={session.user.email ?? ""}
          />
        </Card>

        <p className="mt-4 text-right text-[14px] text-muted">© François B.</p>
      </div>
    </main>
  );
}
