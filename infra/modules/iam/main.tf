data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2" {
  name               = "${var.name_prefix}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
  tags               = { Name = "${var.name_prefix}-ec2-role", Environment = var.environment }
}

data "aws_iam_policy_document" "ec2_policy" {
  # S3 로그 읽기
  statement {
    sid    = "S3ReadLogs"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:ListBucket",
    ]
    resources = [
      "arn:aws:s3:::${var.s3_bucket}",
      "arn:aws:s3:::${var.s3_bucket}/*",
    ]
  }

  # Identity Center 읽기
  statement {
    sid    = "IdentityCenterRead"
    effect = "Allow"
    actions = [
      "identitystore:ListUsers",
      "identitystore:DescribeUser",
      "identitystore:ListGroups",
      "identitystore:ListGroupMemberships",
      "identitystore:ListGroupMembershipsForMember",
    ]
    resources = ["*"]
  }

  # Bedrock (프롬프트 분석)
  statement {
    sid    = "BedrockInvoke"
    effect = "Allow"
    actions = [
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream",
    ]
    resources = [
      "arn:aws:bedrock:*::foundation-model/*",
      "arn:aws:bedrock:*:${var.aws_account_id}:inference-profile/*",
    ]
  }

  # CloudFront 캐시 무효화 (배포 시)
  statement {
    sid    = "CloudFrontInvalidation"
    effect = "Allow"
    actions = [
      "cloudfront:CreateInvalidation",
    ]
    resources = ["arn:aws:cloudfront::${var.aws_account_id}:distribution/*"]
  }

}

resource "aws_iam_role_policy" "ec2" {
  name   = "${var.name_prefix}-ec2-policy"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.ec2_policy.json
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.name_prefix}-ec2-profile"
  role = aws_iam_role.ec2.name
}
