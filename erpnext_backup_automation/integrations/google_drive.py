import frappe
import os
import subprocess
from ..utils.logger import log_backup , log_backup_update_last



def _get_site_conf():
    try:
        return frappe.get_site_config() or {}
    except Exception:
        return {}


def upload_to_gdrive(file_path, rclone_remote_name=None):
    try: 
        site_conf = _get_site_conf()

        rclone_remotes = site_conf.get("rclone_remotes", {})
        rclone_remote_name = rclone_remote_name or "gdrive"

        rclone_remote = rclone_remotes.get(rclone_remote_name)

        if not rclone_remote:
            frappe.throw(f"Rclone remote not configured: {rclone_remote_name}")

        if not os.path.exists(file_path):
            frappe.throw(f"Backup file not found: {file_path}")

        file_name = os.path.basename(file_path)

        remote_base = rclone_remote.rstrip(":")

        remote_target = f"{remote_base}:backups/{file_name}"

        cmd = ["rclone", "copyto", file_path, remote_target, "-vv"]

        frappe.logger().info("RCLONE CMD: " + " ".join(cmd))

        res = subprocess.run(cmd, capture_output=True, text=True)

        frappe.logger().info(f"RCODE: {res.returncode}")
        frappe.logger().info(f"STDOUT: {res.stdout}")
        frappe.logger().error(f"STDERR: {res.stderr}")

        if res.returncode != 0:
            frappe.throw(f"Rclone upload failed: {res.stderr}")
            
        log_backup_update_last(
            google_drive_status="Success"
        )
        return remote_target
    except Exception as e:
        log_backup_update_last(
            google_drive_status="Failed",
            error_message=str(e)
        )
        frappe.log_error(frappe.get_traceback(), "Google Drive Backup Failed")


