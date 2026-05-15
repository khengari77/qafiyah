---
license: mit
language:
  - ar
pretty_name: Qafiyah
size_categories:
  - 10K<n<100K
tags:
  - arabic-poetry
  - classical-arabic
  - poetry
  - arabic
  - literature
task_categories:
  - text-generation
---

# Dataset Card for Qafiyah

## Dataset Summary

Qafiyah is a comprehensive dataset of classical Arabic poetry, containing 85,342 poems and 944,844 verses from 932 poets across 10 historical eras. Each entry includes the full poem text, individual verses, and rich metadata such as poet details, era, meter, themes, and rhyme patterns.

The dataset is derived from the open-source [Qafiyah project](https://qafiyah.com), which provides a public website, REST API, and database dumps for Arabic poetry research.

## Dataset Structure

### Data Fields

| Field           | Type         | Description                                     |
| --------------- | ------------ | ----------------------------------------------- |
| `poem_id`       | int64        | Unique poem identifier                          |
| `poem_slug`     | string       | URL-friendly poem slug                          |
| `title`         | string       | Poem title                                      |
| `content`       | string       | Full poem text (raw format with `*` separators) |
| `poet_name`     | string       | Poet name                                       |
| `poet_slug`     | string       | URL-friendly poet slug                          |
| `poet_bio`      | string       | Poet biography                                  |
| `era_name`      | string       | Historical era name                             |
| `era_slug`      | string       | URL-friendly era slug                           |
| `meter_name`    | string       | Poetic meter name (بحر)                         |
| `meter_slug`    | string       | URL-friendly meter slug                         |
| `theme_name`    | string       | Primary theme name (غرض)                        |
| `theme_slug`    | string       | URL-friendly theme slug                         |
| `rhyme_pattern` | string       | Rhyme pattern (قافية)                           |
| `verses`        | list[string] | Individual verses (أبيات)                       |
| `text`          | string       | Formatted full text (verses joined by newlines) |

### Data Splits

| Split | Examples |
| ----- | -------- |
| train | 85,342   |

## Usage

```python
from datasets import load_dataset

# Load the dataset
ds = load_dataset("qafiyah/classical-arabic-poetry")

# Access a poem
poem = ds["train"][0]
print(f"Title: {poem['title']}")
print(f"Poet: {poem['poet_name']}")
print(f"Era: {poem['era_name']}")

print("\nVerses:")
for verse in poem['verses']:
    print(f"  {verse}")
```

### Filtering by Era

```python
# Get poems from the Abbasid era
abbasid_poems = ds["train"].filter(lambda x: x["era_slug"] == "abbasid")
print(f"Found {len(abbasid_poems)} Abbasid poems")
```

### Filtering by Meter

```python
# Get poems in the Tawil meter (الطويل)
tawil_poems = ds["train"].filter(lambda x: x["meter_slug"] == "tawil")
print(f"Found {len(tawil_poems)} poems in Tawil meter")
```

## Historical Eras

The dataset covers the following 10 historical periods of Arabic poetry:

1. **Pre-Islamic / Jahili (الجاهلي)**, Before 622 CE
2. **Mukhadram (المخضرم)**, Transitional era; poets who lived in both the pre-Islamic and early Islamic periods (~600–661 CE)
3. **Early Islamic (الإسلامي)**, 622–750 CE
4. **Umayyad (الأموي)**, 661–750 CE
5. **Abbasid (العباسي)**, 750–1258 CE
6. **Andalusian (الأندلسي)**, 711–1492 CE
7. **Ayyubid (الأيوبي)**, 1171–1341 CE
8. **Mamluk (المملوكي)**, 1250–1517 CE
9. **Ottoman (العثماني)**, 1517–1798 CE
10. **Late / Post-classical (المتأخر)**, 18th century onward

## Licensing Information

This dataset is released under the MIT license.

## Citation

```bibtex
@misc{qafiyah2026,
  title={Qafiyah: A Dataset of Classical Arabic Poetry},
  author={Qafiyah Contributors},
  year={2026},
  url={https://huggingface.co/datasets/qafiyah/classical-arabic-poetry}
}
```

## Additional Resources

- **Project website**: [qafiyah.com](https://qafiyah.com)
- **API**: [api.qafiyah.com](https://api.qafiyah.com)
- **Source repository**: [github.com/alwalxed/qafiyah](https://github.com/alwalxed/qafiyah)
- **Database dumps**: Available in the repository under `dumps/`
