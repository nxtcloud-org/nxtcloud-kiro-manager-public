output "vpc_id" { value = data.aws_vpc.default.id }
output "subnet_ids" { value = data.aws_subnets.default.ids }
output "app_sg_id" { value = aws_security_group.app.id }
output "db_sg_id" { value = aws_security_group.db.id }
