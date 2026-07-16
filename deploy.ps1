# Deploy pwa/ len GitHub Pages (gh-pages branch)
$ErrorActionPreference = "Stop"
$REPO = "https://github.com/tankfire4-dot/app-chi-tieu.git"
$TMP  = "$env:TEMP\chi-tieu-deploy"

Write-Host "Dang deploy len GitHub Pages..." -ForegroundColor Cyan

$GIT_NAME  = git -C $PSScriptRoot config user.name
$GIT_EMAIL = git -C $PSScriptRoot config user.email
if ([string]::IsNullOrWhiteSpace($GIT_NAME) -or [string]::IsNullOrWhiteSpace($GIT_EMAIL)) {
  Write-Host "LOI: chua co danh tinh git (user.name / user.email) trong repo nay." -ForegroundColor Red
  Write-Host "Chay 2 lenh sau roi deploy lai:" -ForegroundColor Yellow
  Write-Host '  git config user.name  "tankfire4-dot"'
  Write-Host '  git config user.email "288250180+tankfire4-dot@users.noreply.github.com"'
  exit 1
}

if (Test-Path $TMP) { Remove-Item $TMP -Recurse -Force }
New-Item $TMP -ItemType Directory | Out-Null
Copy-Item "$PSScriptRoot\pwa\*" $TMP -Recurse

Set-Location $TMP
try {
  git init -q
  git config user.name  $GIT_NAME
  git config user.email $GIT_EMAIL
  git remote add origin $REPO
  git checkout -b gh-pages -q
  git add -A
  git commit -m "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -q
  if ($LASTEXITCODE -ne 0) { throw "git commit that bai (khong co gi de commit?)" }
  git push origin gh-pages --force -q
  if ($LASTEXITCODE -ne 0) { throw "git push that bai (kiem dang nhap GitHub / mang)" }
} catch {
  Set-Location $PSScriptRoot
  Write-Host "DEPLOY THAT BAI: $_" -ForegroundColor Red
  if (Test-Path $TMP) { Remove-Item $TMP -Recurse -Force }
  exit 1
}

Set-Location $PSScriptRoot
Remove-Item $TMP -Recurse -Force

Write-Host "Deploy thanh cong!" -ForegroundColor Green
Write-Host "URL: https://tankfire4-dot.github.io/app-chi-tieu/" -ForegroundColor Yellow
