import { Link } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import RegisterForm from "../components/auth/RegisterForm";

export default function SignUp() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Register as a patient in about two minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/sign-in" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}