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

Qafiyah is a comprehensive dataset of classical Arabic poetry, containing over 84,000 poems from 900+ poets across 10 historical eras. Each entry includes the full poem text, individual verses, and rich metadata such as poet details, era, meter, themes, and rhyme patterns.

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
| train | 84,329+  |

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
print(f"\nVerses:")
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

The dataset covers these historical periods:

1. **Pre-Islamic (الجاهلي)** - Before 622 CE
2. **Early Islamic (صدر الإسلام)** - 622-661 CE
3. **Umayyad (الأموي)** - 661-750 CE
4. **Abbasid (العباسي)** - 750-1258 CE
5. **Andalusian (الأندلسي)** - 711-1492 CE
6. **Mamluk (المملوكي)** - 1250-1517 CE
7. **Ottoman (العثماني)** - 1517-1798 CE
8. **Modern (الحديث)** - 1798-present

## Licensing Information

This dataset is released under the MIT license.

## Citation

```bibtex
@misc{qafiyah2025,
  title={Qafiyah: A Dataset of Classical Arabic Poetry},
  author={Qafiyah Contributors},
  year={2025},
  url={https://huggingface.co/datasets/qafiyah/classical-arabic-poetry}
}
```

## Additional Resources

- **Project website**: [qafiyah.com](https://qafiyah.com)
- **API**: [api.qafiyah.com](https://api.qafiyah.com)
- **Source repository**: [github.com/alwalxed/qafiyah](https://github.com/alwalxed/qafiyah)
- **Database dumps**: Available in the repository under `public/datasets/`
