from collections.abc import Iterable


def normalize_tag(tag: str) -> str:
    normalized_tag = tag.strip().lower()

    if normalized_tag == "":
        raise ValueError("Tag must not be blank")  # 空白だけのタグは業務ルールとして拒否する

    return normalized_tag


def normalize_tags(tags: Iterable[str] | None) -> tuple[str, ...]:
    if tags is None:
        return ()  # 未指定時はタグなしとして扱う

    normalized_tags: list[str] = []
    seen: set[str] = set()

    for tag in tags:
        normalized_tag = normalize_tag(tag)

        if normalized_tag in seen:
            continue  # 正規化後に重複したタグは 1 件に畳み込む

        seen.add(normalized_tag)
        normalized_tags.append(normalized_tag)

    return tuple(normalized_tags)
