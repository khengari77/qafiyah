import { Badge } from '@/components/ui/badge';

type Props = {
  readonly selectedErasLength: number;
  readonly selectedMetersLength: number;
  readonly selectedRhymesLength: number;
  readonly selectedThemesLength: number;
  readonly erasCount: string;
  readonly metersCount: string;
  readonly themesCount: string;
  readonly rhymesCount: string;
};

export function FilterBadges({
  selectedErasLength,
  selectedMetersLength,
  selectedRhymesLength,
  selectedThemesLength,
  erasCount,
  metersCount,
  themesCount,
  rhymesCount,
}: Props) {
  const badgeClassname = 'text-xs md:text-sm font-normal text-zinc-600 border-zinc-300/50 bg-white';
  return (
    <div tabIndex={-1} className="flex flex-wrap gap-1 justify-end">
      {selectedErasLength > 0 && (
        <Badge variant="outline" className={badgeClassname}>
          {erasCount}
        </Badge>
      )}
      {selectedMetersLength > 0 && (
        <Badge variant="outline" className={badgeClassname}>
          {metersCount}
        </Badge>
      )}
      {selectedThemesLength > 0 && (
        <Badge variant="outline" className={badgeClassname}>
          {themesCount}
        </Badge>
      )}
      {selectedRhymesLength > 0 && (
        <Badge variant="outline" className={badgeClassname}>
          {rhymesCount}
        </Badge>
      )}
    </div>
  );
}
