import Link from 'next/link';
import Image from 'next/image';
import { FaGraduationCap } from 'react-icons/fa';
import { FiArrowLeft, FiHome } from 'react-icons/fi';

export const metadata = {
  title: 'Page Not Found | SchoolApp 360',
};

// Root-level not-found — covers every route (dashboard/parent/super-admin
// alike) since none of them define their own. bg-gray-50 + white-card accent
// colors match the rest of the app (see DashboardShell/SuperAdminLoginForm),
// not a standalone dark page. Links go to "/" (not a hardcoded /dashboard)
// so middleware.js sends a signed-in visitor to whichever home their own
// role actually has.
export default function NotFound() {
  return (
    <div className="flex flex-1 h-full overflow-y-auto items-center justify-center bg-gray-50 px-6 py-12">
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center max-w-5xl w-full">
        <div className="order-2 lg:order-1 text-center lg:text-left">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-full px-3 py-1.5 mb-6">
            <FaGraduationCap className="w-3.5 h-3.5" />
            Oops!
          </span>

          <p className="text-7xl sm:text-8xl font-extrabold bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 bg-clip-text text-transparent leading-none mb-4">
            404
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Page not found</h1>
          <p className="text-sm sm:text-base text-gray-500 max-w-sm mx-auto lg:mx-0 mb-8">
            The page you&apos;re looking for doesn&apos;t exist, or you don&apos;t have access to it.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to SchoolApp 360
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
            >
              <FiHome className="w-4 h-4" />
              Go to Dashboard
            </Link>
          </div>
        </div>

        <div className="order-1 lg:order-2 w-full max-w-xs sm:max-w-sm lg:max-w-none mx-auto">
          <Image
            src="/images/404.webp"
            alt=""
            width={900}
            height={720}
            priority
            className="w-full h-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
}
