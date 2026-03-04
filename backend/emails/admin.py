from django.contrib import admin
from .models import EmailAccount, SentEmail

admin.site.register(EmailAccount)
admin.site.register(SentEmail)
