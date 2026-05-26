output "app_url" {
  value = module.cdn.app_url
}

output "ec2_public_ip" {
  value = module.ec2.public_ip
}

output "ssh_command" {
  value = module.ec2.ssh_command
}

output "rds_endpoint" {
  value = module.rds.endpoint
}

output "cloudfront_distribution_id" {
  value = module.cdn.distribution_id
}
