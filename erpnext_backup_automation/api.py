import frappe


@frappe.whitelist()
def get_dashboard_data():
	# Total backups
	total_backups = frappe.db.count("Backup Log")

	# Failed backups
	failed_backups = frappe.db.count("Backup Log", filters={"status": "Failed"})

	# Last backup
	last_log = frappe.db.get_value(
		"Backup Log",
		filters={},
		fieldname=["file_name", "time_stamp", "status"],
		order_by="time_stamp desc",
		as_dict=True
	)

	last_backup_time = None
	if last_log and last_log.get("time_stamp"):
		last_backup_time = frappe.utils.format_datetime(last_log["time_stamp"], "dd MMM yyyy, hh:mm a")

	# Cloud status — based on most recent log
	onedrive_status = "Not Configured"
	gdrive_status   = "Not Configured"

	if last_log:
		gdrive_status   = last_log.get("google_drive_status") or "Not Configured"
		onedrive_status = last_log.get("one_drive_status")    or "Not Configured"

	return {
		"total_backups":       total_backups,
		"failed_backups":      failed_backups,
		"last_backup_time":    last_backup_time,
		"onedrive_status":     onedrive_status,
		"gdrive_status":       gdrive_status,
		"auto_backup_enabled": False,   # wire this up when you have a Settings doctype
		"backup_time":         "--",
		"next_backup":         "--",
	}


@frappe.whitelist()
def create_backup_now(destination="Both"):
	try:
		log = frappe.new_doc("Backup Log")
		log.status           = "In Progress"
		log.site_name        = frappe.local.site
		log.time_stamp       = frappe.utils.now_datetime()
		log.insert(ignore_permissions=True)
		frappe.db.commit()

		# TODO: trigger your actual backup logic here
		# e.g. from erpnext_backup_automation.backup import run_backup
		# run_backup(log.name, destination)

		return log.name

	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "Backup Now Failed")
		frappe.throw(str(e))
