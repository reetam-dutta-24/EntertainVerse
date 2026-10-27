# Stops paying for the demo: deletes the load balancer (it can't be paused) and
# stops both servers. Data stays on server A's disk; up.ps1 brings it all back.
# Usage (from the repo root): .\deploy\down.ps1
. "$PSScriptRoot\common.ps1"

$alb = Get-Alb
if ($alb) {
  Write-Host "Deleting the load balancer (its listener goes with it)..."
  Invoke-Aws elbv2 delete-load-balancer --load-balancer-arn $alb.Arn
  Invoke-Aws elbv2 wait load-balancers-deleted --load-balancer-arns $alb.Arn
} else {
  Write-Host "No load balancer running."
}

# Stopping sends the apps SIGTERM, so they drain and shut down cleanly.
Write-Host "Stopping both servers..."
Invoke-Aws ec2 stop-instances --instance-ids $ServerA $ServerB | Out-Null
Invoke-Aws ec2 wait instance-stopped --instance-ids $ServerA $ServerB
Write-Host "Done: nothing is billing except the servers' disks and the S3 bucket."
