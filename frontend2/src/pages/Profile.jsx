import { Panel } from "../components/dashboard/Panel";
import ProfilePicture from "../components/profile/ProfilePicture";
import ProfileForm from "../components/profile/ProfileForm";
import PasswordForm from "../components/profile/PasswordForm";

export default function Profile() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Panel title="Profile photo" description="Shown in the top bar and to the people you see in the clinic.">
        <ProfilePicture />
      </Panel>
      <Panel title="Personal details">
        <ProfileForm />
      </Panel>
      <Panel title="Password" description="Use at least 8 characters.">
        <PasswordForm />
      </Panel>
    </div>
  );
}