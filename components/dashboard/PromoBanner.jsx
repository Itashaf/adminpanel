import Link from 'next/link';
import { FiSend, FiArrowRight } from 'react-icons/fi';
import { HiOutlineLightBulb } from 'react-icons/hi2';

// Purely presentational chrome — a CTA card and a static quote, matching
// the reference design's closing row. Neither shows any school data, so
// there's nothing here that could be real or fabricated.
export default function PromoBanner() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-[24px] border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-4 min-w-0">
          <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-100 text-blue-600 shrink-0">
            <FiSend className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900">Streamline your school operations</p>
            <p className="text-sm text-gray-400">Manage students, track progress and build a brighter future.</p>
          </div>
        </div>
        <Link
          href="/dashboard/students"
          className="flex items-center justify-center gap-2 shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:opacity-90 transition"
        >
          Explore Features
          <FiArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex items-center gap-4 bg-white rounded-[24px] border border-gray-100 shadow-sm p-6">
        <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-amber-100 text-amber-600 shrink-0">
          <HiOutlineLightBulb className="w-5 h-5" />
        </span>
        <p className="text-sm text-gray-500 italic leading-snug">
          &ldquo;Education is the most powerful weapon which you can use to change the world.&rdquo;
          <span className="block not-italic text-xs text-gray-400 mt-1">— Nelson Mandela</span>
        </p>
      </div>
    </div>
  );
}
