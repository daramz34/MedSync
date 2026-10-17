import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, TriangleAlert } from "lucide-react";
import Field from "./Field";
import { useAuthStore } from "../../store/authStore";

const schema = z.object({
  username: z.string().min(1, "Enter your username or email"),
  password: z.string().min(1, "Enter your password"),
});

export default function LoginForm() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setServerError("");
    try {
      await login(values);
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (err) {
      setServerError(
        err.status === 429
          ? "Too many attempts. Please wait a minute and try again."
          : err.message || "Could not sign in. Please try again."
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {location.state?.notice && !serverError && (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-3 text-sm text-green-800">
          {location.state.notice}
        </div>)}
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-danger"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          {serverError}
        </div>
      )}

      <Field
        label="Username or email"
        registration={register("username")}
        error={errors.username?.message}
        autoComplete="username"
        placeholder="you@example.com"
      />
      <Field
        label="Password"
        type="password"
        registration={register("password")}
        error={errors.password?.message}
        autoComplete="current-password"
        placeholder="••••••••"
      />

      <div className="text-right">
        <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
      >
        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}