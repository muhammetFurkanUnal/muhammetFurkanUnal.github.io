#!/usr/bin/env python3
import os
import http.server
import socketserver
import webbrowser
from pathlib import Path

# Parent klasöre git (repo root'u)
parent_dir = Path(__file__).parent.parent
os.chdir(parent_dir)

PORT = 8000

Handler = http.server.SimpleHTTPRequestHandler

class MyHTTPServer(socketserver.TCPServer):
    allow_reuse_address = True

with MyHTTPServer(("", PORT), Handler) as httpd:
    url = f"http://localhost:{PORT}/mektup/"
    print(f"Sunucu çalışıyor: {url}")
    print("Ctrl+C tuşlarıyla durdur...")
    webbrowser.open(url)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nSunucu durduruldu.")
