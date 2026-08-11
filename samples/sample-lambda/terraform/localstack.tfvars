# Terraform variable file used to target the local LocalStack instance instead
# of real AWS. Use it with:
#   pnpm run terraform:plan   # terraform plan -var-file=localstack.tfvars
#   pnpm run terraform:apply  # terraform apply -var-file=localstack.tfvars
use_localstack       = true
localstack_endpoint  = "http://localhost:4566"
aws_region           = "us-east-1"
stage_name           = "local"
