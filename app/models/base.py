from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy 2.0 ORM models in VOXOPS.
    Inheriting from DeclarativeBase provides native IDE autocompletion, type safety,
    and automatic database table registration.
    """
    pass
