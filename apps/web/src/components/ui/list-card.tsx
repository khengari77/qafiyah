import { cn } from '@/lib/utils';

type ListCardProps = {
  readonly name: string;
  readonly title: string;
  readonly href: string;
  readonly className?: string;
};

export function ListCard({ name, title, href, className = '' }: ListCardProps) {
  return (
    <a
      href={href}
      className={cn(
        'group flex flex-col items-start justify-start xs:gap-4 xxs:gap-2 rounded-md border border-zinc-300/50 bg-zinc-100/50 p-4 xs:p-6 hover:cursor-pointer hover:border-zinc-300/80 sm:p-8 md:p-10',
        className
      )}
    >
      <h4>
        <p className="text-wrap text-sm text-zinc-800 xs:text-2xl xxs:text-base duration-300 hover:text-zinc-500 hover:underline group-hover:text-zinc-500 group-hover:underline group-hover:underline-offset-auto sm:text-2xl lg:text-2xl 2xl:text-2xl">
          {name.replace(/"/g, '')}
        </p>
      </h4>
      <p className="text-wrap text-xs text-zinc-600/80 xs:text-lg duration-300 group-hover:text-zinc-500 sm:text-xl lg:text-lg">
        {title}
      </p>
    </a>
  );
}
