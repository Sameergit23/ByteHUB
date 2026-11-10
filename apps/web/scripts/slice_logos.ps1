Add-Type -AssemblyName System.Drawing

$src = "C:\Users\Saim\.gemini\antigravity\brain\f7c3b647-2fd7-43b2-96af-2036e5354eb5\.user_uploaded\media_1794251105430_d893e8d4.png"
$bmp = New-Object System.Drawing.Bitmap($src)

$destDir = "M:\Desktop\ByteHUB final\apps\web\public\brand"
if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

function Get-BoundingBox($bitmap, $minX, $minY, $maxX, $maxY, $bgR, $bgG, $bgB, $threshold) {
    $left = $maxX; $right = $minX; $top = $maxY; $bottom = $minY
    for ($y = $minY; $y -le $maxY; $y++) {
        for ($x = $minX; $x -le $maxX; $x++) {
            $pixel = $bitmap.GetPixel($x, $y)
            $diff = [Math]::Abs($pixel.R - $bgR) + [Math]::Abs($pixel.G - $bgG) + [Math]::Abs($pixel.B - $bgB)
            if ($diff -gt $threshold) {
                if ($x -lt $left) { $left = $x }
                if ($x -gt $right) { $right = $x }
                if ($y -lt $top) { $top = $y }
                if ($y -gt $bottom) { $bottom = $y }
            }
        }
    }
    return @{ Left = $left; Top = $top; Right = $right; Bottom = $bottom; Width = ($right - $left + 1); Height = ($bottom - $top + 1) }
}

# 1. Top Section (Light logo)
# Background is off-white/light blue (~246, 248, 252)
$bgLight = $bmp.GetPixel(10, 10)
Write-Host "Light BG: $($bgLight.R), $($bgLight.G), $($bgLight.B)"
$boxLight = Get-BoundingBox $bmp 20 20 1000 400 $bgLight.R $bgLight.G $bgLight.B 30
Write-Host "Light Logo box: Left=$($boxLight.Left), Top=$($boxLight.Top), W=$($boxLight.Width), H=$($boxLight.Height)"

# Add 20px padding
$pad = 20
$rectLight = New-Object System.Drawing.Rectangle(
    [Math]::Max(0, $boxLight.Left - $pad),
    [Math]::Max(0, $boxLight.Top - $pad),
    [Math]::Min($bmp.Width - $boxLight.Left + $pad, $boxLight.Width + $pad * 2),
    [Math]::Min(420 - $boxLight.Top + $pad, $boxLight.Height + $pad * 2)
)
$cropLight = $bmp.Clone($rectLight, $bmp.PixelFormat)
$cropLight.Save("$destDir\logo-light.png", [System.Drawing.Imaging.ImageFormat]::Png)
$cropLight.Dispose()

# 2. Bottom-Left Section (Dark logo)
# Background is dark navy (~11, 24, 48)
$bgDark = $bmp.GetPixel(20, 500)
Write-Host "Dark BG: $($bgDark.R), $($bgDark.G), $($bgDark.B)"
$boxDark = Get-BoundingBox $bmp 10 430 500 645 $bgDark.R $bgDark.G $bgDark.B 30
Write-Host "Dark Logo box: Left=$($boxDark.Left), Top=$($boxDark.Top), W=$($boxDark.Width), H=$($boxDark.Height)"

$rectDark = New-Object System.Drawing.Rectangle(
    [Math]::Max(0, $boxDark.Left - $pad),
    [Math]::Max(425, $boxDark.Top - $pad),
    [Math]::Min(510 - $boxDark.Left + $pad, $boxDark.Width + $pad * 2),
    [Math]::Min(655 - $boxDark.Top + $pad, $boxDark.Height + $pad * 2)
)
$cropDark = $bmp.Clone($rectDark, $bmp.PixelFormat)
$cropDark.Save("$destDir\logo-dark.png", [System.Drawing.Imaging.ImageFormat]::Png)
$cropDark.Dispose()

# 3. Squircle App Icon (in bottom right: x from 520 to 760, y from 430 to 650)
# Look for the squircle container
$bgRight = $bmp.GetPixel(530, 440)
$boxIcon = Get-BoundingBox $bmp 530 430 760 645 $bgRight.R $bgRight.G $bgRight.B 30
Write-Host "App Icon box: Left=$($boxIcon.Left), Top=$($boxIcon.Top), W=$($boxIcon.Width), H=$($boxIcon.Height)"

$rectIcon = New-Object System.Drawing.Rectangle(
    $boxIcon.Left,
    $boxIcon.Top,
    $boxIcon.Width,
    $boxIcon.Height
)
$cropIcon = $bmp.Clone($rectIcon, $bmp.PixelFormat)
$cropIcon.Save("$destDir\app-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$cropIcon.Dispose()

# 4. Small standalone symbol (x from 770 to 950, y from 430 to 650)
$boxSymbol = Get-BoundingBox $bmp 770 430 950 645 $bgRight.R $bgRight.G $bgRight.B 30
Write-Host "Symbol box: Left=$($boxSymbol.Left), Top=$($boxSymbol.Top), W=$($boxSymbol.Width), H=$($boxSymbol.Height)"

# Add 8px padding
$rectSymbol = New-Object System.Drawing.Rectangle(
    [Math]::Max(0, $boxSymbol.Left - 8),
    [Math]::Max(0, $boxSymbol.Top - 8),
    ($boxSymbol.Width + 16),
    ($boxSymbol.Height + 16)
)
$cropSymbol = $bmp.Clone($rectSymbol, $bmp.PixelFormat)
$cropSymbol.Save("$destDir\symbol.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Also copy symbol to public/icon.png and public/favicon.png for web standard favicon
$cropSymbol.Save("M:\Desktop\ByteHUB final\apps\web\public\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$cropSymbol.Save("M:\Desktop\ByteHUB final\apps\web\public\favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$cropSymbol.Dispose()

$bmp.Dispose()
Write-Host "Done! All 3 logo formats cropped and exported to apps/web/public/brand and favicon."
