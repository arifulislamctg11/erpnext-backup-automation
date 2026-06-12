# Copyright (c) 2026, Ariful Islam and contributors
# For license information, please see license.txt

import subprocess
import frappe
from frappe.model.document import Document


class BackupSettings(Document):
	def before_save(self):
		for row in self.backup_destinations:
			if row.enabled and row.provider:
				self.check_rclone_connection(row)

	def check_rclone_connection(self, row):
		try:
			result = subprocess.run(
				["rclone", "lsd", f"{row.provider}:"],
				capture_output=True,
				text=True,
				timeout=15
			)

			if result.returncode == 0:
				row.configuration = "Configured"
				row.error_message = None
			else:
				row.configuration = "Not Configured"
				row.error_message = result.stderr.strip() or "Unknown error from rclone"

		except subprocess.TimeoutExpired:
			row.configuration = "Not Configured"
			row.error_message = "Connection timed out while reaching the provider"

		except FileNotFoundError:
			row.configuration = "Not Configured"
			row.error_message = "rclone is not installed or not found in system PATH"

		except Exception as e:
			row.configuration = "Not Configured"
			row.error_message = str(e)