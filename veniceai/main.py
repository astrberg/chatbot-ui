import os
import aiohttp
import asyncio
import websockets
import logging
import json
from websockets import serve, ServerConnection, Request
import http

from auth import verify_token

PORT = int(os.environ.get("PORT"))
if not PORT:
    raise ValueError("PORT is not set.")

ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN")
if not ALLOWED_ORIGIN:
    raise ValueError("ALLOWED_ORIGIN is not set.")

ALLOWED_USERS = os.environ.get("ALLOWED_USERS").split(",")
if not ALLOWED_USERS:
    raise ValueError("ALLOWED_USERS is not set.")

logging.basicConfig(level=logging.INFO)


def read_content(data) -> str:
    try:
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        logging.error(f"Error: {e}")
        return "Error, could not read content. Please try again."


async def send_request(message: str):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                os.environ["VENICE_API_URL"],
                json={
                    "model": os.environ["VENICE_API_MODEL"],
                    "messages": [{"role": "user", "content": message}],
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
    except aiohttp.ClientError as e:
        logging.error(f"Error: {e}")
        return None
    except Exception as e:
        return None


async def send_response(websocket: ServerConnection, response: str):
    try:
        await websocket.send(response)
        await websocket.send("[END]")
    except Exception as e:
        return None


async def handle_message(websocket: ServerConnection, message: str):
    try:
        data = json.loads(message)
        token = data.get("token")
        user_message = data.get("message")

        if not token or not user_message:
            await send_response(websocket, "Unauthorized.")
            return

        user_info = await verify_token(token, ALLOWED_USERS)
        if not user_info:
            await send_response(websocket, "Unauthorized.")
            return

        response = await send_request(user_message)
        if response is None:
            await send_response(websocket, "Error processing the message.")
            return

        content = read_content(response)
        await send_response(websocket, content)
        logging.info(f"User: {user_info['email']}, Message: {user_message}")
        logging.info(f"Response: {content}")
    except json.JSONDecodeError:
        await send_response(websocket, "Invalid message format.")
        logging.error("Invalid message format from client.")
        return


async def echo(websocket: ServerConnection):
    try:
        async for message in websocket:
            await handle_message(websocket, message)
    except websockets.exceptions.ConnectionClosed:
        return None
    except Exception as e:
        logging.error(f"Error: {e}")
        return None


async def process_request(connection: ServerConnection, request: Request):
    """
    Handle non-WebSocket HTTP requests.

    If the request is not a valid WebSocket handshake, return an HTTP response.
    """
    if "Upgrade" not in request.headers or request.headers["Upgrade"].lower() != "websocket":
        response = connection.respond(
            http.HTTPStatus.OK,
            "OK"
        )
        return response

    # Return None to continue with the WebSocket handshake
    return None

async def main():
    async with serve(
        echo, "0.0.0.0", PORT, origins=[ALLOWED_ORIGIN], process_request=process_request
    ):
        logging.info(f"WebSocket server started on port: {PORT}")
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
