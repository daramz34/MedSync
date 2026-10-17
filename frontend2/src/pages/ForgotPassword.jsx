import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MailCheck, TriangleAlert } from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout";
import Field from "../components/auth/Field";
import { api } from "../services/api";

const emailSchema = z.object({ email: z.string().trim().email("Enter a valid email") });

const resetSchema = z
  .object({
    otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
    new_password: z.string().min(8, "At least 8 characters").max(128),
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });

const friendly = (err, fallback) =>
  err.status === 429 ? "Too many attempts. Please wait a minute and try again." : err.message || fallback;

function ErrorBanner({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-danger">
      <TriangleAlert size={16} className="mt-0.5 shrink-0" /> {children}
    </div>
  );
}

function EmailStep({ onSent }) {
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(emailSchema),
  });

  const onSubmit = async ({ email }) => {
    setServerError("");
    try {
      await api.post("/auth/forgot-password", { email });
      onSent(email);
    } catch (err) {
      setServerError(friendly(err, "Could not send the code."));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <ErrorBanner>{serverError}</ErrorBanner>
      <Field label="Email" type="email" registration={register("email")} error={errors.email?.message} autoComplete="email" placeholder="you@example.com" />
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
      >
        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
        {isSubmitting ? "Sending…" : "Send reset code"}
      </button>
    </form>
  );
}

function ResetStep({ email, onBack }) {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async ({ otp, new_password }) => {
    setServerError("");
    try {
      await api.post("/auth/reset-password", { email, otp, new_password });
      navigate("/sign-in", {
        replace: true,
        state: { notice: "Password reset. Please sign in with your new password." },
      });
    } catch (err) {
      setServerError(friendly(err, "Could not reset your password."));
    }
  };

  const resend = async () => {
    setServerError("");
    setResent(false);
    setResending(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setResent(true);
    } catch (err) {
      setServerError(friendly(err, "Could not resend the code."));
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3.5 py-3 text-sm text-green-800">
        <MailCheck size={16} className="mt-0.5 shrink-0" />
        <span>
          If <strong>{email}</strong> is registered, a 6-digit code is on its way. Check your spam folder too.
        </span>
      </div>

      <ErrorBanner>{serverError}</ErrorBanner>
      {resent && <p role="status" className="text-sm text-green-700">A new code was sent.</p>}

      <Field label="6-digit code" registration={register("otp")} error={errors.otp?.message} inputMode="numeric" maxLength={6} autoComplete="one-time-code" placeholder="123456" />
      <Field label="New password" type="password" registration={register("new_password")} error={errors.new_password?.message} autoComplete="new-password" />
      <Field label="Confirm new password" type="password" registration={register("confirm")} error={errors.confirm?.message} autoComplete="new-password" />

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
      >
        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
        {isSubmitting ? "Resetting…" : "Reset password"}
      </button>

      <div className="flex justify-between text-sm">
        <button type="button" onClick={onBack} className="font-medium text-muted hover:text-navy">
          Use a different email
        </button>
        <button type="button" onClick={resend} disabled={resending} className="font-semibold text-primary hover:underline disabled:opacity-60">
          {resending ? "Sending…" : "Resend code"}
        </button>
      </div>
    </form>
  );
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  return (
    <AuthLayout
      title={email ? "Enter your code" : "Forgot your password?"}
      subtitle={
        email
          ? "Type the code from your email and choose a new password."
          : "Enter your account email and we'll send you a 6-digit code."
      }
      footer={
        <>
          Remembered it?{" "}
          <Link to="/sign-in" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {email ? <ResetStep email={email} onBack={() => setEmail("")} /> : <EmailStep onSent={setEmail} />}
    </AuthLayout>
  );
}