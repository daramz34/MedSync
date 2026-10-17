import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import Avatar from "../layout/Avatar";
import { auth } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX = 5 * 1024 * 1024;

export default function ProfilePicture() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const input = useRef(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (!ALLOWED.includes(file.type)) return setError("Choose a JPG, PNG or WebP image.");
    if (file.size > MAX) return setError("The image must be 5 MB or smaller.");

    setBusy("upload");
    try {
      setUser(await auth.uploadProfilePicture(file));
    } catch (err) {
      setError(err.message || "Could not upload the picture.");
    } finally {
      setBusy("");
    }
  };

  const onRemove = async () => {
    if (!window.confirm("Remove your profile picture?")) return;
    setError("");
    setBusy("remove");
    try {
      const fresh = await auth.removeProfilePicture();
      setUser(fresh ?? { ...user, profile_picture_url: null });
    } catch (err) {
      setError(err.message || "Could not remove the picture.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-5">
        <div className="relative">
          <Avatar user={user} size={88} />
          {busy && (
            <span className="absolute inset-0 grid place-items-center rounded-full bg-white/70">
              <Loader2 className="animate-spin text-primary" size={22} />
            </span>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => input.current?.click()}
              disabled={!!busy}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Camera size={15} /> {user?.profile_picture_url ? "Change photo" : "Upload photo"}
            </button>
            {user?.profile_picture_url && (
              <button
                onClick={onRemove}
                disabled={!!busy}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-red-50 hover:text-danger disabled:opacity-60"
              >
                <Trash2 size={15} /> Remove
              </button>
            )}
          </div>
          <p className="text-xs text-muted">JPG, PNG or WebP · up to 5 MB</p>
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} className="hidden" />
      </div>

      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}
    </div>
  );
}