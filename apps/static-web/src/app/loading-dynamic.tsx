import { Loader2 } from 'lucide-react';
import { responsiveIconSize } from '@/constants/GLOBALS';

export function LoadingDynamic() {
  return (
    <div className="w-full flex justify-center items-center h-full rounded-xl">
      <Loader2 className={`${responsiveIconSize} text-zinc-600 animate-spin`} />
    </div>
  );
}
