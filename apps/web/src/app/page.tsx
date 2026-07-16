import Link from "next/link";
import { buttonVariants } from "@securitydesk/ui";
import { getPublicAppName } from "@/lib/app";
import { getDictionary } from "@/lib/i18n";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@securitydesk/ui";

export default function HomePage() {
  const appName = getPublicAppName();
  const t = getDictionary("sl");

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(221_83%_45%/0.18),transparent_45%),radial-gradient(circle_at_80%_0%,hsl(199_89%_48%/0.15),transparent_40%),linear-gradient(160deg,#f8fbff,#eef4fb_45%,#e8eef8)] dark:bg-[radial-gradient(circle_at_20%_20%,hsl(217_91%_60%/0.2),transparent_45%),linear-gradient(160deg,#0b1220,#111827)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6">
        <header className="flex items-center justify-between">
          <p className="text-xl font-semibold tracking-tight text-primary">{appName}</p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
              {t.auth.login}
            </Link>
            <Link href="/register" className={cn(buttonVariants())}>
              {t.auth.register}
            </Link>
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center gap-8 py-16 md:max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-6xl">{appName}</h1>
          <p className="max-w-xl text-lg text-muted-foreground md:text-xl">{t.brandTagline}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
              {t.auth.createAccount}
            </Link>
            <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
              {t.auth.signIn}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
