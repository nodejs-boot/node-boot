output "function_name" {
  description = "Deployed Lambda function name"
  value       = aws_lambda_function.api.function_name
}

output "function_arn" {
  description = "Deployed Lambda function ARN"
  value       = aws_lambda_function.api.arn
}

output "invoke_url" {
  description = "Base invoke URL for the deployed API Gateway stage"
  value       = aws_api_gateway_stage.api.invoke_url
}

output "localstack_invoke_url" {
  description = "LocalStack-flavored invoke URL (only meaningful when use_localstack = true)"
  value       = "${var.localstack_endpoint}/restapis/${aws_api_gateway_rest_api.api.id}/${var.stage_name}/_user_request_"
}
