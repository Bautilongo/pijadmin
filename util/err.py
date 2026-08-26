class ServerCreationError(Exception):
    def __init__(self, error, message, code):
        super().__init__(message)
        self.error = error
        self.code = code
