FROM python:3.12-alpine

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

RUN mkdir -p /app/.local && chown -R appuser:appgroup /app/.local

USER appuser

ENV PIP_USER=1
ENV PYTHONUSERBASE=/app/.local
ENV PATH="/app/.local/bin:$PATH"

RUN python3.12 -m pip install --no-cache-dir aiohttp websockets google-auth requests

COPY main.py auth.py /app/

CMD ["python3.12", "main.py"]