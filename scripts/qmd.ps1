param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$QmdArgs
)

$ErrorActionPreference = "Stop"
$wslPath = "/root/.hermes/node/bin:/root/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

& wsl.exe env "PATH=$wslPath" /root/.local/bin/qmd @QmdArgs
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
