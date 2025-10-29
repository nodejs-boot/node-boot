// Re-export AWS Lambda types from official @types/aws-lambda package
// eslint-disable-next-line import/no-unresolved
import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from "aws-lambda";

export type LambdaHandler = (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult>;
