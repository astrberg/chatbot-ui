from main import read_content


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
