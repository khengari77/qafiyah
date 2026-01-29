import { DATABASE_DUMPS_URL, DEVELOPER_SITE_URL, GITHUB_REPO_URL } from '@/constants/GLOBALS';
import { cn } from '@/utils/conversions/cn';
import { RandomPoemButton } from './random-poem-button';

export function Footer({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        'relative w-full flex justify-between items-center py-4 text-xs xss:text-sm md:text-base xl:text-lg text-zinc-600 gap-4',
        className
      )}
    >
      <div className="flex md:gap-3 gap-[5px]">
        {[
          { label: 'البيانات', href: DATABASE_DUMPS_URL },
          { label: 'الكود', href: GITHUB_REPO_URL },
          { label: 'المطور', href: DEVELOPER_SITE_URL },
        ].map((link, index) => (
          <span key={link.href} className="contents">
            {index > 0 && <p className="opacity-65">•</p>}
            <a
              className="hover:cursor-pointer hover:underline"
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
            </a>
          </span>
        ))}
      </div>
      <RandomPoemButton />
    </footer>
  );
}
