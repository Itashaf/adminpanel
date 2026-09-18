import {
  FiBookOpen,
  FiHash,
  FiZap,
  FiGlobe,
  FiMessageCircle,
  FiSun,
  FiMonitor,
  FiDroplet,
  FiHeart,
  FiTrendingUp,
  FiDollarSign,
  FiBriefcase,
  FiImage,
  FiActivity,
  FiMusic,
  FiBook,
} from 'react-icons/fi';

// One tinted square icon + badge color per subject — same subject always
// reads the same color/icon across the Homework list, so a class teacher can
// scan by color instead of reading every label.
const SUBJECT_STYLES = {
  English: { badge: 'red', bg: 'bg-red-50', text: 'text-red-600', icon: FiBookOpen },
  Mathematics: { badge: 'green', bg: 'bg-green-50', text: 'text-green-600', icon: FiHash },
  Science: { badge: 'blue', bg: 'bg-blue-50', text: 'text-blue-600', icon: FiZap },
  'Social Science': { badge: 'purple', bg: 'bg-purple-50', text: 'text-purple-600', icon: FiGlobe },
  Hindi: { badge: 'orange', bg: 'bg-orange-50', text: 'text-orange-600', icon: FiMessageCircle },
  EVS: { badge: 'amber', bg: 'bg-amber-50', text: 'text-amber-600', icon: FiSun },
  'Computer Science': { badge: 'orange', bg: 'bg-orange-50', text: 'text-orange-600', icon: FiMonitor },
  'Computer Applications': { badge: 'orange', bg: 'bg-orange-50', text: 'text-orange-600', icon: FiMonitor },
  Physics: { badge: 'blue', bg: 'bg-blue-50', text: 'text-blue-600', icon: FiZap },
  Chemistry: { badge: 'cyan', bg: 'bg-cyan-50', text: 'text-cyan-600', icon: FiDroplet },
  Biology: { badge: 'pink', bg: 'bg-pink-50', text: 'text-pink-600', icon: FiHeart },
  Economics: { badge: 'teal', bg: 'bg-teal-50', text: 'text-teal-600', icon: FiTrendingUp },
  Accountancy: { badge: 'green', bg: 'bg-green-50', text: 'text-green-600', icon: FiDollarSign },
  'Business Studies': { badge: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-600', icon: FiBriefcase },
  'Art & Craft': { badge: 'violet', bg: 'bg-violet-50', text: 'text-violet-600', icon: FiImage },
  'Physical Education': { badge: 'red', bg: 'bg-red-50', text: 'text-red-600', icon: FiActivity },
  Music: { badge: 'purple', bg: 'bg-purple-50', text: 'text-purple-600', icon: FiMusic },
};

const DEFAULT_STYLE = { badge: 'gray', bg: 'bg-gray-100', text: 'text-gray-600', icon: FiBook };

export function getSubjectStyle(subject) {
  return SUBJECT_STYLES[subject] || DEFAULT_STYLE;
}
