from django.urls import path
from .views import GenerateWBSView, GenerateGanttView, GenerateFullPlanView
from .views import ask_project_manager
from .views import generate_project_risks

urlpatterns = [
    path('wbs/', GenerateWBSView.as_view(), name='generate-wbs'),
    path('ask/', ask_project_manager, name='ask'),
    path('risk/generate/', generate_project_risks, name='generate-risks'),
    path('gantt/', GenerateGanttView.as_view(), name='generate-gantt'),
    path('plan/full/', GenerateFullPlanView.as_view(), name='generate-full-plan'),
]

