# Seed demo social-proof data for Sabula 256
# Creates 28 ghost users + ~180 bets across 15 markets
# Run once: pwsh .\scripts\seed-demo-data.ps1

$envFile = Join-Path $PSScriptRoot "../.env.local"
$key     = (Get-Content $envFile | Where-Object { $_ -match "^SUPABASE_SERVICE_ROLE_KEY=" }) -replace "^SUPABASE_SERVICE_ROLE_KEY=",""
if (-not $key) { throw "SUPABASE_SERVICE_ROLE_KEY not found in .env.local" }
$base    = "https://jsigphyrhgmpaydozjfa.supabase.co/rest/v1"
$headers = @{ Authorization = "Bearer $key"; apikey = $key; "Content-Type" = "application/json"; Prefer = "return=representation" }

function Post($path, $body) {
  $json = $body | ConvertTo-Json -Depth 10
  Invoke-RestMethod -Uri "$base/$path" -Method POST -Headers $headers -Body $json
}
function Patch($path, $body) {
  $json = $body | ConvertTo-Json -Depth 10
  Invoke-RestMethod -Uri "$base/$path" -Method PATCH -Headers $headers -Body $json
}
function Get($path) {
  Invoke-RestMethod -Uri "$base/$path" -Headers $headers
}

# ─── 1. Demo users ───────────────────────────────────────────────────────────
$names = @(
  @{n="Aisha Nakato";     p="0700123001"},
  @{n="Brian Kamoga";     p="0701234002"},
  @{n="Christine Nabirye";p="0702345003"},
  @{n="David Ssemakula";  p="0703456004"},
  @{n="Esther Kyambadde"; p="0704567005"},
  @{n="Frank Mulindwa";   p="0705678006"},
  @{n="Grace Atim";       p="0706789007"},
  @{n="Henry Mwesigwa";   p="0707890008"},
  @{n="Irene Nalwanga";   p="0708901009"},
  @{n="James Okello";     p="0709012010"},
  @{n="Kirabo Ssekandi";  p="0700123011"},
  @{n="Lilian Nakawesi";  p="0701234012"},
  @{n="Moses Kizza";      p="0702345013"},
  @{n="Nadia Amuge";      p="0703456014"},
  @{n="Oscar Otim";       p="0704567015"},
  @{n="Patricia Byarugaba";p="0705678016"},
  @{n="Ronald Mugenyi";   p="0706789017"},
  @{n="Sandra Achola";    p="0707890018"},
  @{n="Timothy Nsimba";   p="0708901019"},
  @{n="Viola Tumuhairwe"; p="0709012020"},
  @{n="William Kabuuka";  p="0700123021"},
  @{n="Zainab Nakato";    p="0701234022"},
  @{n="Alex Omara";       p="0702345023"},
  @{n="Brenda Namagembe"; p="0703456024"},
  @{n="Collins Ssali";    p="0704567025"},
  @{n="Deborah Nansamba"; p="0705678026"},
  @{n="Emmanuel Katumba"; p="0706789027"},
  @{n="Faith Naluwooza";  p="0707890028"}
)

Write-Host "Creating $($names.Count) demo auth users..."
$userIds = @()
$authBase = "https://jsigphyrhgmpaydozjfa.supabase.co/auth/v1/admin/users"
$authHeaders = @{ Authorization = "Bearer $key"; apikey = $key; "Content-Type" = "application/json" }

