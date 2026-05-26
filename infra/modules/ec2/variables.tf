variable "name_prefix" { type = string }
variable "environment" { type = string }
variable "instance_type" {
  type    = string
  default = "t4g.medium"
}
variable "instance_profile_name" { type = string }
variable "app_sg_id" { type = string }
variable "subnet_id" { type = string }
variable "aws_region" { type = string }
variable "database_url" {
  type      = string
  sensitive = true
}
variable "jwt_secret" {
  type      = string
  sensitive = true
}
variable "s3_bucket" { type = string }
variable "aws_account_id" { type = string }
variable "identity_store_id" { type = string }
variable "slack_webhook_url" {
  type      = string
  default   = ""
  sensitive = true
}
variable "github_repo" {
  type        = string
  description = "GitHub repo URL (https)"
  default     = "https://github.com/nxtcloud-org/nxtcloud-kiro-manager-public.git"
}
