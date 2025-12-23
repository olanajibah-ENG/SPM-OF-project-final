from django.db import models

class WBSRequest(models.Model):
    scope = models.TextField()
    response_json = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
