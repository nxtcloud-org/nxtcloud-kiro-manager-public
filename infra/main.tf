terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

locals {
  is_prod     = var.environment == "prod"
  name_prefix = local.is_prod ? var.project_name : "${var.project_name}-${var.environment}"
  domain_name = local.is_prod ? "${var.subdomain}.${var.domain_zone}" : "${var.subdomain}-${var.environment}.${var.domain_zone}"
}

# ---- VPC + Security Groups ----
module "vpc" {
  source            = "./modules/vpc"
  name_prefix       = local.name_prefix
  environment       = var.environment
  ssh_allowed_cidrs = var.ssh_allowed_cidrs
}

# ---- IAM (EC2 Instance Role) ----
module "iam" {
  source      = "./modules/iam"
  name_prefix = local.name_prefix
  environment = var.environment
  s3_bucket   = var.s3_bucket
}

# ---- RDS (PostgreSQL) ----
module "rds" {
  source         = "./modules/rds"
  name_prefix    = local.name_prefix
  environment    = var.environment
  instance_class = var.db_instance_class
  db_name        = var.db_name
  db_username    = var.db_username
  db_password    = var.db_password
  db_sg_id       = module.vpc.db_sg_id
}

# ---- EC2 (Docker Host + Git Deploy) ----
module "ec2" {
  source                = "./modules/ec2"
  name_prefix           = local.name_prefix
  environment           = var.environment
  instance_type         = var.instance_type
  instance_profile_name = module.iam.instance_profile_name
  app_sg_id             = module.vpc.app_sg_id
  subnet_id             = module.vpc.subnet_ids[0]
  aws_region            = var.aws_region
  database_url          = module.rds.database_url
  jwt_secret            = var.jwt_secret
  s3_bucket             = var.s3_bucket
  aws_account_id        = var.aws_account_id
  identity_store_id     = var.identity_store_id
  slack_webhook_url     = var.slack_webhook_url
  github_repo           = var.github_repo
}

# ---- CDN (CloudFront + ACM + Route53) ----
module "cdn" {
  source      = "./modules/cdn"
  name_prefix = local.name_prefix
  environment = var.environment
  domain_zone = var.domain_zone
  domain_name = local.domain_name
  subdomain   = var.subdomain
  origin_ip   = module.ec2.public_ip

  providers = {
    aws.us_east_1 = aws.us_east_1
  }
}
