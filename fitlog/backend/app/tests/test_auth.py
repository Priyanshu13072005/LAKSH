"""
Tests for authentication router, password hashing, and token verification.
"""

from app.core.security import hash_password, verify_password, create_access_token, decode_access_token


def test_password_hashing():
    pwd = "secretpassword123"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_jwt_token_generation_and_decoding():
    data = {"sub": "user@laksh.app", "role": "athlete"}
    token = create_access_token(data)
    assert isinstance(token, str)
    assert len(token) > 20

    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "user@laksh.app"
    assert decoded["role"] == "athlete"
    assert "exp" in decoded


def test_invalid_jwt_token_returns_none():
    invalid_token = "invalid.token.payload"
    assert decode_access_token(invalid_token) is None
