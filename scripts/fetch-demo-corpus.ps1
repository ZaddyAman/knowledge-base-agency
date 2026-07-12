$ErrorActionPreference = "Stop"

$commit = "61f1bb241d1289b85a5fc30fcd3cc45c05e44aec"
$root = Split-Path -Parent $PSScriptRoot
$corpusRoot = Join-Path $root "data\posthog-demo\sources"
$baseUrl = "https://raw.githubusercontent.com/PostHog/posthog.com/$commit/contents/handbook"

$sources = @(
    "people/spending-money.md",
    "people/benefits.md",
    "people/time-off.md",
    "people/onboarding.md",
    "people/side-gigs.md",
    "company/communication.md",
    "getting-started/meetings.md",
    "company/offsites.md",
    "company/security.md",
    "support/customer-support.md",
    "support/support-incident-response.md",
    "people/finance.md"
)

foreach ($source in $sources) {
    $destination = Join-Path $corpusRoot $source
    $destinationDirectory = Split-Path -Parent $destination
    New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
    Invoke-WebRequest -Uri "$baseUrl/$source" -OutFile $destination
}

$licenseUrl = "https://raw.githubusercontent.com/PostHog/posthog.com/$commit/LICENSE"
$licensePath = Join-Path (Split-Path -Parent $corpusRoot) "SOURCE-LICENSE.txt"
Invoke-WebRequest -Uri $licenseUrl -OutFile $licensePath

$manifest = foreach ($source in $sources) {
    $path = Join-Path $corpusRoot $source
    [ordered]@{
        path = $source.Replace("\", "/")
        sourceUrl = "$baseUrl/$source"
        sourceVersion = $commit
        sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
        bytes = (Get-Item -LiteralPath $path).Length
    }
}

$manifestDocument = [ordered]@{
    name = "PostHog public handbook - demo snapshot"
    sourceRepository = "https://github.com/PostHog/posthog.com"
    sourceVersion = $commit
    license = "MIT for /contents; see SOURCE-LICENSE.txt"
    sources = $manifest
}

$manifestPath = Join-Path (Split-Path -Parent $corpusRoot) "manifest.json"
$manifestDocument | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 $manifestPath

Write-Host "Fetched $($sources.Count) sources to $corpusRoot"
Write-Host "Manifest: $manifestPath"
