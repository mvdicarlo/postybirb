function Print-Banner {
    $banner = '
********************************************************************************************************
*    $$$$$$$\                        $$\               $$$$$$$\  $$\           $$\                     *
*    $$  __$$\                       $$ |              $$  __$$\ \__|          $$ |                    *
*    $$ |  $$ | $$$$$$\   $$$$$$$\ $$$$$$\   $$\   $$\ $$ |  $$ |$$\  $$$$$$\  $$$$$$$\                *
*    $$$$$$$  |$$  __$$\ $$  _____|\_$$  _|  $$ |  $$ |$$$$$$$\ |$$ |$$  __$$\ $$  __$$\               *
*    $$  ____/ $$ /  $$ |\$$$$$$\    $$ |    $$ |  $$ |$$  __$$\ $$ |$$ |  \__|$$ |  $$ |              *
*    $$ |      $$ |  $$ | \____$$\   $$ |$$\ $$ |  $$ |$$ |  $$ |$$ |$$ |      $$ |  $$ |              *
*    $$ |      \$$$$$$  |$$$$$$$  |  \$$$$  |\$$$$$$$ |$$$$$$$  |$$ |$$ |      $$$$$$$  |              *
*    \__|       \______/ \_______/    \____/  \____$$ |\_______/ \__|\__|      \_______/               *
*                                            $$\   $$ |                                                *
*                                            \$$$$$$  |                                                *
*                                             \______/                                                 *
*     $$$$$$\  $$\                     $$\                           $$$$$$$$\                  $$\    *
*    $$  __$$\ \__|                    \__|                          \__$$  __|                 $$ |   *
*    $$ /  \__|$$\  $$$$$$\  $$$$$$$\  $$\ $$$$$$$\   $$$$$$\           $$ | $$$$$$\   $$$$$$\  $$ |   *
*    \$$$$$$\  $$ |$$  __$$\ $$  __$$\ $$ |$$  __$$\ $$  __$$\          $$ |$$  __$$\ $$  __$$\ $$ |   *
*     \____$$\ $$ |$$ /  $$ |$$ |  $$ |$$ |$$ |  $$ |$$ /  $$ |         $$ |$$ /  $$ |$$ /  $$ |$$ |   *
*    $$\   $$ |$$ |$$ |  $$ |$$ |  $$ |$$ |$$ |  $$ |$$ |  $$ |         $$ |$$ |  $$ |$$ |  $$ |$$ |   *
*    \$$$$$$  |$$ |\$$$$$$$ |$$ |  $$ |$$ |$$ |  $$ |\$$$$$$$ |         $$ |\$$$$$$  |\$$$$$$  |$$ |   *
*     \______/ \__| \____$$ |\__|  \__|\__|\__|  \__| \____$$ |         \__| \______/  \______/ \__|   *
*                  $$\   $$ |                        $$\   $$ |                                        *
*                  \$$$$$$  |                        \$$$$$$  |                                        *
*                   \______/                          \______/                                         *
********************************************************************************************************
'
    Write-Host $banner
}

Print-Banner

# Step 1: Find the latest draft release from a repo
$repo = "mvdicarlo/postybirb"
$signingDir = "signing"
$latestDraftRelease = gh release list --repo $repo --limit '1' | Select-Object -First 1

$parts = $latestDraftRelease.split("`t")
$releaseId = "v" + $parts[0]
$isDraft = $parts[1] -eq "Draft"

Write-Host "Found release $releaseId (Draft: $isDraft)"
if (-not $isDraft) {
    Write-Host "Release is not a draft. Exiting."
    exit 1
}

# Delete the signing directory if it exists
if (Test-Path -Path $signingDir) {
    Remove-Item -Path $signingDir -Recurse -Force
}
New-Item -ItemType Directory -Path $signingDir

# Step 2: Download all the files that have .exe, or is latest.yml
$assets = gh release view $releaseId --repo $repo --json assets | ConvertFrom-Json
$assets.assets | ForEach-Object {
    if ($_.name -match "\.exe$" -or $_.name -eq "latest.yml") {
        gh release download $releaseId --repo $repo --pattern $_.name --dir $signingDir
    }
}

# Step 3: Add a stub function for me to fill out
function Sign-Files {
    param (
        [string]$filePath
    )
    Write-Host "Signing $filePath"
    & "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x86\signtool.exe" sign /tr http://timestamp.sectigo.com /td sha256 /fd sha256 /a $filePath
}

# Step 4: Upload the files back up to the draft release
Get-ChildItem -Path $signingDir -Filter *.exe | ForEach-Object {
    $filePath = $_.FullName
    Sign-Files -filePath $filePath
}

$fullSigningDirPath = Join-Path -Path (Get-Location) -ChildPath $signingDir
try {
    $latestYmlPath = Join-Path -Path $fullSigningDirPath -ChildPath "latest.yml"
    $latestYmlHash = Get-FileHash -Path $latestYmlPath -Algorithm SHA256
    node hasher.js --path $fullSigningDirPath

    $updatedYmlHash = Get-FileHash -Path $latestYmlPath -Algorithm SHA256
    if ($latestYmlHash.Hash -eq $updatedYmlHash.Hash) {
        throw "The hash of latest.yml has not changed after running the Node.js script."
    }
}
catch {
    Write-Host "An error occurred while executing the Node.js script: $_"
    return
}

Get-ChildItem -Path $signingDir | ForEach-Object {
    $filePath = $_.FullName
    Write-Host "Uploading $filePath to release $releaseId"
    gh release upload $releaseId --clobber --repo $repo $filePath
}