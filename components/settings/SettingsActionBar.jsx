import Button from '@/components/Button';

export default function SettingsActionBar({ onCancel, isSubmitting, isDirty }) {
  return (
    <div className="sticky bottom-0 -mx-6 sm:-mx-8 mt-6 px-6 sm:px-8 py-4 bg-white/95 backdrop-blur border-t border-gray-100 rounded-b-2xl flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
      <div className="w-full sm:w-auto">
        <Button label="Cancel" type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting || !isDirty} fullWidth />
      </div>
      <Button
        type="submit"
        label={isSubmitting ? 'Saving...' : 'Save Changes'}
        disabled={isSubmitting || !isDirty}
        fullWidth={false}
      />
    </div>
  );
}
