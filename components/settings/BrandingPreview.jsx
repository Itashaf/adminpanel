import { FaGraduationCap } from 'react-icons/fa';

export default function BrandingPreview({ logoUrl, displayName, primaryColor, secondaryColor }) {
  const gradient =
    primaryColor && secondaryColor
      ? { backgroundImage: `linear-gradient(to bottom, ${primaryColor}, ${secondaryColor})` }
      : undefined;

  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Live Preview</p>
      <div
        className="rounded-2xl p-5 bg-gradient-to-b from-purple-950 to-indigo-950"
        style={gradient}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-white overflow-hidden shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="School logo" className="w-full h-full object-contain p-1" />
            ) : (
              <FaGraduationCap className="w-5 h-5 text-purple-900" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold text-white leading-tight truncate">{displayName || 'Your School Name'}</p>
            <p className="text-xs text-purple-300 leading-tight">School Admin</p>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2">This is how your branding will appear in the sidebar and throughout the app.</p>
    </div>
  );
}
