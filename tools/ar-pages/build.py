#!/usr/bin/env python3
"""Generate every AR page from template.html + pages.json.

Usage (from the repo root or anywhere):
    python3 tools/ar-pages/build.py          # write all pages
    python3 tools/ar-pages/build.py --check  # only verify; exit 1 if a page is stale or a file is missing

To change all AR pages, edit template.html and rerun. To change one page's
target, model, scale or links, edit its entry in pages.json and rerun.
"""
import html
import json
import os
import sys
from urllib.parse import urlsplit

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
REQUIRED = ["page", "name", "mind", "model", "position", "rotation", "scale", "knowMore", "back"]


def local_path(page_path, ref):
    """Resolve a relative reference from a page to a repo path, or None for external URLs."""
    parts = urlsplit(ref)
    if parts.scheme or parts.netloc:
        return None
    return os.path.normpath(os.path.join(ROOT, os.path.dirname(page_path), parts.path))


def js_string(value):
    # Values are placed inside double-quoted JS strings in the template.
    return json.dumps(value)[1:-1].replace("</", "<\\/")


def render(template, cfg):
    name = cfg["name"]
    values = {
        "NAME": html.escape(name),
        "SCAN_TEXT": html.escape(f"Scan the {name} Card"),
        "ROTATE_TEXT": html.escape(f"Rotate {name}"),
        "MIND": html.escape(cfg["mind"]),
        "MODEL": html.escape(cfg["model"]),
        "POSITION": cfg["position"],
        "ROTATION": cfg["rotation"],
        "SCALE": cfg["scale"],
        "KNOW_MORE": js_string(cfg["knowMore"]),
        "BACK": js_string(cfg["back"]),
    }
    out = template
    for key, val in values.items():
        out = out.replace("{{" + key + "}}", val)
    if "{{" in out:
        raise ValueError(f"{cfg['page']}: unreplaced placeholder left in output")
    return out


def main():
    check_only = "--check" in sys.argv
    with open(os.path.join(HERE, "template.html"), encoding="utf-8") as f:
        template = f.read()
    with open(os.path.join(HERE, "pages.json"), encoding="utf-8") as f:
        pages = json.load(f)

    problems = []
    for cfg in pages:
        missing_keys = [k for k in REQUIRED if k not in cfg]
        if missing_keys:
            problems.append(f"{cfg.get('page', '?')}: missing keys {missing_keys}")
            continue
        page = cfg["page"]
        for key in ("mind", "model", "knowMore", "back"):
            path = local_path(page, cfg[key])
            if path is not None and not os.path.isfile(path):
                problems.append(f"{page}: {key} -> {cfg[key]} does not exist")

        out = render(template, cfg)
        dest = os.path.join(ROOT, page)
        if check_only:
            current = open(dest, encoding="utf-8").read() if os.path.exists(dest) else None
            if current != out:
                problems.append(f"{page}: out of date, run build.py")
        else:
            with open(dest, "w", encoding="utf-8", newline="\n") as f:
                f.write(out)

    for p in problems:
        print("ERROR", p)
    print(f"{len(pages)} pages {'checked' if check_only else 'written'}, {len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
