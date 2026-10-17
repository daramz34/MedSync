import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import Field from "../auth/Field";
import { auth } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { formatDate, pretty, roleOf } from "../../utils/format";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120, "Max 120 characters"),
  username: z
    .string()
    .trim()
    .min(3, "At least 3 characters")
    .max(30, "Max 30 characters")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Letters, numbers, _ . - only"),
  phone_number: z.string().trim().min(7, "Enter a valid phone number").max(30),
});

function ReadOnly({ label, children }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-muted">{children}</p>
    </div>
  );
}

export default function ProfileForm() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [serverError, setServerError] = useState("");
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: user?.full_name || "",
      username: user?.username || "",
      phone_number: user?.phone_number || "",
    },
  });

  const onSubmit = async (v) => {
    setServerError("");
    setSaved(false);

    // Send only what changed (the backend rejects unknown fields)
    const payload = {};
    if (v.full_name !== user.full_name) payload.full_name = v.full_name;
    if (v.username.toLowerCase() !== user.username) payload.username = v.username;
    if (v.phone_number !== (user.phone_number || "")) payload.phone_number = v.phone_number;
    if (!Object.keys(payload).length) return;

    try {
      const updated = await auth.updateProfile(payload);
      setUser(updated);
      reset({
        full_name: updated.full_name,
        username: updated.username,
        phone_number: updated.phone_number || "",
      });
      setSaved(true);
    } catch (err) {
      setServerError(err.message || "Could not save your changes.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-danger">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" /> {serverError}
        </div>
      )}
      {saved && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3.5 py-3 text-sm text-green-800">
          <CheckCircle2 size={16} /> Your details were updated.
        </div>
      )}

      <Field label="Full name" registration={register("full_name")} error={errors.full_name?.message} autoComplete="name" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Username" registration={register("username")} error={errors.username?.message} autoComplete="username" />
        <Field label="Phone number" type="tel" registration={register("phone_number")} error={errors.phone_number?.message} autoComplete="tel" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ReadOnly label="Email">{user?.email}</ReadOnly>
        <ReadOnly label="Role">
          {pretty(roleOf(user))}
          {user?.specialization && ` · ${pretty(user.specialization)}`}
        </ReadOnly>
      </div>

      <p className="text-xs text-muted">
        Member since {formatDate(user?.created_at)}
        {roleOf(user) === "patient" && ` · ${user?.is_verified ? "Verified by the clinic" : "Awaiting clinic verification"}`}
      </p>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          Save changes
        </button>
      </div>
    </form>
  );
}