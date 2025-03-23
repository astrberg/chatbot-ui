import pytest
import aiohttp
from aioresponses import aioresponses
from main import send_request, read_content


# Test for read_content
def test_read_content():
    # Valid response
    data = {"choices": [{"message": {"content": "Hello, world!"}}]}
    assert read_content(data) == "Hello, world!"

    # Missing keys in response
    data = {}
    assert read_content(data) == "Error, could not read content. Please try again."

    # Invalid structure
    data = {"choices": [{}]}
    assert read_content(data) == "Error, could not read content. Please try again."


@pytest.mark.asyncio
async def test_send_request_success():
    with aioresponses() as mocker:
        mocker.post(
            "https://api.venice.ai/api/v1/chat/completions",
            payload={"choices": [{"message": {"content": "Hello, world!"}}]},
        )

        response = await send_request("Hello, world!")
        assert response["choices"][0]["message"]["content"] == "Hello, world!"


@pytest.mark.asyncio
async def test_send_request_error():
    with aioresponses() as mocker:
        mocker.post(
            "https://api.venice.ai/api/v1/chat/completions",
            exception=aiohttp.ClientError("Error"),
        )

        response = await send_request("Hello, world!")
        assert response is None
