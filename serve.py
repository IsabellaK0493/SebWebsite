#!/usr/bin/env python3
"""Local preview server for the SebWebsite sites.

Plain `python3 -m http.server` sends no Cache-Control header, so browsers
hold on to old HTML and CSS and keep showing a stale version of the site
after edits. This serves the same files with caching switched off, so a
normal refresh always shows what is actually on disk.

    python3 serve.py            # http://localhost:8123
    python3 serve.py 9000       # a different port
"""
import sys, os, functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        if not args or '200' not in str(args):
            super().log_message(fmt, *args)


if __name__ == '__main__':
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    with ThreadingHTTPServer(('127.0.0.1', PORT), handler) as srv:
        print(f'serving {ROOT} at http://localhost:{PORT}  (caching disabled)')
        srv.serve_forever()
