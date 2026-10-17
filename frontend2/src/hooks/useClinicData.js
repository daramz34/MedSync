import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { dosesPerDay, toList } from "../utils/format";

/* ---------- reads ---------- */

export const useAppointments = (options = {}) =>
  useQuery({
    queryKey: ["appointments"],
    queryFn: async () => toList(await api.get("/appointments/?page=1&limit=100", { auth: true })),
    ...options,
  });

// The backend returns active medications by default, so status is always explicit.
export const useMedications = (options = {}) => {
  const { status = "active", ...rest } = options;
  return useQuery({
    queryKey: ["medications", status],
    queryFn: async () => toList(await api.get(`/medications/?status=${status}`, { auth: true })),
    ...rest,
  });
};

export const usePrescriptions = (options = {}) =>
  useQuery({
    queryKey: ["prescriptions"],
    queryFn: async () => toList(await api.get("/prescriptions/?page=1&limit=20", { auth: true })),
    ...options,
  });

export const useTodayLogs = (options = {}) =>
  useQuery({
    queryKey: ["logs", "today"],
    queryFn: async () => {
      const r = await api.get("/logs/today", { auth: true });
      return Array.isArray(r) ? r : r?.logs ?? [];
    },
    ...options,
  });

export function useStreaks(ids) {
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["streak", id],
      retry: false,
      queryFn: async () => {
        try {
          return await api.get(`/streaks/${id}`, { auth: true });
        } catch (e) {
          if (e.status === 404) return null; // no streak yet
          throw e;
        }
      },
    })),
  });
  return {
    data: results.map((r) => r.data).filter(Boolean),
    loading: results.some((r) => r.isLoading),
  };
}

export const useAdminStats = (options = {}) =>
  useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => api.get("/admin/stats", { auth: true }),
    ...options,
  });

export const usePendingUsers = (options = {}) =>
  useQuery({
    queryKey: ["admin", "pending"],
    queryFn: async () => toList(await api.get("/auth/users/pending", { auth: true })),
    ...options,
  });

/* ---------- appointments ---------- */

export const useDoctors = () =>
  useQuery({
    queryKey: ["doctors"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const r = await api.get("/appointments/doctors?page=1&limit=50");
      return r?.doctors ?? toList(r);
    },
  });

export const useAppointment = (id) =>
  useQuery({
    queryKey: ["appointment", String(id)],
    queryFn: () => api.get(`/appointments/${id}`, { auth: true }),
    retry: false,
  });

// 404 simply means "no prescription yet"
export const useAppointmentPrescription = (id) =>
  useQuery({
    queryKey: ["appointment", String(id), "prescription"],
    retry: false,
    queryFn: async () => {
      try {
        return await api.get(`/appointments/${id}/prescription`, { auth: true });
      } catch (e) {
        if (e.status === 404) return null;
        throw e;
      }
    },
  });

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post("/appointments/", body, { auth: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/appointments/${id}`, body, { auth: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appointment"] });
    },
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/appointments/${id}`, { auth: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appointment"] });
    },
  });
}

/* ---------- prescriptions ---------- */

export const usePrescription = (id) =>
  useQuery({
    queryKey: ["prescription", String(id)],
    queryFn: () => api.get(`/prescriptions/${id}`, { auth: true }),
    retry: false,
  });

