import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2, TriangleAlert } from "lucide-react";
import DrugNameInput from "./DrugNameInput";
import { useCreatePrescription } from "../../hooks/useClinicData";
import { pretty } from "../../utils/format";

// Matches `class Frequency` in your backend enums.py
export const FREQUENCIES = ["once_daily", "twice_daily", "three_times_daily", "weekly"];

const item = z.object({
  drug_name: z.string().trim().min(1, "Drug name is required").max(255),
  dosage: z.string().trim().min(1, "Dosage is required").max(100),
  frequency: z.string().min(1, "Choose a frequency"),
  duration_days: z
    .number({ invalid_type_error: "Enter the number of days" })
    .int("Whole days only")
    .min(1, "At least 1 day"),
  instructions: z.string().max(300, "Max 300 characters").optional(),
});

const schema = z.object({
  notes: z.string().max(300, "Max 300 characters").optional(),
  items: z.array(item).min(1, "Add at least one medicine"),
});

const blank = { drug_name: "", dosage: "", frequency: "", duration_days: 7, instructions: "" };

const inp = (err) =>
  `w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 ${
    err ? "border-danger focus:ring-red-200" : "border-slate-300 focus:border-primary focus:ring-blue-200"
  }`;

export default function IssuePrescriptionForm({ appointmentId, onDone, onCancel }) {
  const create = useCreatePrescription();
  const [serverError, setServerError] = useState("");
  const [picked, setPicked] = useState({}); // field id -> drug chosen from the dropdown

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { notes: "", items: [blank] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const onSubmit = async (v) => {
    setServerError("");
    const id = Number(appointmentId);
    if (!Number.isInteger(id)) {
      setServerError("No appointment selected. Open this from a confirmed appointment.");
      return;
    }
    try {
      await create.mutateAsync({
        appointment_id: id,
        notes: v.notes?.trim() || undefined,
        items: v.items.map((i) => ({
          drug_name: i.drug_name.trim(),
          dosage: i.dosage.trim(),
          frequency: i.frequency,
          duration_days: i.duration_days,
          instructions: i.instructions?.trim() || undefined,
        })),
      });
      onDone?.();
    } catch (err) {
      setServerError(err.message || "Could not issue the prescription.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-danger">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" /> {serverError}
        </div>
      )}

      <div className="space-y-4">
        {fields.map((f, i) => {
          const e = errors.items?.[i];
          const drug = picked[f.id];
          const current = (watch(`items.${i}.drug_name`) || "").trim().toLowerCase();
          const showInfo = drug && drug.name.toLowerCase() === current;

          return (
            <fieldset key={f.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <legend className="text-sm font-semibold">Medicine {i + 1}</legend>
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(i)} aria-label={`Remove medicine ${i + 1}`} className="text-muted hover:text-danger">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium">Drug name</label>
                  <Controller
                    control={control}
                    name={`items.${i}.drug_name`}
                    render={({ field }) => (
                      <DrugNameInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Start typing to search…"
                        className={inp(e?.drug_name)}
                        onSelect={(d) => {
                          setPicked((p) => ({ ...p, [f.id]: d }));
                          // Fill the standard dosage only if the doctor hasn't typed one
                          if (d.dosage && !watch(`items.${i}.dosage`)) {
                            setValue(`items.${i}.dosage`, d.dosage, { shouldValidate: true });
                          }
                        }}
                      />
                    )}
                  />
                  {e?.drug_name && <p className="mt-1 text-xs text-danger">{e.drug_name.message}</p>}

                  {showInfo && drug.warnings && (
                    <p className="mt-2 flex gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-3">{drug.warnings}</span>
                    </p>
                  )}
                  {showInfo && drug.interactions && (
                    <p className="mt-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
                      <strong>Interactions:</strong> <span className="line-clamp-2">{drug.interactions}</span>
                    </p>
                  )}
                  {showInfo && drug.dosage && (
                    <button
                      type="button"
                      onClick={() => setValue(`items.${i}.dosage`, drug.dosage, { shouldValidate: true })}
                      className="mt-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      Use standard dosage: {drug.dosage}
                    </button>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">Dosage</label>
                  <input placeholder="e.g. 500 mg" {...register(`items.${i}.dosage`)} className={inp(e?.dosage)} />
                  {e?.dosage && <p className="mt-1 text-xs text-danger">{e.dosage.message}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">Frequency</label>
                  <select {...register(`items.${i}.frequency`)} className={inp(e?.frequency)}>
                    <option value="">Select…</option>
                    {FREQUENCIES.map((x) => (
                      <option key={x} value={x}>{pretty(x)}</option>
                    ))}
                  </select>
                  {e?.frequency && <p className="mt-1 text-xs text-danger">{e.frequency.message}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">Duration (days)</label>
                  <input type="number" min={1} {...register(`items.${i}.duration_days`, { valueAsNumber: true })} className={inp(e?.duration_days)} />
                  {e?.duration_days && <p className="mt-1 text-xs text-danger">{e.duration_days.message}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">Instructions (optional)</label>
                  <input placeholder="e.g. Take with food" {...register(`items.${i}.instructions`)} className={inp(e?.instructions)} />
                  {e?.instructions && <p className="mt-1 text-xs text-danger">{e.instructions.message}</p>}
                </div>
              </div>
            </fieldset>
          );
        })}
      </div>

      <button type="button" onClick={() => append(blank)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
        <Plus size={15} /> Add another medicine
      </button>

      <div>
        <label htmlFor="rx-notes" className="mb-1.5 block text-sm font-medium">Notes for the patient (optional)</label>
        <textarea id="rx-notes" rows={2} maxLength={300} placeholder="e.g. Allergy: Penicillin" {...register("notes")} className={inp(errors.notes)} />
        {errors.notes && <p className="mt-1 text-xs text-danger">{errors.notes.message}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
          Cancel
        </button>
        <button
          type="submit"
          disabled={create.isPending}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {create.isPending && <Loader2 size={16} className="animate-spin" />}
          {create.isPending ? "Issuing…" : "Issue prescription"}
        </button>
      </div>
    </form>
  );
}