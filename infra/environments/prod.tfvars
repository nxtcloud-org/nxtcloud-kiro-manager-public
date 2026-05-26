environment       = "prod"
aws_region        = "us-east-1"
aws_account_id    = "123456789012"
domain_zone       = "example.com"
subdomain         = "kiro-manager"
instance_type     = "t4g.medium"
db_instance_class = "db.t4g.micro"
s3_bucket         = "your-kiro-logs-bucket"
identity_store_id = "d-xxxxxxxxxx"
ssh_allowed_cidrs = []

# 민감 변수는 terraform.tfvars 또는 환경변수로 전달:
# TF_VAR_db_password="..."
# TF_VAR_jwt_secret="..."
