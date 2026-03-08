from django.contrib import admin
from .models import Comment, Mention, Reaction

admin.site.register(Comment)
admin.site.register(Mention)
admin.site.register(Reaction)
