output "instance_id" { value = aws_instance.main.id }
output "public_ip" { value = aws_eip.main.public_ip }
output "ssh_command" {
  value = "ssh -i ~/.ssh/${var.name_prefix}.pem ec2-user@${aws_eip.main.public_ip}"
}
