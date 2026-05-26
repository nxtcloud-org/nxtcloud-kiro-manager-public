variable "name_prefix" { type = string }
variable "environment" { type = string }
variable "instance_class" {
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
variable "db_sg_id" { type = string }
