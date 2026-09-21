import json
import sys
from functools import lru_cache
from pathlib import Path

SUPPORTED_LANGUAGES = ['es', 'en']
DEFAULT_LANGUAGE = 'es'


def _static_dir() -> Path:
    if getattr(sys, 'frozen', False):
        return Path(sys._MEIPASS) / 'static'  # type: ignore
    return Path(__file__).resolve().parent.parent / 'static'


LOCALES_DIR = _static_dir() / 'locals'


def resolve_language(lang: str | None) -> str:
    return lang if lang in SUPPORTED_LANGUAGES else DEFAULT_LANGUAGE


@lru_cache(maxsize=len(SUPPORTED_LANGUAGES))
def load_translations(lang: str) -> dict:
    lang = resolve_language(lang)
    path = LOCALES_DIR / f'{lang}.json'
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def translate(lang: str, key_path: str) -> str:
    value = load_translations(lang)
    for part in key_path.split('.'):
        if not isinstance(value, dict):
            return key_path
        value = value.get(part)
        if value is None:
            return key_path
    return value
