"""
LAKSH Backend - SQLAlchemy declarative base.
All models inherit from this Base class.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
