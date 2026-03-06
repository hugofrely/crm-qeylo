from django.contrib import admin
from .models import EmailAccount, SentEmail, EmailTemplate

admin.site.register(EmailAccount)
admin.site.register(SentEmail)
admin.site.register(EmailTemplate)
