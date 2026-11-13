"""Start the BUDDY herbal website.

    python run.py            # http://127.0.0.1:8000
    python run.py --reload   # auto reload while editing
"""

from __future__ import annotations

import sys
import webbrowser
from pathlib import Path

import uvicorn

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

# Windows consoles often default to cp1252 which cannot print the brand glyphs.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # older interpreters / redirected streams
    pass


def main() -> None:
    reload = "--reload" in sys.argv
    port = 8000
    host = "127.0.0.1"
    for arg in sys.argv:
        if arg.startswith("--port="):
            port = int(arg.split("=", 1)[1])
        elif arg.startswith("--host="):
            # --host=0.0.0.0 when running on a server or inside Docker
            host = arg.split("=", 1)[1]

    shown = "127.0.0.1" if host in ("0.0.0.0", "::") else host
    print("")
    print("  *  BUDDY herbal")
    print(f"  ->  http://{shown}:{port}")
    print(f"  ->  API docs: http://{shown}:{port}/docs")
    print("   (Ctrl+C to stop)")
    print("")

    if "--open" in sys.argv:
        webbrowser.open(f"http://{shown}:{port}")

    uvicorn.run(
        "backend.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info",
    )


if __name__ == "__main__":
    main()
