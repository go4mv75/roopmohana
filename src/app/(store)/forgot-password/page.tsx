import { ForgotForm } from "@/components/store/auth-forms";

export const metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPage() {
  return (
    <section className="container-x py-24 max-w-md">
      <h1 className="display text-4xl text-center">Forgot your password?</h1>
      <p className="text-muted text-center mt-3 mb-10">Enter your email and we’ll send you a link to reset it.</p>
      <ForgotForm />
    </section>
  );
}
