#!/usr/bin/env python3
"""
题库数字化流水线第一步：PDF类型检测

目标：
1. 判断PDF是否包含可提取文本
2. 区分数字PDF和扫描PDF
3. 为后续文本解析/OCR选择处理流程
"""

from pathlib import Path
import sys


def detect_pdf_type(path: str) -> dict:
    file = Path(path)
    if not file.exists():
        raise FileNotFoundError(path)

    result = {
        "file": str(file),
        "type": "unknown",
        "need_ocr": False,
    }

    try:
        import fitz  # pymupdf
        doc = fitz.open(file)
        text_length = sum(len(page.get_text("text").strip()) for page in doc)

        if text_length > 100:
            result["type"] = "digital_pdf"
            result["need_ocr"] = False
        else:
            result["type"] = "scan_pdf"
            result["need_ocr"] = True

        result["pages"] = len(doc)
        result["text_length"] = text_length

    except ImportError:
        result["type"] = "unknown"
        result["error"] = "install pymupdf"

    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: pdf_detector.py file.pdf")
        sys.exit(1)

    print(detect_pdf_type(sys.argv[1]))
