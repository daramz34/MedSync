import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ShieldAlert, TriangleAlert } from "lucide-react";
import Field from "../auth/Field";
import DoctorPicker from "./DoctorPicker";
import { useCreateAppointment } from "../../hooks/useClinicData";
import { useAuthStore } from "../../store/authStore";
import { roleOf, todayIso } from "../../utils/format";

const schema = z.object({
  doctor_id: z.string().min(1, "Choose a doctor"),
  appointment_date: z
    .string()
    .min(1, "Pick a date")
    .refine((v) => v >= todayIso(), "The date can't be in the past"),
  appointment_time: z.string().min(1, "Pick a time"),
  reason: z.string().trim().min(3, "Tell the doctor why you're visiting").max(300, "Max 300 characters"),
});

export default function BookingForm({ onDone, onCancel }) {
  const user = useAuthStore((s) => s.user);
  const unverified = roleOf(user) === "patient" && user?.is_verified === false;

  const create = useCreateAppointment();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { doctor_id: "" } });

  const reasonLength = (watch("reason") || "").length;

  const onSubmit = async (v) => {
    setServerError("");
    try {
      await create.mutateAsync({
        doctor_id: Number(v.doctor_id),
        appointment_date: v.appointment_date,
        appointment_time: v.appointment_time,
        reason: v.reason.trim(),
      });
      onDone?.();
    } catch (err) {
      setServerError(
        err.status === 403
          ? `${err.message} If your account hasn't been verified by the admin yet, wait for approval first.`
          : err.message || "Could not book the appointment."
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {unverified && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong>Your account hasn&rsquo;t been verified by the admin yet.</strong> You can&rsquo;t book
            appointments until the clinic confirms your identity.
          </span>
        </div>
      )}

      {serverError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-danger">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" /> {serverError}
        </div>
      )}

      <Controller
        control={control}
        name="doctor_id"
        render={({ field }) => (
          <DoctorPicker value={field.value} onChange={field.onChange} error={errors.doctor_id?.message} />
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" type="date" min={todayIso()} registration={register("appointment_date")} error={errors.appointment_date?.message} />
        <Field label="Time" type="time" registration={register("appointment_time")} error={errors.appointment_time?.message} />
      </div>

      <div>
        <label htmlFor="reason" className="mb-1.5 block text-sm font-medium">Describe your problem</label>
        <textarea
          id="reason"
          rows={3}
          maxLength={300}
          placeholder="e.g. Blurry vision in my left eye for two weeks"
          {...register("reason")}
          className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 ${
            errors.reason ? "border-danger focus:ring-red-200" : "border-slate-300 focus:border-primary focus:ring-blue-200"
          }`}
        />
        <div className="mt-1 flex justify-between text-xs">
          <span className="text-danger">{errors.reason?.message}</span>
          <span className="text-muted">{reasonLength}/300</span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
          Cancel
        </button>
        <button
          type="submit"
          disabled={create.isPending || unverified}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {create.isPending && <Loader2 size={16} className="animate-spin" />}
          {create.isPending ? "Sending…" : "Request appointment"}
        </button>
      </div>
    </form>
  );
}