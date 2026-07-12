import pytest

from src.agents.sandbox.base import normalize_sandbox_path


def test_normalize_sandbox_path_accepts_rooted_home_user_path() -> None:
    assert normalize_sandbox_path("/home/user/project/main.py") == "/home/user/project/main.py"


@pytest.mark.parametrize("path", ["relative/file.py", "/etc/passwd", "/home/other/file.txt"])
def test_normalize_sandbox_path_rejects_invalid_paths(path: str) -> None:
    with pytest.raises(ValueError):
        normalize_sandbox_path(path)