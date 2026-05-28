param(
    [string]$ApiKey = $env:DASHSCOPE_API_KEY,
    [string]$Model = "qwen3.6-plus",
    [string]$Prompt = "Say hello in one word"
)

if (-not $ApiKey) {
    Write-Error "No API key. Set `$env:DASHSCOPE_API_KEY or pass -ApiKey"
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $ApiKey"
    "Content-Type" = "application/json"
}

$body = @{
    model = $Model
    messages = @(@{ role = "user"; content = $Prompt })
    temperature = 0.7
    max_tokens = 50
} | ConvertTo-Json -Depth 5

Write-Host "Testing Qwen API..."
$resp = Invoke-RestMethod -Uri "https://coding-intl.dashscope.aliyuncs.com/v1/chat/completions" `
    -Method Post -Headers $headers -Body $body -TimeoutSec 30

$resp.choices[0].message.content
