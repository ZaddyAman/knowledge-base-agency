$ErrorActionPreference = "Stop"

$prompt = @"
Use qmd to find the Reporting phishing section in posthog-demo.
Return only the qmd source path, exact line range, and exact instruction.
Do not use web search or prior knowledge.
"@

& wsl.exe /root/.local/bin/hermes -z $prompt --skills qmd
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
