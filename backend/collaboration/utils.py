import re
from html.parser import HTMLParser
from io import StringIO


def extract_mention_ids(html_content):
    pattern = r'data-mention-id="([0-9a-f-]+)"'
    return list(set(re.findall(pattern, html_content)))


class _HTMLTextExtractor(HTMLParser):
    """Extract plain text from HTML, stripping all tags."""

    def __init__(self):
        super().__init__()
        self._result = StringIO()

    def handle_data(self, data):
        self._result.write(data)

    def get_text(self):
        return self._result.getvalue()


def strip_html_tags(html: str) -> str:
    """Strip all HTML tags and return plain text content."""
    extractor = _HTMLTextExtractor()
    extractor.feed(html)
    return extractor.get_text().strip()
