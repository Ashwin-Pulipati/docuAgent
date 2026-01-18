class AppError(Exception):
    """Base application error."""


class StorageError(AppError):
    pass


class VectorStoreError(AppError):
    pass


class DatabaseError(AppError):
    pass


class JobError(AppError):
    pass
