param(
    [Parameter(Mandatory=$true)][string]$Prompt,
    [Parameter(Mandatory=$true)][string]$OutputPath,
    [string]$ApiKey = $env:OPENROUTER_API_KEY,
    [string]$Model = "recraft-v3"
)

if (-not $ApiKey) {
    Write-Error "No API key. Set `$env:OPENROUTER_API_KEY or pass -ApiKey"
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $ApiKey"
    "Content-Type" = "application/json"
}

$body = @{
    model = $Model
    messages = @(@{ role = "user"; content = $Prompt })
} | ConvertTo-Json -Depth 10

Write-Host "Generating image with $Model..."
$resp = Invoke-RestMethod -Uri "https://openrouter.ai/api/v1/chat/completions" `
    -Method Post -Headers $headers -Body $body -TimeoutSec 120

$content = $resp.choices[0].message.content

$imageData = $content -replace '^[^\[]*', '' | ConvertFrom-Json
if ($imageData.url) {
    Write-Host "Got URL: $($imageData.url)"
    Invoke-WebRequest -Uri $imageData.url -OutFile $OutputPath -TimeoutSec 60
    Write-Host "Saved: $OutputPath"
} elseif ($imageData.b64_json) {
    $bytes = [Convert]::FromBase64String($imageData.b64_json)
    [System.IO.File]::WriteAllBytes($OutputPath, $bytes)
    Write-Host "Saved: $OutputPath"
} else {
    Write-Host "Response: $content"
}
