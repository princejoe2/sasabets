$envFile  = Join-Path $PSScriptRoot "../.env.local"
$key      = (Get-Content $envFile | Where-Object { $_ -match "^SUPABASE_SERVICE_ROLE_KEY=" }) -replace "^SUPABASE_SERVICE_ROLE_KEY=",""
if (-not $key) { throw "SUPABASE_SERVICE_ROLE_KEY not found in .env.local" }
$base     = "https://jsigphyrhgmpaydozjfa.supabase.co/rest/v1"
$authBase = "https://jsigphyrhgmpaydozjfa.supabase.co/auth/v1/admin/users"
$hdr      = @{ Authorization="Bearer $key"; apikey=$key; "Content-Type"="application/json"; Prefer="return=minimal" }
$hdrRep   = @{ Authorization="Bearer $key"; apikey=$key; "Content-Type"="application/json"; Prefer="return=representation" }
$authHdr  = @{ Authorization="Bearer $key"; apikey=$key; "Content-Type"="application/json" }
$hdrDup   = @{ Authorization="Bearer $key"; apikey=$key; "Content-Type"="application/json"; Prefer="resolution=ignore-duplicates,return=minimal" }

$wave2 = @(
    @{n="George Bwire";      p="0700200101"},
    @{n="Harriet Nabwire";   p="0701200102"},
    @{n="Isaac Muhindo";     p="0702200103"},
    @{n="Janet Akello";      p="0703200104"},
    @{n="Kevin Ssemwanga";   p="0704200105"},
    @{n="Laura Apolot";      p="0705200106"},
    @{n="Martin Ogwang";     p="0706200107"},
    @{n="Naome Namuli";      p="0707200108"},
    @{n="Peter Kateregga";   p="0708200109"},
    @{n="Queen Atuyambe";    p="0709200110"},
    @{n="Richard Baguma";    p="0700200111"},
    @{n="Susan Birungi";     p="0701200112"},
    @{n="Tom Ojambo";        p="0702200113"},
    @{n="Ursulah Kabwama";   p="0703200114"},
    @{n="Victor Serugo";     p="0704200115"}
)

Write-Host "Creating $($wave2.Count) new demo users..."
$uids = @()
foreach ($u in $wave2) {
    $phone = "+256$($u.p.Substring(1))"
    $slug  = $u.n.ToLower() -replace '\s+','.' -replace '[^a-z0-9.]',''
    $email = "demo2.$slug@sabula256.internal"
    try {
        $body = @{ email=$email; email_confirm=$true; password="DemoUser256!$($u.p)"; user_metadata=@{ full_name=$u.n; phone=$phone } } | ConvertTo-Json -Depth 5
        $resp = Invoke-RestMethod -Uri $authBase -Method POST -Headers $authHdr -Body $body
        $uid  = $resp.id
        if (-not $uid) { throw "no id" }
        $uids += $uid
        $pb = @{ full_name=$u.n; phone=$phone; username=($u.n.ToLower() -replace '\s+','_' -replace '[^a-z0-9_]',''); is_demo=$true; kyc_status="none" } | ConvertTo-Json
        Invoke-RestMethod -Uri "$base/profiles?id=eq.$uid" -Method PATCH -Headers $hdr -Body $pb | Out-Null
        Invoke-RestMethod -Uri "$base/wallets" -Method POST -Headers $hdrDup -Body (@{ user_id=$uid; balance=0; bonus_balance=0 } | ConvertTo-Json) | Out-Null
        Write-Host "  + $($u.n)"
    } catch { Write-Host "  ! $($u.n): $($_.Exception.Message)" }
}
Write-Host "Created $($uids.Count) users"
if ($uids.Count -eq 0) { Write-Host "No users created. Aborting."; exit 1 }

