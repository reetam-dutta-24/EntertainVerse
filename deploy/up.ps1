# Brings the production site up for a demo: starts both servers, creates the
# load balancer, opens a Cloudflare quick tunnel for HTTPS, points the apps at
# the tunnel's address and waits until both servers pass the health check.
# Usage (from the repo root): .\deploy\up.ps1
. "$PSScriptRoot\common.ps1"

Write-Host "1/6 Starting both servers..."
Invoke-Aws ec2 start-instances --instance-ids $ServerA $ServerB | Out-Null
Invoke-Aws ec2 wait instance-running --instance-ids $ServerA $ServerB
$ipA = Get-PublicIp $ServerA
$ipB = Get-PublicIp $ServerB

Write-Host "2/6 Creating the load balancer..."
$alb = Get-Alb
if (-not $alb) {
  Invoke-Aws elbv2 create-load-balancer --name $AlbName --type application --scheme internet-facing `
    --subnets @Subnets --security-groups $AlbSecurityGroup | Out-Null
  $alb = Get-Alb
}
# Same settings as an existing listener is a no-op, so this is safe to rerun.
Invoke-Aws elbv2 create-listener --load-balancer-arn $alb.Arn --protocol HTTP --port 80 `
  --default-actions "Type=forward,TargetGroupArn=$TargetGroupArn" | Out-Null
# The target group was created with port 80; the apps listen on 3000.
Invoke-Aws elbv2 register-targets --target-group-arn $TargetGroupArn `
  --targets "Id=$ServerA,Port=3000" "Id=$ServerB,Port=3000" | Out-Null

Write-Host "3/6 Opening the HTTPS tunnel on server A..."
# A quick tunnel gets a new random address each time it starts, so it never
# restarts on its own: a stale address would be worse than none.
$tunnelUrl = Invoke-Remote $ipA @"
docker rm -f tunnel >/dev/null 2>&1 || true
docker run -d --name tunnel --restart no cloudflare/cloudflared:latest \
  tunnel --no-autoupdate --url http://$($alb.Dns) >/dev/null
for i in `$(seq 1 30); do
  url=`$(docker logs tunnel 2>&1 | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | head -n 1)
  [ -n "`$url" ] && echo "`$url" && exit 0
  sleep 2
done
echo "tunnel did not report an address" >&2; docker logs --tail 20 tunnel >&2; exit 1
"@
$tunnelUrl = ($tunnelUrl | Select-Object -Last 1).ToString().Trim()

Write-Host "4/6 Pointing both apps at $tunnelUrl..."
# Changing APP_URL in .env makes compose recreate the app container with it.
$setUrl = @"
cd ~/entertainverse
sed -i 's|^APP_URL=.*|APP_URL=$tunnelUrl|' .env
docker compose up -d 2>&1 | tail -n 3
"@
Invoke-Remote $ipA $setUrl | Write-Host
Invoke-Remote $ipB $setUrl | Write-Host

Write-Host "5/6 Waiting for both servers to pass the load balancer's health check..."
Invoke-Aws elbv2 wait target-in-service --target-group-arn $TargetGroupArn `
  --targets "Id=$ServerA,Port=3000" "Id=$ServerB,Port=3000"

Write-Host "6/6 Checking the public address..."
for ($i = 1; $i -le 20; $i++) {
  try { $health = Invoke-RestMethod "$tunnelUrl/api/health" -TimeoutSec 10; break }
  catch { Start-Sleep -Seconds 3 }
}
if (-not $health) { throw "the tunnel address is not answering yet: $tunnelUrl" }

Write-Host ""
Write-Host "Site:          $tunnelUrl"
Write-Host "Load balancer: http://$($alb.Dns)   (for the load test)"
Write-Host "Health:        $($health.status) (answered by server $($health.server))"
Write-Host "SSH:           A $ipA, B $ipB"
Write-Host "Run .\deploy\down.ps1 when done: the load balancer bills by the hour."
