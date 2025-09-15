# mitm_script.py
# A mitmproxy addon that prints JSON lines for each client request:
# Usage: mitmdump -s /path/to/mitm_script.py --listen-port 8081

from mitmproxy import http
import json
import sys
import time

def _safe(obj):
    try:
        json.dumps(obj)
        return obj
    except Exception:
        return str(obj)

class JSONLogger:
    def request(self, flow: http.HTTPFlow):
        try:
            req = flow.request
            info = {
                "ts": int(time.time() * 1000),
                "method": req.method,
                "url": req.pretty_url,
                "host": req.host,
                "path": req.path,
                "headers": dict(req.headers),
                "content_type": req.headers.get("content-type", ""),
                "body": req.get_text(strict=False)  # could be large
            }
            # print compact JSON line
            print(json.dumps(info, ensure_ascii=False))
            sys.stdout.flush()
        except Exception as e:
            # if anything goes wrong, print the error (so main process sees it)
            print(json.dumps({"ts": int(time.time()*1000), "error": str(e)}))
            sys.stdout.flush()

addons = [
    JSONLogger()
]
