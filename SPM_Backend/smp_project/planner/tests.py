from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

class GenerateWBSTest(APITestCase):
    def test_generate_wbs_success(self):
        url = reverse('generate-wbs')
        data = {"project_scope": "Test scope"}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("phases", response.data)
