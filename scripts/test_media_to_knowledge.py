#!/usr/bin/env python3
"""Regression tests for user-provided image/video -> private reviewed knowledge."""
import argparse
import contextlib
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import media_to_knowledge as m


def make_args(path, output, mode="image", ocr=False):
    return argparse.Namespace(
        mode=mode, input=path, output_root=output, platform="user_supplied",
        source_url="https://example.org/official?id=4&access_token=PRIVATE",
        source_label="SYNTHETIC OWNED DEMO, NOT A REAL EXAM",
        rights_status="user_owned", every_seconds=2.0, max_frames=5,
        ocr=ocr, ocr_backend="ollama", endpoint=m.OLLAMA_LOCAL_ENDPOINT,
        model="qwen3-vl:8b", timeout=15, max_ocr=5)


def draw_fixture(path, content):
    im = Image.new("RGB", (640, 360), "white")
    painter = ImageDraw.Draw(im)
    painter.text((40, 40), content, fill="black")
    im.save(path)


class MediaToKnowledgeTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory(prefix="socthink-ocr-test-")
        self.addCleanup(self.dir.cleanup)
        self.root = Path(self.dir.name)
        self.dest = self.root / "private_assets"
        self.png = self.root / "sample.png"
        draw_fixture(self.png, "EXAM A 2026 1 + 2 = ?")

    def capture_run(self, args):
        with contextlib.redirect_stdout(io.StringIO()) as buf:
            m.run(args)
        return json.loads(buf.getvalue().strip().splitlines()[-1])

    def test_source_query_redaction(self):
        actual=m.source_url("https://example.org/exam?year=2026&token=SUPERSECRET&session=PRIVATE&view=1")
        self.assertNotIn("SUPERSECRET",actual)
        self.assertNotIn("PRIVATE",actual)
        self.assertIn("year=2026",actual)
        self.assertIn("view=1",actual)
        with self.assertRaises(ValueError):
            m.source_url("ftp://example.org/file.pdf")

    def test_conservative_visual_dedup(self):
        first=Image.open(self.png).convert("RGB")
        second=first.copy()
        self.assertTrue(m.similar_visual(first,second))
        second.putpixel((200,200),(254,254,254))
        self.assertFalse(m.similar_visual(first,second))

    def test_bounded_video_times(self):
        self.assertEqual(m.choose_video_times(10, 2, 10),[0.,2.,4.,6.,8.])
        with self.assertRaises(ValueError):
            m.choose_video_times(60, 0.01, 10)
        with self.assertRaises(ValueError):
            m.choose_video_times(10, 2, 1000)

    def test_image_original_hash_and_private_derivative(self):
        oldsha=m.sha256_file(self.png)
        output=self.capture_run(make_args(self.png,self.dest))
        self.assertEqual(output["sampleCount"],1)
        self.assertEqual(output["ocrSucceeded"],0)
        self.assertEqual(output["ocrPending"],1)
        self.assertFalse(output["commercialRedistributionAllowed"])
        asset=Path(output["assetPath"])
        manifest=json.loads((asset/"manifest.json").read_text())
        self.assertEqual(manifest["originalFiles"][0]["sha256"],oldsha)
        self.assertNotIn("PRIVATE",manifest["sourceUrl"])
        self.assertEqual(m.sha256_file(self.png),oldsha)
        self.assertTrue((asset/"original"/("001_"+self.png.name)).is_file())

    def test_images_exact_duplicate_only(self):
        folder=self.root/"images"
        folder.mkdir()
        shutil.copyfile(self.png,folder/"a.png")
        shutil.copyfile(self.png,folder/"b.png")
        draw_fixture(folder/"c.png","EXAM B 2026 - different question")
        out=self.capture_run(make_args(folder,self.dest))
        man=json.loads((Path(out["assetPath"])/"manifest.json").read_text())
        self.assertEqual(out["sampleCount"],3)
        self.assertEqual(out["distinctScreens"],2)
        self.assertIsNotNone(man["items"][1]["duplicateOf"])
        self.assertIsNone(man["items"][2]["duplicateOf"])

    def test_mock_ocr_and_idempotent_rerun(self):
        args=make_args(self.png,self.dest,ocr=True)
        with patch.object(m,"ollama_ocr",return_value="第1题：1+2=？") as model:
            out=self.capture_run(args)
            model.assert_called_once()
        self.assertEqual(out["ocrSucceeded"],1)
        path=Path(out["assetPath"])
        self.assertIn("第1题", (path/"review-draft.md").read_text())
        with patch.object(m,"ollama_ocr",side_effect=RuntimeError("should not re-run")) as model:
            out2=self.capture_run(args)
            model.assert_not_called()
        self.assertEqual(out2["ocrSucceeded"],1)


    def test_rapidocr_isolation_and_cached_rerun(self):
        args=make_args(self.png,self.dest,ocr=True)
        args.ocr_backend="rapidocr"
        args.rapidocr_python=Path(sys.executable)
        args.confidence_threshold=0.86
        diag={"lineCount":1,"minConfidence":0.80,"meanConfidence":0.80,
              "enginePackageVersion":"3.10.0","lineScores":[0.8],"lineBoxes":[]}
        with patch.object(m,"rapidocr_ocr",return_value=("1. 测试：1+2=3",diag)) as model:
            out=self.capture_run(args)
            model.assert_called_once()
        self.assertEqual(out["ocrSucceeded"],1)
        self.assertIn("/rapidocr/",out["assetPath"])
        man=json.loads((Path(out["assetPath"])/"manifest.json").read_text())
        self.assertTrue(man["items"][0]["needsLowConfidenceReview"])
        self.assertEqual(man["candidateQuestionCount"],1)
        with patch.object(m,"rapidocr_ocr",side_effect=RuntimeError("must not rerun")) as model:
            out2=self.capture_run(args)
            model.assert_not_called()
        self.assertEqual(out2["ocrSucceeded"],1)
        args.ocr_backend="ollama"
        with patch.object(m,"ollama_ocr",return_value="1. 测试：1+2=3") as model:
            v=self.capture_run(args)
            model.assert_called_once()
        self.assertNotEqual(out["assetPath"],v["assetPath"])

    def test_duplicate_question_text_keeps_both_evidence_frames(self):
        folder=self.root/"images2"
        folder.mkdir()
        draw_fixture(folder/"first.png","1. 18x7=126")
        image=Image.open(folder/"first.png").convert("RGB")
        image.putpixel((200,220),(254,254,254))
        image.save(folder/"second.png")
        args=make_args(folder,self.dest,ocr=True)
        args.ocr_backend="rapidocr"
        args.rapidocr_python=Path(sys.executable)
        args.confidence_threshold=0.86
        d={"lineCount":1,"minConfidence":0.99,"meanConfidence":0.99,
           "enginePackageVersion":"3.10","lineScores":[0.99],"lineBoxes":[]}
        with patch.object(m,"rapidocr_ocr",return_value=("1. 18x7=126",d)) as model:
            res=self.capture_run(args)
            self.assertEqual(model.call_count,2)
        asset=Path(res["assetPath"])
        questions=json.loads((asset/"question-candidates.json").read_text())["questions"]
        self.assertEqual(res["candidateQuestions"],2)
        self.assertEqual(res["possibleDuplicateQuestions"],1)
        self.assertNotEqual(questions[0]["sourceEvidenceSha256"],questions[1]["sourceEvidenceSha256"])
        self.assertEqual(questions[1]["possibleDuplicateOf"],questions[0]["id"])

    def test_rapidocr_isolated_venv_launcher_symlink(self):
        # Check subprocess adapter preserves the venv launcher, not its base Python.
        script=Path(__file__).with_name("rapidocr_infer.py")
        self.assertTrue(script.is_file())
        wrapper=self.root/"venv-python"
        wrapper.symlink_to(sys.executable)
        lines={"schemaVersion":1,"engine":"rapidocr","packageVersion":"3.10.0",
               "lines":["1. 测试"],"scores":[0.98],"boxes":[]}
        process=subprocess.CompletedProcess(args=[],returncode=0,stdout="OCR_RESULT_JSON="+json.dumps(lines),stderr="")
        with patch.object(m.subprocess,"run",return_value=process) as model:
            text,diag=m.rapidocr_ocr(self.png,wrapper,30)
            self.assertEqual(text,"1. 测试")
            self.assertEqual(diag["lineCount"],1)
            self.assertEqual(model.call_args.args[0][0],str(wrapper))

    @unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "ffmpeg not installed")
    def test_video_keyframes_and_evidence_timestamps(self):
        video=self.root/"demo.mp4"
        subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-nostdin",
            "-f","lavfi","-i","color=c=white:s=640x360:r=2:d=6",
            "-vf","drawbox=x=200:y=100:w=100:h=60:color=black:t=fill:enable=gte(t\\,3)",
            "-c:v","libx264","-pix_fmt","yuv420p","-y",str(video)],
            check=True,timeout=35)
        args=make_args(video,self.dest,mode="video")
        out=self.capture_run(args)
        self.assertEqual(out["sampleCount"],3)
        self.assertEqual(out["distinctScreens"],2)
        asset=Path(out["assetPath"])
        manifest=json.loads((asset/"manifest.json").read_text())
        self.assertEqual([i["timeSeconds"] for i in manifest["items"]],[0.,2.,4.])
        self.assertTrue(all((asset/"evidence"/i["file"]).is_file() for i in manifest["items"]))
        self.assertTrue((asset/"original"/("001_"+video.name)).is_file())


if __name__ == "__main__":
    unittest.main(verbosity=2)
