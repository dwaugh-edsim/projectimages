$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open("C:\Antigravity\simroom\Github Repos\projectimages\HTMLs\HFXmarket\HFXStockII.xlsx")
$sheet = $wb.Sheets.Item(1)
$csvPath = "C:\Antigravity\simroom\Github Repos\projectimages\HTMLs\HFXmarket\HFXStockII.csv"
$sheet.SaveAs($csvPath, 6) # 6 is the enum for CSV
$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
