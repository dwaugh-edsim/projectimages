param(
    [Parameter(Mandatory=$true)][string]$Prompt,
    [Parameter(Mandatory=$true)][string]$OutputPath,
    [string]$ApiKey = $env:DASHSCOPE_API_KEY,
    [string]$Model = "flux-brief"
)

if (-not $ApiKey) {
    Write-Error "API key required. Set env var DASHSCOPE_API_KEY or pass -ApiKey"
    exit 1
}

$url = "https://dashscope.aliyuncs.com/api/v1/services/aigc Multimodal generation/text2image"
$headers = @{
    "Authorization" = "Bearer $ApiKey"
    "Content-Type" = "application/json"
}

$body = @{
    model = $Model
    input = @{ prompt = $Prompt }
    parameters = @{
        size = "1024x1024"
        steps = 25
    }
} | ConvertTo-Json -Depth 10

Write-Host "Generating image..."
$response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body -TimeoutSec 120

if ($response.output.image_data) {
    $base64 = $response.output.image_data[0].image
    [byte[]]$bytes = [Convert]::FromBase64String($base64)
    [System.IO.File]::WriteAllBytes($OutputPath, $bytes)
    Write-Host "Saved: $OutputPath"
} elseif ($response.error) {
    Write-Error "API Error: $($response.error.message)"
} else {
    Write-Error "Unexpected response: $($response | ConvertTo-Json -Depth 5)"
}
