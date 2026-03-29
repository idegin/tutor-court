import { getServerSideUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SettingsContainer } from '@/components/settings/settings-container';

export default async function TutorSettingsPage() {
  const { user, tutorProfile } = await getServerSideUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account settings and profile.</p>
      </div>

      <SettingsContainer user={user} tutorProfile={tutorProfile} />
    </div>
  );
}