$targets = @{
    "172a1ac7" = @{ pool=3200000; dist=@(0.68,0.32) }
    "35213f7c" = @{ pool=3000000; dist=@(0.61,0.39) }
    "458f763b" = @{ pool=3000000; dist=@(0.45,0.55) }
    "d5525e4a" = @{ pool=2800000; dist=@(0.38,0.42,0.20) }
    "8f4117e0" = @{ pool=2500000; dist=@(0.55,0.45) }
    "851878eb" = @{ pool=2000000; dist=@(0.71,0.29) }
    "028722fb" = @{ pool=1800000; dist=@(0.63,0.37) }
    "5acbf222" = @{ pool=1500000; dist=@(0.58,0.42) }
    "18d007fa" = @{ pool=1500000; dist=@(0.72,0.28) }
    "43554639" = @{ pool=1500000; dist=@(0.54,0.46) }
    "ed7a3f67" = @{ pool=1200000; dist=@() }
    "683ae179" = @{ pool=1200000; dist=@(0.48,0.52) }
    "a7ce8a41" = @{ pool=1200000; dist=@() }
    "0efc55bd" = @{ pool=900000;  dist=@(0.67,0.33) }
    "2db0a58b" = @{ pool=900000;  dist=@(0.61,0.39) }
    "1fe5f0c7" = @{ pool=800000;  dist=@(0.74,0.26) }
    "c4af8974" = @{ pool=750000;  dist=@(0.53,0.47) }
    "f73c33ab" = @{ pool=700000;  dist=@(0.44,0.56) }
    "1908d009" = @{ pool=700000;  dist=@(0.59,0.41) }
    "b25d9321" = @{ pool=700000;  dist=@(0.41,0.59) }
    "d2c0bc27" = @{ pool=700000;  dist=@(0.38,0.62) }
    "85e89270" = @{ pool=700000;  dist=@(0.44,0.56) }
    "390a1f85" = @{ pool=700000;  dist=@(0.49,0.51) }
    "3e877f27" = @{ pool=700000;  dist=@(0.35,0.65) }
    "cff84f4b" = @{ pool=650000;  dist=@(0.66,0.34) }
    "f9fdb8e5" = @{ pool=600000;  dist=@(0.50,0.50) }
    "d82e571c" = @{ pool=580000;  dist=@(0.77,0.23) }
    "eb75e9ec" = @{ pool=550000;  dist=@(0.39,0.61) }
    "313087f8" = @{ pool=550000;  dist=@(0.46,0.54) }
    "896699aa" = @{ pool=550000;  dist=@(0.52,0.48) }
    "8f85d951" = @{ pool=520000;  dist=@(0.58,0.42) }
    "20f0823b" = @{ pool=520000;  dist=@(0.69,0.31) }
    "f263c028" = @{ pool=520000;  dist=@(0.61,0.39) }
    "6b77ebe3" = @{ pool=520000;  dist=@(0.56,0.44) }
    "0891f38e" = @{ pool=520000;  dist=@(0.72,0.28) }
    "ddfd72b5" = @{ pool=520000;  dist=@(0.64,0.36) }
    "a7906717" = @{ pool=520000;  dist=@(0.58,0.42) }
    "94483f5f" = @{ pool=520000;  dist=@(0.53,0.47) }
    "85c16b80" = @{ pool=520000;  dist=@(0.34,0.66) }
    "0292a55f" = @{ pool=520000;  dist=@() }
    "080d081c" = @{ pool=520000;  dist=@(0.55,0.45) }
    "34678c0d" = @{ pool=520000;  dist=@(0.48,0.52) }
    "0eab5def" = @{ pool=520000;  dist=@(0.44,0.56) }
    "3a673ad8" = @{ pool=520000;  dist=@(0.41,0.59) }
}

Write-Host "Fetching open markets..."
$wc = New-Object System.Net.WebClient
$wc.Headers.Add("Authorization","Bearer $key"); $wc.Headers.Add("apikey",$key)
$raw = $wc.DownloadString("$base/markets?select=id,title,total_pool,options&status=eq.open&order=closes_at.asc")
$markets = $raw | ConvertFrom-Json
Write-Host "Found $($markets.Count) markets"

$amtPool = @(10000,25000,50000,15000,75000,20000,40000,30000,60000,35000,80000,45000,100000,55000,70000)
$uIdx = 0; $totalBets = 0; $failedBets = 0; $patchedMkts = 0

foreach ($mkt in $markets) {
    $mid    = $mkt.id
    $mshort = $mid.Substring(0,8)
    $cfg    = $targets[$mshort]
    $targetPool = if ($cfg) { $cfg.pool } else { 520000 }
    $opts = @($mkt.options | Where-Object { $_ -ne $null })
    if ($opts.Count -eq 0) { Write-Host "  skip $mshort - no options"; continue }
    $distArr = if ($cfg) { $cfg.dist } else { @() }
    $dist = if ($distArr.Count -eq $opts.Count) { $distArr } else {
        $even = 1.0 / $opts.Count
        @(1..$opts.Count | ForEach-Object { $even })
    }
    $inserted = 0
    for ($i = 0; $i -lt 10; $i++) {
        $uid    = $uids[$uIdx % $uids.Count]; $uIdx++
        $optIdx = [Math]::Floor($i * $opts.Count / 10)
        $oid    = $opts[$optIdx].id
        $amt    = $amtPool[$i % $amtPool.Count]
        $minsAgo = Get-Random -Minimum 120 -Maximum 20160
        $placedAt = (Get-Date).AddMinutes(-$minsAgo).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        try {
            $b = @{ user_id=$uid; market_id=$mid; option_id=$oid; amount=$amt; status="active"; is_demo=$true; placed_at=$placedAt } | ConvertTo-Json
            Invoke-RestMethod -Uri "$base/bets" -Method POST -Headers $hdrRep -Body $b | Out-Null
            $inserted++; $totalBets++
        } catch { $failedBets++ }
    }
    $newOpts = @()
    for ($i = 0; $i -lt $opts.Count; $i++) {
        $pct = [double]$dist[$i]
        $newOpts += @{ id=$opts[$i].id; label=$opts[$i].label; total_pool=([long]([Math]::Round($targetPool * $pct))) }
    }
    $pBody = @{ total_pool=$targetPool; options=$newOpts } | ConvertTo-Json -Depth 10
    $wc2 = New-Object System.Net.WebClient
    $wc2.Headers.Add("Authorization","Bearer $key"); $wc2.Headers.Add("apikey",$key)
    $wc2.Headers.Add("Content-Type","application/json"); $wc2.Headers.Add("Prefer","return=minimal")
    try {
        $wc2.UploadString("$base/markets?id=eq.$mid","PATCH",$pBody) | Out-Null
        Write-Host ("  + {0} pool={1,9:N0} opts={2} bets={3}" -f $mshort,$targetPool,$opts.Count,$inserted)
        $patchedMkts++
    } catch { Write-Host "  ! PATCH $mshort : $($_.Exception.Message)" }
}
Write-Host ""
Write-Host "=== Done ==="
Write-Host "  New users:       $($uids.Count)"
Write-Host "  Bets inserted:   $totalBets  (failed: $failedBets)"
Write-Host "  Markets patched: $patchedMkts / $($markets.Count)"