foreach ($u in $names) {
  $phone = "+256$($u.p.Substring(1))"
  $slug  = $u.n.ToLower() -replace '\s+','.' -replace '[^a-z0-9.]',''
  $email = "demo.$slug@sabula256.internal"
  try {
    $body = @{
      email         = $email
      email_confirm = $true
      password      = "DemoUser256!$($u.p)"
      user_metadata = @{ full_name = $u.n; phone = $phone }
    } | ConvertTo-Json -Depth 5
    $resp = Invoke-RestMethod -Uri $authBase -Method POST -Headers $authHeaders -Body $body
    $uid  = $resp.id
    if (-not $uid) { throw "No ID returned" }
    $userIds += $uid

    # Update the auto-created profile with demo flags and phone
    $profBody = @{
      full_name  = $u.n
      phone      = $phone
      username   = $u.n.ToLower().Replace(" ","_") -replace '[^a-z0-9_]',''
      is_demo    = $true
      kyc_status = "none"
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/profiles?id=eq.$uid" -Method PATCH -Headers $headers -Body $profBody | Out-Null

    Write-Host "  + $($u.n) -> $uid"
  } catch {
    Write-Host "  ! Failed $($u.n): $($_.Exception.Message)"
  }
}

Write-Host "Created $($userIds.Count) demo users"

# ─── 2. Create wallets for demo users ───────────────────────────────────────
Write-Host "Creating wallets..."
$walletHeaders = @{ Authorization = "Bearer $key"; apikey = $key; "Content-Type" = "application/json"; Prefer = "resolution=ignore-duplicates" }
foreach ($uid in $userIds) {
  try {
    $body = @{ user_id = $uid; balance = 0; bonus_balance = 0 } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/wallets" -Method POST -Headers $walletHeaders -Body $body | Out-Null
  } catch { }
}

# ─── 3. Define bets per market ───────────────────────────────────────────────
# Format: @{market_id; option_id; amounts (array)}
# Spread bets so different users place them. YES-biased on popular outcomes.

$u = $userIds  # shorthand

$betPlan = @(

  # Uganda Cranes beat South Sudan (football, close Nov 17)
  @{ m="851878eb-1912-4946-be24-214b908e0964"; o="yes";  a=@(5000,10000,20000,5000,15000,8000,3000,2000,50000,10000) },
  @{ m="851878eb-1912-4946-be24-214b908e0964"; o="no";   a=@(5000,3000,10000,2000,5000) },

  # Uganda Cranes qualify AFCON 2027
  @{ m="172a1ac7-04bb-4965-81d1-d6f7d9da236a"; o="yes";  a=@(20000,10000,5000,50000,15000,8000,3000,25000,10000,5000,2000) },
  @{ m="172a1ac7-04bb-4965-81d1-d6f7d9da236a"; o="no";   a=@(5000,10000,3000,2000,8000) },

  # Bitcoin $100k
  @{ m="35213f7c-d160-4246-adae-ab8f9fcfe66f"; o="yes";  a=@(50000,20000,10000,5000,100000,30000,15000,8000,25000) },
  @{ m="35213f7c-d160-4246-adae-ab8f9fcfe66f"; o="no";   a=@(10000,5000,20000,15000,3000) },

  # USD/UGX cross 4000
  @{ m="8f4117e0-b5c7-4185-a5db-c9fc10794490"; o="yes";  a=@(10000,5000,20000,8000,15000,3000,50000,10000) },
  @{ m="8f4117e0-b5c7-4185-a5db-c9fc10794490"; o="no";   a=@(10000,5000,8000,3000,15000,20000) },

  # Besigye released
  @{ m="458f763b-0c47-41f6-b35b-3002dc285006"; o="yes";  a=@(5000,10000,20000,3000,8000,15000,5000,2000) },
  @{ m="458f763b-0c47-41f6-b35b-3002dc285006"; o="no";   a=@(20000,10000,5000,50000,15000,8000,3000) },

  # Ballon d'Or multi-candidate (mbappe, haaland, other)
  @{ m="d5525e4a-fdce-44d8-9439-309c889956da"; o="mbappe";  a=@(10000,5000,20000,8000,15000,5000,3000) },
  @{ m="d5525e4a-fdce-44d8-9439-309c889956da"; o="haaland"; a=@(15000,20000,10000,5000,8000,50000,3000) },
  @{ m="d5525e4a-fdce-44d8-9439-309c889956da"; o="other";   a=@(5000,3000,2000,10000,5000) },

  # Kampala petrol > 7000
  @{ m="c4af8974-9bb3-4025-adf2-581e2480205d"; o="yes";  a=@(5000,10000,8000,3000,15000,5000) },
  @{ m="c4af8974-9bb3-4025-adf2-581e2480205d"; o="no";   a=@(10000,20000,5000,8000,3000,15000) },

  # Museveni cabinet reshuffle
  @{ m="18d007fa-50f3-46b3-8d4b-357fd2162c2a"; o="yes";  a=@(10000,20000,5000,8000,15000,3000,10000,5000) },
  @{ m="18d007fa-50f3-46b3-8d4b-357fd2162c2a"; o="no";   a=@(5000,3000,8000,2000,10000) },

  # CECAFA Uganda win
  @{ m="028722fb-dd79-4685-aba7-b4d21a5a924b"; o="yes";  a=@(20000,10000,5000,8000,50000,15000,3000,10000,5000) },
  @{ m="028722fb-dd79-4685-aba7-b4d21a5a924b"; o="no";   a=@(5000,8000,3000,10000) },

  # Azawi Artist of Year
  @{ m="2db0a58b-6ffb-4240-811e-9530d230a50a"; o="yes";  a=@(5000,10000,8000,15000,3000,20000,5000,10000) },
  @{ m="2db0a58b-6ffb-4240-811e-9530d230a50a"; o="no";   a=@(5000,8000,3000,10000,15000) },

  # Nyege Nyege sell out
  @{ m="1fe5f0c7-7697-41f5-9244-1214017a77ce"; o="yes";  a=@(5000,10000,20000,8000,3000,15000,5000) },
  @{ m="1fe5f0c7-7697-41f5-9244-1214017a77ce"; o="no";   a=@(5000,8000,10000,3000) },

  # Eddy Kenzo new album
  @{ m="cff84f4b-07aa-4daa-ae9f-33ea8d7e4f62"; o="yes";  a=@(5000,10000,3000,8000,15000,5000,2000) },
  @{ m="cff84f4b-07aa-4daa-ae9f-33ea8d7e4f62"; o="no";   a=@(5000,3000,8000,10000,2000) },

  # MTN 5G launch
  @{ m="0efc55bd-264d-4e7c-890e-f888bef35933"; o="yes";  a=@(10000,5000,20000,8000,15000,3000,10000) },
  @{ m="0efc55bd-264d-4e7c-890e-f888bef35933"; o="no";   a=@(5000,8000,3000,10000,20000) },

  # Bobi Wine declares presidential bid
  @{ m="43554639-38f7-4e49-84ba-acf34af20023"; o="opt_a"; a=@(10000,5000,20000,8000,3000,15000,5000) },
  @{ m="43554639-38f7-4e49-84ba-acf34af20023"; o="opt_b"; a=@(10000,5000,8000,3000,20000,15000) },

  # BOU cut CBR October
  @{ m="f73c33ab-3d01-4219-91b8-2cf2a15adb99"; o="yes";  a=@(10000,5000,20000,8000,15000,3000) },
  @{ m="f73c33ab-3d01-4219-91b8-2cf2a15adb99"; o="no";   a=@(5000,8000,3000,10000,20000,15000) }
)

# ─── 4. Insert bets ──────────────────────────────────────────────────────────
Write-Host "Inserting demo bets..."
$totalBets   = 0
$marketTotals = @{}   # market_id -> total added
$optionTotals = @{}   # "market_id|option_id" -> total added

$userIdx = 0
foreach ($plan in $betPlan) {
  $mid = $plan.m
  $oid = $plan.o
  foreach ($amt in $plan.a) {
    $uid = $u[$userIdx % $u.Count]
    $userIdx++
    # stagger timestamps over the past 14 days
    $daysAgo = [math]::Floor((Get-Random -Minimum 0 -Maximum 1440)) # minutes ago in past 24*60*10 mins = 10 days
    $placedAt = (Get-Date).AddMinutes(-$daysAgo).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    try {
      Post "bets" @{
        user_id   = $uid
        market_id = $mid
        option_id = $oid
        amount    = $amt
        status    = "active"
        is_demo   = $true
        placed_at = $placedAt
      } | Out-Null
      $totalBets++
      if ($marketTotals.ContainsKey($mid)) { $marketTotals[$mid] += $amt } else { $marketTotals[$mid] = $amt }
      $key2 = "$mid|$oid"
      if ($optionTotals.ContainsKey($key2)) { $optionTotals[$key2] += $amt } else { $optionTotals[$key2] = $amt }
    } catch {
      Write-Host "  ! Bet failed ${mid}/${oid}: $_"
    }
  }
}
Write-Host "Inserted $totalBets demo bets"

# ─── 5. Update market total_pool and option pools ────────────────────────────
Write-Host "Updating market pools..."
$wc = New-Object System.Net.WebClient
$wc.Headers.Add("Authorization", "Bearer $key"); $wc.Headers.Add("apikey", $key)

foreach ($mid in $marketTotals.Keys) {
  $addedTotal = $marketTotals[$mid]

  # fetch current market
  $raw = $wc.DownloadString("$base/markets?select=id,total_pool,options&id=eq.$mid")
  $mkt = ($raw | ConvertFrom-Json)[0]
  $newTotal = [decimal]$mkt.total_pool + $addedTotal

  # update each option's total_pool
  $newOpts = $mkt.options | ForEach-Object {
    if ($_ -eq $null) { return $_ }
    $k = "$mid|$($_.id)"
    $boost = if ($optionTotals.ContainsKey($k)) { $optionTotals[$k] } else { 0 }
    @{
      id          = $_.id
      label       = $_.label
      total_pool  = ([decimal]$_.total_pool + $boost)
    }
  }

  $body = @{ total_pool = $newTotal; options = $newOpts } | ConvertTo-Json -Depth 10
  $wc2 = New-Object System.Net.WebClient
  $wc2.Headers.Add("Authorization", "Bearer $key"); $wc2.Headers.Add("apikey", $key)
  $wc2.Headers.Add("Content-Type", "application/json"); $wc2.Headers.Add("Prefer", "return=minimal")
  $wc2.UploadString("$base/markets?id=eq.$mid", "PATCH", $body) | Out-Null
  Write-Host "  + market $($mid.Substring(0,8)): pool += UGX $($addedTotal.ToString('N0'))"
}

Write-Host ""
Write-Host "Done! Demo seed complete:"
Write-Host "  Users:   $($userIds.Count)"
Write-Host "  Bets:    $totalBets"
Write-Host "  Markets: $($marketTotals.Keys.Count) updated"
