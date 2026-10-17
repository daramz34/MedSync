import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function Field({ label, error, registration, type = "text", ...props }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label htmlFor={registration.name} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={registration.name}
          type={isPassword && show ? "text" : type}
          aria-invalid={!!error}
          {...registration}
          {...props}
          className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${
            error
              ? "border-danger focus:ring-red-200"
              : "border-slate-300 focus:border-primary focus:ring-blue-200"
          } ${isPassword ? "pr-11" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}