resource "tls_private_key" "ssh" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "ssh" {
  key_name   = var.name_prefix
  public_key = tls_private_key.ssh.public_key_openssh
  tags       = { Name = var.name_prefix, Environment = var.environment }
}

resource "local_file" "private_key" {
  content         = tls_private_key.ssh.private_key_pem
  filename        = pathexpand("~/.ssh/${var.name_prefix}.pem")
  file_permission = "0400"
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-arm64"]
  }
  filter {
    name   = "state"
    values = ["available"]
  }
}

resource "aws_instance" "main" {
  ami                     = data.aws_ami.al2023.id
  instance_type           = var.instance_type
  key_name                = aws_key_pair.ssh.key_name
  iam_instance_profile    = var.instance_profile_name
  vpc_security_group_ids  = [var.app_sg_id]
  subnet_id               = var.subnet_id
  disable_api_termination = var.environment == "prod"

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required" # IMDSv2 강제
  }

  user_data = templatefile("${path.module}/user_data.sh", {
    aws_region        = var.aws_region
    database_url      = var.database_url
    jwt_secret        = var.jwt_secret
    s3_bucket         = var.s3_bucket
    aws_account_id    = var.aws_account_id
    identity_store_id = var.identity_store_id
    slack_webhook_url = var.slack_webhook_url
    github_repo       = var.github_repo
  })

  tags = { Name = var.name_prefix, Environment = var.environment }
}

resource "aws_eip" "main" {
  instance = aws_instance.main.id
  domain   = "vpc"
  tags     = { Name = "${var.name_prefix}-eip", Environment = var.environment }
}
