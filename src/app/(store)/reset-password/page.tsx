import { ResetForm } from "@/components/store/auth-forms";

export const metadata = { title: "Reset password", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <section className="container-x py-24 max-w-md">
      <h1 className="display text-4xl text-center mb-10">Choose a new password</h1>
      <ResetForm token={token} />
    </section>
  );
}
