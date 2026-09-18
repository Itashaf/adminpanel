import ProfileClient from '@/components/profile/ProfileClient';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';

export const metadata = {
  title: 'My Profile | SchoolApp 360',
};

// Reached from the Topbar avatar's "Profile" menu item — works for whoever
// is actually signed in (SchoolAdmin or Teacher), since a real session must
// win over lib/currentUser.js's demo toggle here too (same fix as every
// other page this session — see app/dashboard/marks-entry/page.jsx).
export default async function ProfilePage() {
  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());

  return (
    <ProfileClient
      role={currentUser.role}
      name={currentUser.name}
      email={currentUser.email}
      photoUrl={currentUser.photoUrl || null}
    />
  );
}
