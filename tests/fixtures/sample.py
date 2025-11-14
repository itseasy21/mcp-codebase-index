"""
Sample Python file for testing parser
"""

def add(a: int, b: int) -> int:
    """Add two numbers together."""
    return a + b


class Calculator:
    """A simple calculator class."""

    def __init__(self):
        self.history = []

    def multiply(self, a: int, b: int) -> int:
        """Multiply two numbers."""
        result = a * b
        self.history.append(result)
        return result

    def get_history(self) -> list:
        """Get calculation history."""
        return self.history


@dataclass
class User:
    """User data class."""
    id: str
    name: str
    email: str


async def fetch_data(url: str) -> dict:
    """Fetch data from URL asynchronously."""
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()
