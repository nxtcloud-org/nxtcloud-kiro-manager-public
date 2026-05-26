variable "name_prefix" { type = string }
variable "environment" { type = string }
variable "ssh_allowed_cidrs" {
  type    = list(string)
  default = []
}
