from django.contrib import admin
from .models import Workflow, WorkflowNode, WorkflowEdge, WorkflowExecution, WorkflowExecutionStep

admin.site.register(Workflow)
admin.site.register(WorkflowNode)
admin.site.register(WorkflowEdge)
admin.site.register(WorkflowExecution)
admin.site.register(WorkflowExecutionStep)
