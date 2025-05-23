from wtforms.validators import ValidationError
import re
from datetime import datetime

# Regex patterns
PHONE_REGEX = r'^\+?[\d\s-]{10,15}$'
EMAIL_REGEX = r'^[^@\s]+@[^@\s]+\.[^@\s]+$'

class Validators:
    @staticmethod
    def validate_phone(form, field):
        if not re.match(PHONE_REGEX, field.data):
            raise ValidationError('Formato de telefone inválido')

    @staticmethod
    def validate_email(form, field):
        if not re.match(EMAIL_REGEX, field.data):
            raise ValidationError('Formato de email inválido')

    @staticmethod
    def validate_date_not_past(form, field):
        if field.data and field.data < datetime.now().date():
            raise ValidationError('Data não pode ser no passado')