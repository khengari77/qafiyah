import { GITHUB_REPO_URL } from '@qafiyah/constants';
import { DATABASE_DUMPS_URL, DEVELOPER_SITE_URL } from '@/constants';
import { cn } from '@/lib/utils';
import { RandomPoemButton } from './random-poem-button';

export function Footer({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        'relative flex w-full items-center justify-between gap-4 py-4 text-xs text-zinc-600 xss:text-sm md:text-base xl:text-lg',
        className
      )}
    >
      <div className="flex gap-[5px] md:gap-3">
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
