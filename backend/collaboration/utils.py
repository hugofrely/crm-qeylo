import re


def extract_mention_ids(html_content):
    pattern = r'data-mention-id="([0-9a-f-]+)"'
    return list(set(re.findall(pattern, html_content)))
