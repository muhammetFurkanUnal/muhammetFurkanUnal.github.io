#!/usr/bin/env python3
import http.server, socketserver, webbrowser, os

PORT = 8080
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
    print(f"http://localhost:{PORT}")
    webbrowser.open(f"http://localhost:{PORT}")
    httpd.serve_forever()
