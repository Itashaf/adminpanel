'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FileDropzone from '@/components/FileDropzone';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Toast from '@/components/Toast';
import {
  uploadTeacherSelfPhoto,
  uploadAdminProfilePhoto,
  updateTeacherSelfProfile,
  updateAdminSelfProfile,
} from '@/lib/api';
import { STUDENT_PHOTO_ACCEPT_TYPES, MAX_STUDENT_PHOTO_BYTES } from '@/lib/studentConstants';

// One page for both roles the Topbar avatar's "Profile" link can reach —
// SchoolAdmin and Teacher each have their own self-service name+photo
// update behind it (updateAdminSelfProfile / updateTeacherSelfProfile),
// but the same simple form works for either. A Teacher's photo also feeds
// straight back into the Teachers list/profile the admin sees — it's the
// same Teacher.photoUrl either side sets.
export default function ProfileClient({ role, name: initialName, email, photoUrl: initialPhotoUrl }) {
  const router = useRouter();
  const [name, setName] = useState(initialName || '');
  const [photo, setPhoto] = useState(initialPhotoUrl);
  const [photoError, setPhotoError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const isAdmin = role === 'SchoolAdmin' || role === 'SuperAdmin';

  const handlePhotoSelect = (file) => {
    setPhotoError('');
    if (!file) {
      setPhoto(null);
      return;
    }
    if (!STUDENT_PHOTO_ACCEPT_TYPES.includes(file.type)) {
      setPhotoError('Only JPG, PNG, or WEBP images are allowed.');
      return;
    }
    if (file.size > MAX_STUDENT_PHOTO_BYTES) {
      setPhotoError('Image must be 2MB or smaller.');
      return;
    }
    setPhoto(file);
  };

  const handleSave = async () => {
    setFormError('');
    setIsSaving(true);
    try {
      const photoUrl = photo instanceof File ? await (isAdmin ? uploadAdminProfilePhoto : uploadTeacherSelfPhoto)(photo) : photo;
      const save = isAdmin ? updateAdminSelfProfile : updateTeacherSelfProfile;
      const updated = await save({ name, photoUrl });
      setPhoto(updated.photoUrl);
      setToastMessage('Profile updated.');
      router.refresh();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">{isAdmin ? 'School Admin' : 'Teacher'} account</p>
      </div>

      {formError && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        <FileDropzone
          label="Profile Photo"
          accept="image/jpeg,image/png,image/webp"
          value={photo}
          onFileSelect={handlePhotoSelect}
          error={photoError}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <Input value={email || ''} disabled />
          <p className="text-xs text-gray-400 mt-1.5">Email can't be changed here — contact your school's IT admin.</p>
        </div>

        <div className="flex justify-end">
          <Button label={isSaving ? 'Saving...' : 'Save Changes'} onClick={handleSave} disabled={isSaving} />
        </div>
      </div>

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
