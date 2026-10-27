# Shared settings and helpers for up.ps1 / down.ps1 (dot-sourced, not run directly).
$ErrorActionPreference = "Stop"
$env:AWS_DEFAULT_REGION = "ap-southeast-2"

$ServerA = "i-0a0d9927b1e3bc727"   # app + Postgres + Redis + tunnel
$ServerB = "i-046ec04f6443d3dec"   # app only
$AlbName = "entertainverse-alb"
$AlbSecurityGroup = "sg-066f2179e227c977d"
$Subnets = @("subnet-04fe2616a36552ef4", "subnet-0292fe915185d8101")   # 2a, 2b
$TargetGroupArn = "arn:aws:elasticloadbalancing:ap-southeast-2:978387602393:targetgroup/entertainverse-tg/6899e6fbb9fe2fd9"
$SshKey = "$HOME\.ssh\entertainverse-key.pem"

# The VS Code terminal can have a stale PATH, so fall back to the installer location.
$Aws = (Get-Command aws -ErrorAction SilentlyContinue).Source
if (-not $Aws) { $Aws = "C:\Program Files\Amazon\AWSCLIV2\aws.exe" }

function Invoke-Aws {
  $out = & $Aws @args
  if ($LASTEXITCODE -ne 0) { throw "aws $($args -join ' ') failed" }
  $out
}

function Get-Alb {
  # Prints nothing (and no error) when the load balancer does not exist.
  $out = & $Aws elbv2 describe-load-balancers --names $AlbName `
    --query "LoadBalancers[0].[LoadBalancerArn,DNSName]" --output text 2>$null
  if ($LASTEXITCODE -eq 0 -and $out) {
    $arn, $dns = $out -split "\s+"
    @{ Arn = $arn; Dns = $dns }
  }
}

function Get-PublicIp($instanceId) {
  Invoke-Aws ec2 describe-instances --instance-ids $instanceId `
    --query "Reservations[0].Instances[0].PublicIpAddress" --output text
}

# Runs a bash script on a server. Exit code 255 means SSH itself failed to
# connect (the server is still booting, or the home connection switched to an IP
# the security group doesn't allow), so that is retried; any other failure stops.
function Invoke-Remote($ip, $script, $tries = 30) {
  $opts = @("-i", $SshKey, "-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=8")
  $script = $script -replace "`r", ""   # bash chokes on Windows line endings
  for ($i = 1; $i -le $tries; $i++) {
    $out = $script | ssh @opts "ubuntu@$ip" "bash -s" 2>&1
    if ($LASTEXITCODE -eq 0) { return $out }
    if ($LASTEXITCODE -ne 255) { $out | Write-Host; throw "remote script failed on $ip" }
    Start-Sleep -Seconds 3
  }
  throw "could not SSH into $ip"
}
