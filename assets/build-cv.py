#!/usr/bin/env python3
"""
build-cv.py — CV PDF'ini haritada gösterilen PNG'ye dönüştürür.

NEDEN:
    Site assets/cv.png dosyasını gösterir; tıklanınca assets/cv.pdf açılır.
    PDF güncellendiğinde PNG eski kalmasın diye bu script PNG'yi yeniler.

KULLANIM:
    1) Yeni CV'yi assets/cv.pdf üzerine yaz (aynı dosya adı kalsın).
    2) Repo kökünden çalıştır:

        python3 assets/build-cv.py

    3) İstersen sayfayı yenile — yeni CV haritada görünür.

GEREKSİNİM:
    macOS — yerleşik `sips` komutu (ekstra kurulum yok).
"""
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PDF = ROOT / "assets" / "cv.pdf"
PNG = ROOT / "assets" / "cv.png"
MAX_SIZE = 2000  # uzun kenar piksel — zoom'da net kalsın

if not PDF.exists():
    sys.exit(f"PDF bulunamadı: {PDF}")

subprocess.run(
    ["sips", "-s", "format", "png", "-Z", str(MAX_SIZE), str(PDF), "--out", str(PNG)],
    check=True,
    stdout=subprocess.DEVNULL,
)
print(f"OK · {PNG.relative_to(ROOT)} güncellendi.")
