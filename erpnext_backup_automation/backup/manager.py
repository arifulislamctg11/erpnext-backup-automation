import frappe
from erpnext_backup_automation.backup.generator import create_backup
from erpnext_backup_automation.integrations.google_drive import upload_to_gdrive
from erpnext_backup_automation.integrations.one_drive import upload_to_onedrive


PROVIDERS = {
    "gdrive": upload_to_gdrive,
    "onedrive": upload_to_onedrive,
    # future:
    # "s3": upload_to_s3,
    # "ftp": upload_to_ftp,
    # "local": upload_to_local,
}

@frappe.whitelist()
def run_backup():
    backup_file = create_backup()

    settings_name = frappe.db.get_value("Backup Settings", {}, "name")

    if not settings_name:
        frappe.throw("Backup Settings not found")

    settings = frappe.get_doc("Backup Settings", settings_name)

    for dest in settings.backup_destinations:
        if not dest.enabled:
            continue

        provider = dest.provider

        try:
            if provider == "gdrive":
                upload_to_gdrive(backup_file)

            elif provider == "onedrive":
                upload_to_onedrive(backup_file)

            else:
                frappe.log_error(f"Unknown provider: {provider}", "Backup Manager")

        except Exception:
            frappe.log_error(
                frappe.get_traceback(),
                f"{provider} upload failed"
            )

    return backup_file