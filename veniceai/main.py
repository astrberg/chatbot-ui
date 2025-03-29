import os
import aiohttp
import logging
import json
from fastapi import (
    FastAPI,
    WebSocket,
    WebSocketDisconnect,
    HTTPException,
    status,
)
from aiohttp import ClientSession, ClientError
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from auth import verify_token

life = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    life["session"] = aiohttp.ClientSession()
    yield
    await life["session"].close()


app = FastAPI(lifespan=lifespan)

ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN")
if not ALLOWED_ORIGIN:
    raise ValueError("ALLOWED_ORIGIN is not set.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_USERS = os.environ.get("ALLOWED_USERS").split(",")
if not ALLOWED_USERS:
    raise ValueError("ALLOWED_USERS is not set.")


def read_content(data) -> str:
    try:
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        logging.error(f"Error: {e}")
        return "Error, could not read content. Please try again."


async def send_request(context: list, session: ClientSession) -> dict:
    try:
        async with session.post(
            os.environ["VENICE_API_URL"],
            json={
                "model": os.environ["VENICE_API_MODEL"],
                "messages": context,
                "venice_parameters": {
                    "enable_web_search": "on",
                    "include_venice_system_prompt": True,
                },
                "frequency_penalty": 0,
                "presence_penalty": 0,
                "max_tokens": 1000,
                "max_completion_tokens": 998,
                "temperature": 1,
                "top_p": 0.1,
                "stream": False,
            },
            headers={"Authorization": f"Bearer {os.environ['VENICE_API_KEY']}"},
        ) as response:
            response.raise_for_status()
            response_json = await response.json()
            return response_json
    except ClientError as e:
        logging.error(f"Error: {e}")
        return None
    except Exception as e:
        return None


async def handle_message(
    websocket: WebSocket, message: str, session: ClientSession, context: list
):
    """
    Handle incoming WebSocket messages and send responses.
    """
    try:
        data = json.loads(message)
        token = data.get("token")
        user_message = data.get("message")

        if not token or not user_message:
            await websocket.send_text("Unauthorized.")
            await websocket.send_text("[END]")
            return

        user_info = await verify_token(token, ALLOWED_USERS)
        if not user_info:
            await websocket.send_text("Unauthorized.")
            await websocket.send_text("[END]")
            return

        context.append({"role": "user", "content": user_message})

        response = await send_request(context, session)
        if response is None:
            await websocket.send_text("Error processing the message.")
            await websocket.send_text("[END]")
            return

        content = read_content(response)

        context.append({"role": "assistant", "content": content})

        await websocket.send_text(content)
        await websocket.send_text("[END]")
        logging.info(f"User: {user_info['email']}, Message: {user_message}")
        logging.info(f"Response: {content}")
    except json.JSONDecodeError:
        await websocket.send_text("Invalid message format.")
        await websocket.send_text("[END]")
        logging.error("Invalid message format from client.")


async def verify_connection(websocket: WebSocket):
    await websocket.accept()

    try:
        initial_message = await websocket.receive_text()
        data = json.loads(initial_message)
        token = data.get("token")

        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing token",
            )

        user_info = await verify_token(token, ALLOWED_USERS)
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )

        logging.info(f"WebSocket connection established for user: {user_info['email']}")
        return user_info
    except Exception as e:
        logging.error(f"Error during token verification: {e}")
        await websocket.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


@app.websocket("/ws-1994")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint to handle client connections.
    """
    try:
        _ = await verify_connection(websocket)
        session = life["session"]
        context = []
        while True:
            message = await websocket.receive_text()
            await handle_message(websocket, message, session, context)
    except WebSocketDisconnect:
        logging.info("WebSocket connection closed.")
    except Exception as e:
        logging.error(f"Error: {e}")
