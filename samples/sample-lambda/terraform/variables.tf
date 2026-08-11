variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "function_name" {
  description = "Name of the Lambda function"
  type        = string
  default     = "nodeboot-lambda-sample"
}

variable "lambda_zip_path" {
  description = "Path to the packaged Lambda deployment artifact (produced by `pnpm run package`)"
  type        = string
  default     = "../lambda.zip"
}

variable "lambda_handler" {
  description = "Lambda handler entrypoint"
  type        = string
  default     = "handler.handler"
}

variable "lambda_runtime" {
  description = "Lambda Node.js runtime"
  type        = string
  default     = "nodejs20.x"
}

variable "memory_size" {
  description = "Lambda memory size (MB)"
  type        = number
  default     = 256
}

variable "timeout" {
  description = "Lambda timeout (seconds)"
  type        = number
  default     = 15
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention in days for the Lambda's log group"
  type        = number
  default     = 14
}

variable "stage_name" {
  description = "API Gateway deployment stage name"
  type        = string
  default     = "dev"
}

variable "environment_variables" {
  description = "Additional environment variables passed to the Lambda function"
  type        = map(string)
  default     = {}
}

# --- LocalStack support --------------------------------------------------
# Set `use_localstack = true` (see localstack.tfvars) to point this same
# Terraform configuration at a local LocalStack instance instead of real AWS,
# without changing a single resource definition.

variable "use_localstack" {
  description = "Whether to target a local LocalStack instance instead of real AWS"
  type        = bool
  default     = false
}

variable "localstack_endpoint" {
  description = "LocalStack gateway endpoint (used only when use_localstack = true)"
  type        = string
  default     = "http://localhost:4566"
}
