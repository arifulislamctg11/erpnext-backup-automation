import frappe
import subprocess
import os
import shutil
import time
import re
from erpnext_backup_manager.utils.logger import log_backup


EXPECTED_SUFFIXES = [
    "-database.sql.gz",
    "-files.tar",
    "-private-files.tar",
    "-site_config_backup.json",
]


def create_backup():
    site = frappe.local.site

    try:
        backup_path = frappe.get_site_path("private", "backups")

        # 1. Ensure automation_backup folder exists (one-time, idempotent)
        automation_backup_path = os.path.join(backup_path, "..", "automation_backup")
        automation_backup_path = os.path.normpath(automation_backup_path)
        os.makedirs(automation_backup_path, exist_ok=True)

        # 2. Run ERPNext backup
        subprocess.run(
            ["bench", "--site", site, "backup", "--with-files"],
            check=True
        )

        # 3. Poll until all 4 backup files exist for the latest timestamp
        latest_timestamp = None
        related_files = []

        for attempt in range(20):  # up to 60s
            time.sleep(3)

            all_files = [
                f for f in os.listdir(backup_path)
                if not f.endswith(".zip")
            ]

            timestamps = re.findall(r"(\d{8}_\d{6})", " ".join(all_files))
            if not timestamps:
                continue

            latest_timestamp = max(timestamps)

            related_files = [
                f for f in all_files
                if f.startswith(latest_timestamp)
            ]

            all_present = all(
                any(f.endswith(suffix) for f in related_files)
                for suffix in EXPECTED_SUFFIXES
            )

            if all_present:
                break
        else:
            missing = [
                suffix for suffix in EXPECTED_SUFFIXES
                if not any(f.endswith(suffix) for f in related_files)
            ]
            frappe.throw(
                f"Backup incomplete after 60s. Missing: {', '.join(missing)}"
            )

        # 4. Create a timestamped folder inside automation_backup and copy files into it
        folder_name = f"{latest_timestamp}-full-backup"
        dest_folder = os.path.join(automation_backup_path, folder_name)
        os.makedirs(dest_folder, exist_ok=True)

        for file in related_files:
            src = os.path.join(backup_path, file)
            if not os.path.isfile(src):
                frappe.throw(f"File disappeared before copying: {file}")
            shutil.copy2(src, os.path.join(dest_folder, file))

        # 5. Verify folder contents
        copied_files = os.listdir(dest_folder)

        if len(copied_files) != 4:
            frappe.throw(
                f"Folder should contain 4 files, found {len(copied_files)}: {copied_files}"
            )

        for suffix in EXPECTED_SUFFIXES:
            if not any(f.endswith(suffix) for f in copied_files):
                frappe.throw(f"Folder missing expected file: {suffix}")

        # 6. Log success
        log_backup(
            file_name=folder_name,
            file_path=dest_folder,
            status="Success",
            error_message=None,
        )

        return dest_folder

    except Exception as e:
        log_backup(
            file_name="N/A",
            file_path="N/A",
            status="Failed",
            error_message=str(e),
        )
        frappe.throw(str(e))