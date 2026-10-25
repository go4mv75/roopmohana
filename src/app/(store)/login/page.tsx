import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { GoogleButton, LoginForm, RegisterForm } from "@/components/store/auth-forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; mode?: string }> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/account";
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" && next === "/account" ? "/admin" : next);
  const google = Boolean(process.env.GOOGLE_CLIENT_ID);
  const registerFirst = sp.mode === "register";

  return (
    <section className="container-x py-16 sm:py-24">
      <div className="text-center mb-12">
        <p className="eyebrow">Your account</p>
        <h1 className="display text-5xl mt-3">Welcome</h1>
        {next === "/checkout" && <p className="text-muted mt-3">Sign in or create an account to complete your order.</p>}
      </div>
      {sp.error === "google" && (
        <p className="max-w-3xl mx-auto mb-8 text-sm text-sindoor bg-sindoor-soft px-4 py-3">Google sign-in didn’t complete. Please try again.</p>
      )}
      <div className={`max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-0 ${registerFirst ? "[&>*:first-child]:lg:order-2" : ""}`}>
        <div className="card p-8 sm:p-10 lg:border-r-0">
          <h2 className="display text-3xl mb-6">Sign in</h2>
          <LoginForm next={next} />
          {google && (
            <>
              <Divider />
              <GoogleButton next={next} />
            </>
          )}
        </div>
        <div className="card p-8 sm:p-10 bg-ivory/50">
          <h2 className="display text-3xl mb-2">New here?</h2>
          <p className="text-sm text-muted mb-6">Track orders, save addresses and get 5% off your first order with ROOP05.</p>
          <RegisterForm next={next} />
        </div>
      </div>
      <p className="text-center text-xs text-muted mt-10">
        By continuing you agree to our <Link href="/policies/terms" className="underline">terms</Link> and{" "}
        <Link href="/policies/privacy" className="underline">privacy policy</Link>.
      </p>
    </section>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-4 my-6 text-xs text-muted uppercase tracking-[0.2em]">
      <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
    </div>
  );
}
