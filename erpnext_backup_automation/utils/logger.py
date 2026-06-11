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