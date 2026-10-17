import { Link } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import LoginForm from "../components/auth/LoginForm";

export default function SignIn() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your appointments, prescriptions and medication."
      footer={
        <>
          New to MedSync?{" "}
          <Link to="/sign-up" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}