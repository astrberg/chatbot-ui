import os
from google.oauth2 import id_token
from google.auth.transport import requests
import logging

CLIENT_ID = os.environ["VITE_GOOGLE_CLIENT_ID"]

async def verify_token(token: str, allowed_users: list):
    """
    Verifies the Google ID token and returns the decoded payload if valid.

    Args:
        token (str): The Google ID token to verify.

    Returns:
        dict: The decoded payload if the token is valid.
        None: If the token is invalid or verification fails.
    """
    try:
        payload = id_token.verify_oauth2_token(token, requests.Request(), CLIENT_ID)
        if payload["aud"] != CLIENT_ID:
            raise ValueError("Invalid audience.")
        if payload["iss"] not in ["accounts.google.com", "https://accounts.google.com"]:
            raise ValueError("Invalid issuer.")
        if payload["email"] not in allowed_users:
            raise ValueError("Unauthorized user.")

        return payload
    except ValueError as e:
        logging.error(f"Token verification failed: {e}")
        return None
