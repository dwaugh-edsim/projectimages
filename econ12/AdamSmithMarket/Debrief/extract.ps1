$xml = Get-Content 'c:\Antigravity\simroom\Github Repos\projectimages\AdamSmithMarket\Debrief\tmp_xlsx\xl\sharedStrings.xml' -Raw
$matches = [regex]::Matches($xml, '## (.*?)\s(.*?)\s(.*?)\b\[\{(.*?)\}\]')
foreach ($m in $matches) {
    Write-Host "Name: $($m.Groups[1].Value)"
    Write-Host "JSON: [$($m.Groups[4].Value)]"
    Write-Host "-------------------"
}
