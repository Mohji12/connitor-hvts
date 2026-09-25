"""
AWS Lambda entrypoint.

Set the same environment variable names as in `.env.example` on the Lambda function,
or store them as JSON in Secrets Manager and set `HVTS_SECRETS_ARN`.
All credentials are read via `app.config.get_settings()`.
"""

from mangum import Mangum

from main import app

handler = Mangum(app, lifespan="off")
