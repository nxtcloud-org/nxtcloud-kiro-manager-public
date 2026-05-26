variable "environment" {
  type        = string
  default     = "dev"
  description = "환경 (dev, staging, prod)"

  validation {
    condition     = can(regex("^[a-z0-9]+$", var.environment))
    error_message = "environment는 소문자 영숫자만 허용"
  }
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "aws_account_id" {
  type        = string
  description = "AWS 계정 ID (S3 로그 경로에 사용)"
}

variable "project_name" {
  type    = string
  default = "kiro-manager"
}

variable "domain_zone" {
  type        = string
  description = "Route53 호스팅 영역 (예: example.com)"
}

variable "subdomain" {
  type    = string
  default = "kiro-manager"
}

variable "instance_type" {
  type    = string
  default = "t4g.medium"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_name" {
  type    = string
  default = "kiro_manager"
}

variable "db_username" {
  type    = string
  default = "kiro"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "ssh_allowed_cidrs" {
  type    = list(string)
  default = []
}

variable "s3_bucket" {
  type        = string
  description = "KIRO 로그 S3 버킷"
}

variable "identity_store_id" {
  type    = string
  default = ""
}

variable "slack_webhook_url" {
  type      = string
  default   = ""
  sensitive = true
}

variable "github_repo" {
  type    = string
  default = "https://github.com/nxtcloud-org/nxtcloud-kiro-manager-public.git"
}
