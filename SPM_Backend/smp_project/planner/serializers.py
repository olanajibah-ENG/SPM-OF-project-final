from rest_framework import serializers

class WBSScopeSerializer(serializers.Serializer):
    project_scope = serializers.CharField()
