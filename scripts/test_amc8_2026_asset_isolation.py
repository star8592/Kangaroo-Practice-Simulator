#!/usr/bin/env python3
"""No MAA materials: synthetic boundary test for private 2026 source images."""
from __future__ import annotations

import tempfile
from pathlib import Path

from amc8_2026_editing import LEGACY_PUBLIC_CROP_DIR, PRIVATE_CROP_DIR, private_crop_directory


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="amc8-private-isolation-") as d:
        root = Path(d)
        (root / "private").mkdir()
        expected = root / PRIVATE_CROP_DIR
        expected.mkdir(parents=True)
        assert private_crop_directory(root) == expected.resolve()
        public = root / LEGACY_PUBLIC_CROP_DIR
        public.mkdir(parents=True)
        assert private_crop_directory(root) == expected.resolve()
        (public / "q01.png").write_bytes(b"synthetic-no-original-content")
        try:
            private_crop_directory(root)
        except RuntimeError as e:
            assert "COPYRIGHTED_SOURCE_IMAGES_INSIDE_PUBLIC_TREE" in str(e)
        else:
            raise AssertionError("PUBLIC_SOURCE_IMAGE_NOT_BLOCKED")
        (public / "q01.png").unlink()
        expected.rmdir()
        (root / "private").rmdir()
        (root / "private").symlink_to(root / "public", target_is_directory=True)
        try:
            private_crop_directory(root)
        except RuntimeError as e:
            assert "PRIVATE_ASSET_ROOT_ESCAPED" in str(e)
        else:
            raise AssertionError("SYMLINK_TO_PUBLIC_NOT_BLOCKED")
    print("AMC8_R18_PRIVATE_ASSET_ISOLATION=PASS synthetic-only")


if __name__ == "__main__":
    main()
