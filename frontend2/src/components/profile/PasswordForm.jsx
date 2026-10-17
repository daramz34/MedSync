import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, TriangleAlert } from "lucide-react";
import Field from "../auth/Field";
import { auth } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

const schema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    new_password: z.string().min(8, "At least 8 characters").max(128),
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, { path: ["confirm"], message: "Passwords do not match" })
  .refine((v) => v.new_password !== v.current_password, {
    path: ["new_password"],
    message: "Choose a different password from your current one",
  });

export default function PasswordForm() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ current_password, new_password }) => {
    setServerError("");
    try {
      await auth.changePassword({ currentPassword: current_password, newPassword: new_password });
      // The backend revokes every session after a password change
      await logout();
      navigate("/sign-in", {
        replace: true,
        state: { notice: "Password changed. Please sign in with your new password." },
      });
    } catch (err) {
      setServerError(err.message || "Could not change your password.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-danger">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" /> {serverError}
        </div>
      )}

      <Field label="Current password" type="password" registration={register("current_password")} error={errors.current_password?.message} autoComplete="current-password" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" type="password" registration={register("new_password")} error={errors.new_password?.message} autoComplete="new-password" />
        <Field label="Confirm new password" type="password" registration={register("confirm")} error={errors.confirm?.message} autoComplete="new-password" />
      </div>

      <p className="text-xs text-muted">You&rsquo;ll be signed out on every device after changing your password.</p>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          Change password
        </button>
      </div>
    </form>
  );
}