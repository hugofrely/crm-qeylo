from django.db import migrations


def set_won_lost_flags(apps, schema_editor):
    PipelineStage = apps.get_model("deals", "PipelineStage")
    PipelineStage.objects.filter(name__in=["Gagné", "Signé"]).update(is_won=True)
    PipelineStage.objects.filter(name__in=["Perdu", "Abandonné"]).update(is_lost=True)


def reverse_flags(apps, schema_editor):
    PipelineStage = apps.get_model("deals", "PipelineStage")
    PipelineStage.objects.filter(name__in=["Gagné", "Signé"]).update(is_won=False)
    PipelineStage.objects.filter(name__in=["Perdu", "Abandonné"]).update(is_lost=False)


class Migration(migrations.Migration):

    dependencies = [
        ("deals", "0009_add_stage_is_won_is_lost"),
    ]

    operations = [
        migrations.RunPython(set_won_lost_flags, reverse_flags),
    ]
