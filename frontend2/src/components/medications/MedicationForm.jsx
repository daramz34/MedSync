import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, TriangleAlert } from "lucide-react";
import Field from "../auth/Field";
import { FREQUENCIES } from "../prescriptions/IssuePrescriptionForm";
import { useCreateMedication } from "../../hooks/useClinicData";
import { pretty, todayIso } from "../../utils/format";

const schema = z.object({
  drug_name: z.string().trim().min(1, "Enter the medicine name").max(255),
  dosage: z.string().trim().min(1, "Enter the dosage").max(100),
  frequency: z.string().min(1, "Choose a frequency"),
  duration_days: z
    .number({ invalid_type_error: "Enter the number of days" })
    .int("Whole days only")
    .min(1, "At least 1 day"),
  start_date: z.string().min(1, "Pick a start date"),
  reminder_time: z.string().optional(),
  reminder_enabled: z.boolean(),
});

const selectClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-200";

export default function MedicationForm({ onDone, onCancel }) {
  const create = useCreateMedication();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      duration_days: 7,
      start_date: todayIso(),
      reminder_enabled: true,
    },
  });

  const onSubmit = async (v) => {
    setServerError("");
    try {
      await create.mutateAsync({
        drug_name: v.drug_name.trim(),
        dosage: v.dosage.trim(),
        frequency: v.frequency,
        duration_days: v.duration_days,
        start_date: v.start_date,
        reminder_time: v.reminder_time || undefined,
        reminder_enabled: v.reminder_enabled,
      });
      onDone?.();
    } catch (err) {
      setServerError(err.message || "Could not add the medication.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-danger"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0" /> {serverError}
        </div>
      )}

      <Field
        label="Medicine name"
        registration={register("drug_name")}
        error={errors.drug_name?.message}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Dosage"
          placeholder="e.g. 500 mg"
          registration={register("dosage")}
          error={errors.dosage?.message}
        />

        <div>
          <label htmlFor="frequency" className="mb-1.5 block text-sm font-medium">
            Frequency
          </label>
          <select id="frequency" {...register("frequency")} className={selectClass}>
            <option value="">Select…</option>
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {pretty(f)}
              </option>
            ))}
          </select>
          {errors.frequency && (
            <p className="mt-1 text-xs text-danger">{errors.frequency.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="duration_days" className="mb-1.5 block text-sm font-medium">
            Duration (days)
          </label>
          <input
            id="duration_days"
            type="number"
            min={1}
            {...register("duration_days", { valueAsNumber: true })}
            className={selectClass}
          />
          {errors.duration_days && (
            <p className="mt-1 text-xs text-danger">{errors.duration_days.message}</p>
          )}
        </div>

        <Field
          label="Start date"
          type="date"
          registration={register("start_date")}
          error={errors.start_date?.message}
        />
      </div>

      <div className="grid items-end gap-4 sm:grid-cols-2">
        <Field
          label="Reminder time (optional)"
          type="time"
          registration={register("reminder_time")}
          error={errors.reminder_time?.message}
        />
        <label className="flex items-center gap-2 pb-2.5 text-sm font-medium">
          <input
            type="checkbox"
            {...register("reminder_enabled")}
            className="h-4 w-4 accent-[#2563eb]"
          />
          Remind me
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={create.isPending}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {create.isPending && <Loader2 size={16} className="animate-spin" />}
          Add medication
        </button>
      </div>
    </form>
  );
}