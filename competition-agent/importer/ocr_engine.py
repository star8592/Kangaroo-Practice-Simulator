"""OCR fallback engine for competition PDF pipeline.

Flow:
PDF image pages -> OCR text -> normalized text -> question extractor.
The implementation keeps OCR providers pluggable so PaddleOCR/Tesseract can be used locally.
"""

from pathlib import Path


class OCREngine:
    def __init__(self, provider="auto"):
        self.provider = provider

    def needs_ocr(self, extracted_text: str) -> bool:
        if not extracted_text:
            return True
        return len(extracted_text.strip()) < 100

    def extract_from_images(self, image_paths):
        results = []
        for image in image_paths:
            results.append({
                "image": str(image),
                "text": "",
                "status": "pending_ocr"
            })
        return results

    def process_pdf_images(self, pdf_path):
        return {
            "source": str(Path(pdf_path)),
            "provider": self.provider,
            "status": "ready_for_ocr"
        }
