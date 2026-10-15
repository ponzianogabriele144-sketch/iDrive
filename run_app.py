#!/usr/bin/env python3
"""
Launcher locale per iDrive.
Rileva l'indirizzo IP locale, avvia il server e apre la pagina di installazione con QR Code per iPhone.
"""

import http.server
import socketserver
import webbrowser
import socket
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

def get_local_ip():
    import subprocess
    for iface in ['en0', 'en1', 'en2', 'bridge100']:
        try:
            res = subprocess.run(['ipconfig', 'getifaddr', iface], capture_output=True, text=True, check=True)
            ip = res.stdout.strip()
            if ip and not ip.startswith('127.'):
                return ip
        except Exception:
            pass

    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def main():
    os.chdir(DIRECTORY)
    local_ip = get_local_ip()
    port = PORT

    while True:
        try:
            with socketserver.TCPServer(("", port), Handler) as httpd:
                local_url = f"http://localhost:{port}/install.html?ip={local_ip}&port={port}"
                iphone_url = f"http://{local_ip}:{port}/index.html"
                
                print("\n" + "=" * 68)
                print("  🚗 iDrive • SERVER ATTIVO PER IPHONE")
                print("=" * 68)
                print(f"  📱 INDIRIZZO PER IL TUO IPHONE (stessa rete Wi-Fi):")
                print(f"     👉 {iphone_url}\n")
                print(f"  💻 GUIDA INTERATTIVA & QR CODE (Aperta sul Mac):")
                print(f"     👉 {local_url}")
                print("=" * 68)
                print("  💡 Istruzioni rapide iPhone:")
                print("     1. Inquadra il QR Code aperto sul Mac con la Fotocamera.")
                print("     2. In Safari tocca il tasto Condividi (⎋).")
                print("     3. Tocca 'Aggiungi alla schermata Home' ➕.")
                print("=" * 68)
                print("  Premi CTRL+C per arrestare il server.\n")

                webbrowser.open(local_url)
                httpd.serve_forever()
        except OSError as e:
            if "Address already in use" in str(e):
                port += 1
            else:
                raise e

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n✓ Server arrestato correttamente.")
        sys.exit(0)
