import { Link } from "react-router-dom";
import { HeartPulse, TriangleAlert } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-24">
      <div className="bg-danger px-4 py-3 text-center text-sm font-medium text-white">
        <TriangleAlert size={16} className="mr-2 inline -mt-0.5" />
        MedSync is not for medical emergencies. If you are in an emergency, call
        your local emergency number or go to the nearest hospital immediately.
      </div>

      <div className="bg-navy text-slate-300">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <HeartPulse size={20} />
              </span>
              MedSync
            </div>
            <p className="mt-3 max-w-sm text-sm text-slate-400">
              Appointments, prescriptions and medication tracking — connected in
              one place.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#how" className="hover:text-white">How it works</a></li>
              <li><a href="#tracker" className="hover:text-white">Medication tracker</a></li>
              <li><a href="#faq" className="hover:text-white">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Account</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/sign-in" className="hover:text-white">Sign in</Link></li>
              <li><Link to="/sign-up" className="hover:text-white">Get started</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 py-5 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} MedSync. All rights reserved.
        </div>
      </div>
    </footer>
  );
}