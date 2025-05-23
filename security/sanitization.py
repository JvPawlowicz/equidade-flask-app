import bleach
from markdown import markdown
from flask import Markup

# Tags e atributos permitidos
ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li']
ALLOWED_ATTRIBUTES = {'a': ['href', 'title']}

def safe_markdown(text):
    """Renderiza markdown com sanitização segura."""
    if not text:
        return ""
    return Markup(bleach.clean(
        markdown(text),
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES
    ))

def sanitize_html(html):
    """Sanitiza HTML removendo elementos potencialmente perigosos."""
    return bleach.clean(html, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRIBUTES)