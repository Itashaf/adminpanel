import Image from 'next/image';
import { FiShield, FiUsers, FiBarChart2 } from 'react-icons/fi';
import { FaGraduationCap } from 'react-icons/fa';

const FEATURES = [
  { icon: FiShield, label: 'Secure & Reliable' },
  { icon: FiUsers, label: 'Role Based Access' },
  { icon: FiBarChart2, label: 'Smart Insights' },
];

// Purely decorative — the login page's split-screen visual half: the real
// school photo (public/images/school.jpg) under the brand gradient as a
// color overlay, so the text/icons on top stay legible regardless of the
// photo's own contrast.
export default function LoginLeftPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between lg:w-[55%] h-full p-10 overflow-hidden text-white">
      <Image src="/images/school.jpg" alt="" fill priority className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-br from-violet-800/90 via-indigo-700/85 to-blue-700/80" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-10">
          <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white shrink-0">
            <FaGraduationCap className="w-7 h-7 text-indigo-700" />
          </span>
          <div>
            <p className="text-2xl font-extrabold leading-tight">SchoolApp 360</p>
            <p className="text-sm text-indigo-100 leading-tight">Smart School Management</p>
          </div>
        </div>

        <div className="w-16 h-1 rounded-full bg-white/40 mb-8" />

        <h2 className="text-6xl font-extrabold leading-[1.05] mb-6">
          Simplify.
          <br />
          Manage.
          <br />
          <span className="text-indigo-200">Succeed.</span>
        </h2>
        <p className="text-lg text-indigo-100 max-w-md leading-relaxed">
          A modern platform to manage your school operations, people and communication — all in one place.
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-6">
        {FEATURES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-3 text-center">
            <span className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10">
              <Icon className="w-7 h-7" />
            </span>
            <p className="text-sm font-medium text-indigo-100 max-w-[100px]">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
