# Deploy pwa/ len GitHub Pages (gh-pages branch)
$REPO = "https://github.com/tankfire4-dot/app-chi-tieu.git"
$TMP  = "$env:TEMP\chi-tieu-deploy"

Write-Host "Dang deploy len GitHub Pages..." -ForegroundColor Cyan

if (Test-Path $TMP) { Remove-Item $TMP -Recurse -Force }
New-Item $TMP -ItemType Directory | Out-Null

Copy-Item "$PSScriptRoot\pwa\*" $TMP -Recurse

$GIT_NAME  = git -C $PSScriptRoot config user.name
$GIT_EMAIL = git -C $PSScriptRoot config user.email

Set-Location $TMP
git init -q
git config user.name  $GIT_NAME
git config user.email $GIT_EMAIL
git remote add origin $REPO
git checkout -b gh-pages
git add -A
git commit -m "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -q
git push origin gh-pages --force -q

Set-Location $PSScriptRoot
Remove-Item $TMP -Recurse -Force

Write-Host "Deploy thanh cong!" -ForegroundColor Green
Write-Host "URL: https://tankfire4-dot.github.io/app-chi-tieu/" -ForegroundColor Yellow
