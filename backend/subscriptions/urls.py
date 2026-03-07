from django.urls import path
from . import views

urlpatterns = [
    path("", views.subscription_detail, name="subscription-detail"),
    path("usage/", views.usage_summary, name="subscription-usage"),
    path("checkout/", views.create_checkout_session, name="subscription-checkout"),
    path("downgrade/", views.downgrade, name="subscription-downgrade"),
    path("cancel/", views.cancel_subscription, name="subscription-cancel"),
    path("reactivate/", views.reactivate_subscription, name="subscription-reactivate"),
    path("invoices/", views.invoices, name="subscription-invoices"),
    path("payment-method/", views.payment_method, name="subscription-payment-method"),
    path("update-payment-method/", views.update_payment_method, name="subscription-update-payment-method"),
]
