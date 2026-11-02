#!/usr/bin/env python3
"""Receive only the hex-encoded, synthetic TASK-00 SQLCipher probe over loopback."""

from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path


OUTPUT = Path("/tmp/task00-sqlcipher-independent.sqlite")


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/encrypted-test-db":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        try:
            payload = self.rfile.read(length).decode("ascii")
            data = bytes.fromhex(payload)
        except (UnicodeDecodeError, ValueError):
            self.send_error(400, "expected hexadecimal bytes")
            return

        OUTPUT.write_bytes(data)
        response = f"stored {len(data)} bytes at {OUTPUT}".encode()
        self.send_response(200)
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def log_message(self, *_args):
        pass


if __name__ == "__main__":
    print(f"Loopback receiver on 127.0.0.1:8099; output: {OUTPUT}")
    HTTPServer(("127.0.0.1", 8099), Handler).serve_forever()
