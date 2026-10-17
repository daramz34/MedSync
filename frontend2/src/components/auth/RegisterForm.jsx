import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import Field from "./Field";
import { auth } from "../../services/api";

const schema = z
  .object({
    full_name: z.string().min(2, "Enter your full name"),
    username: z
      .string()
      .min(3, "At least 3 characters")
      .regex(/^[a-zA-Z0-9_.]+$/, "Letters, numbers, _ and . only"),
    email: z.string().email("Enter a valid email"),
    phone_number: z.string().min(7, "Enter a valid phone number"),
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

export default function RegisterForm() {
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ confirm, ...payload }) => {
    setServerError("");
    try {
      await auth.register(payload);
      setDone(true);
    } catch (err) {
      setServerError(err.message || "Could not create your account.");
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <CheckCircle2 className="mx-auto text-accent" size={40} />
        <h2 className="mt-3 text-lg font-semibold">Account created</h2>
        <p className="mt-1 text-sm text-muted">
          We sent a welcome email. You can sign in now.
        </p>
        <Link
          to="/sign-in"
          className="mt-5 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-danger"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          {serverError}
        </div>
      )}

      <Field label="Full name" registration={register("full_name")} error={errors.full_name?.message} autoComplete="name" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Username" registration={register("username")} error={errors.username?.message} autoComplete="username" />
        <Field label="Phone number" type="tel" registration={register("phone_number")} error={errors.phone_number?.message} autoComplete="tel" />
      </div>

      <Field label="Email" type="email" registration={register("email")} error={errors.email?.message} autoComplete="email" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password" type="password" registration={register("password")} error={errors.password?.message} autoComplete="new-password" />
        <Field label="Confirm password" type="password" registration={register("confirm")} error={errors.confirm?.message} autoComplete="new-password" />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
      >
        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-xs text-muted">
        Doctor and admin accounts are created by your clinic administrator.
      </p>
    </form>
  );
}