export function useCreatePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post("/prescriptions/", body, { auth: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prescriptions"] });
      qc.invalidateQueries({ queryKey: ["appointment"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useRevokeQr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/prescriptions/${id}/revoke-qr`, undefined, { auth: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prescription"] });
      qc.invalidateQueries({ queryKey: ["prescriptions"] });
      qc.invalidateQueries({ queryKey: ["appointment"] });
    },
  });
}

// Optional helper: failures are silent, the form works without it.
// If /docs shows a different parameter name than `q`, change it here.
// The backend parameter is `name`, and this route is public (no token needed).
export const useDrugSearch = (term) =>
  useQuery({
    queryKey: ["drugs", term],
    enabled: term.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () =>
      toList(await api.get(`/drugs/search?name=${encodeURIComponent(term.trim())}`)),
  });
export function useScanPrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (qr_token) => api.post("/prescriptions/scan", { qr_token }, { auth: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
      qc.invalidateQueries({ queryKey: ["prescriptions"] });
      qc.invalidateQueries({ queryKey: ["prescription"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
    },
  });
}

/* ---------- medications ---------- */

export const useMedication = (id) =>
  useQuery({
    queryKey: ["medication", String(id)],
    queryFn: () => api.get(`/medications/${id}`, { auth: true }),
    retry: false,
  });

export const useMedicationLogs = (id) =>
  useQuery({
    queryKey: ["logs", "med", String(id)],
    queryFn: async () => {
      const r = await api.get(`/logs/${id}`, { auth: true });
      return r?.logs ?? toList(r);
    },
  });

export const useStreak = (id) =>
  useQuery({
    queryKey: ["streak", id],
    retry: false,
    queryFn: async () => {
      try {
        return await api.get(`/streaks/${id}`, { auth: true });
      } catch (e) {
        if (e.status === 404) return null;
        throw e;
      }
    },
  });

export function useLogDose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (medication_id) =>
      api.post("/logs/", { medication_id, status: "taken" }, { auth: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logs"] });
      qc.invalidateQueries({ queryKey: ["streak"] });
    },
  });
}

export function useLogMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ medication_id, status, notes }) =>
      api.post("/logs/", { medication_id, status, notes: notes || undefined }, { auth: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logs"] });
      qc.invalidateQueries({ queryKey: ["streak"] });
    },
  });
}

export function useCreateMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post("/medications/", body, { auth: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["medications"] }),
  });
}

export function useUpdateMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/medications/${id}`, body, { auth: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
      qc.invalidateQueries({ queryKey: ["medication"] });
    },
  });
}

export function useSetReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reminder_time, reminder_enabled }) =>
      api.patch(
        `/medications/${id}`,
        { reminder_time: reminder_time || undefined, reminder_enabled },
        { auth: true }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
      qc.invalidateQueries({ queryKey: ["medication"] });
    },
  });
}

export function useDeleteMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/medications/${id}`, { auth: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["medications"] }),
  });
}

export function useTestReminder() {
  return useMutation({
    mutationFn: (id) => api.post(`/medications/${id}/test-reminder`, undefined, { auth: true }),
  });
}

/* ---------- admin ---------- */

export function useVerifyUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/auth/users/${id}/verify`, undefined, { auth: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export const useAdminPatients = () =>
  useQuery({
    queryKey: ["admin", "patients"],
    queryFn: async () => toList(await api.get("/admin/patients?page=1&limit=100", { auth: true })),
  });

export const useAdminDoctors = () =>
  useQuery({
    queryKey: ["admin", "doctors"],
    queryFn: async () => {
      const r = await api.get("/admin/doctors?page=1&limit=100", { auth: true });
      return r?.doctors ?? toList(r);
    },
  });

export function useCreateDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post("/auth/register/doctor", body, { auth: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["doctors"] });
    },
  });
}

export function useRemoveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/admin/users/${id}`, { auth: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["doctors"] });
    },
  });
}

/* ---------- bell notifications (derived from the same cached queries) ---------- */

export function useNotifications(role) {
  const apps = useAppointments({ enabled: role === "doctor" });
  const meds = useMedications({ status: "active", enabled: role === "patient" });
  const logs = useTodayLogs({ enabled: role === "patient" });
  const pending = usePendingUsers({ enabled: role === "admin" });

  const items = [];

  if (role === "patient") {
    // A medication still needs attention if today's logs are below its daily dose count
    const left = (meds.data || []).filter((m) => {
      const done = (logs.data || []).filter((l) => l.medication_id === m.id).length;
      return done < dosesPerDay(m.frequency);
    }).length;
    if (left > 0)
      items.push({
        id: "doses",
        text: `${left} medication${left > 1 ? "s" : ""} still to log today`,
        to: "/medications",
      });
  }

  if (role === "doctor") {
    const n = (apps.data || []).filter((a) => String(a.status).toLowerCase() === "pending").length;
    if (n > 0)
      items.push({
        id: "requests",
        text: `${n} appointment request${n > 1 ? "s" : ""} waiting`,
        to: "/doctor/appointments",
      });
  }

  if (role === "admin") {
    const n = (pending.data || []).length;
    if (n > 0)
      items.push({
        id: "verify",
        text: `${n} patient${n > 1 ? "s" : ""} awaiting verification`,
        to: "/admin/users",
      });
  }

  return items;
}
export function useSaveReminders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled, times }) =>
      api.put(`/reminders/${id}`, { enabled, times }, { auth: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
      qc.invalidateQueries({ queryKey: ["medication"] });
    },
  });
}
/* ---------- feedback ---------- */

export const useAdminFeedback = (status = "open") =>
  useQuery({
    queryKey: ["admin", "feedback", status],
    queryFn: async () => {
      const filter = status === "all" ? "" : `&status=${status}`;
      return toList(await api.get(`/admin/feedback?page=1&limit=100${filter}`, { auth: true }));
    },
  });

export function useUpdateFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/admin/feedback/${id}`, { status }, { auth: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "feedback"] }),
  });
}