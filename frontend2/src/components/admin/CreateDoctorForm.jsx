import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, TriangleAlert } from "lucide-react";
import Field from "../auth/Field";
import { useCreateDoctor } from "../../hooks/useClinicData";
import { pretty } from "../../utils/format";

// Matches `class Specialization` in your backend enums.py
const SPECIALIZATIONS = ["general", "dentist", "optometrist", "psychologist", "physiotherapist"];

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter the full name"),
  username: z
    .string()
    .trim()
    .min(3, "At least 3 characters")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Letters, numbers, _ . - only"),
  email: z.string().email("Enter a valid email"),
  phone_number: z.string().min(7, "Enter a valid phone number"),
  specialization: z.string().min(1, "Choose a specialization"),
  password: z.string().min(8, "At least 8 characters"),
});

export default function CreateDoctorForm({ onDone, onCancel }) {
  const create = useCreateDoctor();
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (v) => {
    setServerError("");
    try {
      await create.mutateAsync(v);
      onDone?.(v.full_name);
    } catch (err) {
      setServerError(err.message || "Could not create the doctor account.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-danger">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" /> {serverError}
        </div>
      )}

      <Field label="Full name" registration={register("full_name")} error={errors.full_name?.message} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Username" registration={register("username")} error={errors.username?.message} />
        <Field label="Phone number" type="tel" registration={register("phone_number")} error={errors.phone_number?.message} />
      </div>

      <Field label="Email" type="email" registration={register("email")} error={errors.email?.message} />

      <div>
        <label htmlFor="specialization" className="mb-1.5 block text-sm font-medium">Specialization</label>
        <select
          id="specialization"
          {...register("specialization")}
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-200"
        >
          <option value="">Select…</option>
          {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{pretty(s)}</option>)}
        </select>
        {errors.specialization && <p className="mt-1 text-xs text-danger">{errors.specialization.message}</p>}
      </div>

      <Field label="Temporary password" type="password" registration={register("password")} error={errors.password?.message} autoComplete="new-password" />

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
          Cancel
        </button>
        <button
          type="submit"
          disabled={create.isPending}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {create.isPending && <Loader2 size={16} className="animate-spin" />}
          Register doctor
        </button>
      </div>
    </form>
  );
}