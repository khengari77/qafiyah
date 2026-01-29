import { Loader2 } from 'lucide-react';
import { responsiveIconSize } from '@/constants/GLOBALS';

export default function Loading() {
  return (
    <div className="flex-1 h-full flex items-center justify-center">
      <Loader2 className={`${responsiveIconSize} text-zinc-600 animate-spin`} />
    </div>
  );
}
