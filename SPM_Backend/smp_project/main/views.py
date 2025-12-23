from django.http import HttpResponse

def home(request):
    return HttpResponse("أهلاً بك في أول صفحة Django ")

