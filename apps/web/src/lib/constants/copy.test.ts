import { describe, expect, it } from 'vitest';

import { formatPoemCopySignature, formatPoemShareBody } from './copy';

describe('formatPoemCopySignature', () => {
  it('puts the poet, site and canonical URL on one attribution line', () => {
    expect(formatPoemCopySignature('امرؤ القيس', 'https://qafiyah.com/poems/rHUD')).toBe(
      'امرؤ القيس | قافية: https://qafiyah.com/poems/rHUD'
    );
  });
});

describe('formatPoemShareBody', () => {
  it('shares the first verse, then the poet after a blank line', () => {
    expect(
      formatPoemShareBody(
        [
          ['أَيَا رَاكِبًا إِمَّا عَرَضْتَ فَبَلِّغَنْ', 'مُغَلْغَلَةً قَوْلَ امْرِئٍ نَاخِلِ الصَّدْرِ'],
          ['فَوَ اللهِ مَا فَارَقْتُكُمْ عَنْ كُشَاحَةٍ', 'وَلَا طِيْبِ نَفْسٍ عَنْكُمُ آخِرَ الدَّهْرِ'],
        ],
        'طرفة الجذيمي العبسي'
      )
    ).toBe('أَيَا رَاكِبًا إِمَّا عَرَضْتَ فَبَلِّغَنْ\nمُغَلْغَلَةً قَوْلَ امْرِئٍ نَاخِلِ الصَّدْرِ\n\nطرفة الجذيمي العبسي');
  });

  it('shares the poet alone when the poem has no verse', () => {
    expect(formatPoemShareBody([], 'طرفة الجذيمي العبسي')).toBe('طرفة الجذيمي العبسي');
  });
});
