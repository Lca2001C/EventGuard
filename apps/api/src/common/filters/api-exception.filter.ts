import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : null;

    response.status(status).json({
      statusCode: status,
      message: this.resolveMessage(body),
      timestamp: new Date().toISOString()
    });
  }

  private resolveMessage(body: unknown): string | string[] {
    if (typeof body === "string") {
      return body;
    }

    if (body && typeof body === "object" && "message" in body) {
      return (body as { message: string | string[] }).message;
    }

    return "Unexpected server error";
  }
}
