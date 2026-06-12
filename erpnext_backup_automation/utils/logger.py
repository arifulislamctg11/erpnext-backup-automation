import frappe
from datetime import datetime

def log_backup(file_name, file_path, status, error_message=None, time_stamp=None):
    doc = frappe.get_doc({
        "doctype": "Backup Log",
        "backup_file": file_name,
        "file_path": file_path,
        "status": status,
        "error_message": error_message,
        "time_stamp":datetime.now(),
        "site": frappe.local.site
    })

    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    
def log_backup_update_last( google_drive_status=None, one_drive_status=None, error_message=None):
    doc = task = frappe.get_last_doc('Backup Log')
    if google_drive_status:
        doc.google_drive_status = google_drive_status
    if one_drive_status:
        doc.one_drive_status = one_drive_status
    if error_message:
        doc.error_message = error_message
    doc.save(ignore_permissions=True)
    frappe.db.commit()