# Atlas local live surface

The root route is the responsive Knowledge Base Agency conversation surface used by the local demo. It calls the Atlas API on port `8787`, displays validated citations for supported answers, and shows when preflight routing skips Hermes retrieval.

Run from the repository root:

```powershell
python -m http.server 4173 -d prototypes/live-surface
```

Then open `http://127.0.0.1:4173/`. `chat.html` remains an alias for the same surface.
