import frappe

@frappe.whitelist()
def get_dashboard_data():
	# Total backups
	total_backups = frappe.db.count("Backup Log")
	total_backup_size = frappe.db.sql("""SELECT SUM(file_size) FROM `tabBackup Log`""")[0][0] or 0
	total_backup_size_mb = total_backup_size / (1024 * 1024)

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

	# Cloud status — from Backup Settings destinations
	onedrive_status = "Not Configured"
	gdrive_status = "Not Configured"

	all_settings = frappe.get_all("Backup Settings", fields=["name"])
	for setting in all_settings:
		doc = frappe.get_doc("Backup Settings", setting.name)
		for row in doc.backup_destinations:
			if row.enabled and row.configuration == "Configured":
				if row.provider == "onedrive":
					onedrive_status = "Configured"
				elif row.provider == "gdrive":
					gdrive_status = "Configured"

	return {
		"total_backups":        total_backups,
		"failed_backups":       failed_backups,
		"last_backup_time":     last_backup_time,
		"onedrive_status":      onedrive_status,
		"gdrive_status":        gdrive_status,
		"auto_backup_enabled":  False,
		"backup_time":          "--",
		"next_backup":          "--",
		"total_backup_size_mb": total_backup_size_mb
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


@frappe.whitelist()
def get_configured_destinations(name="connection"):
	doc = frappe.get_doc("Backup Settings", name)

	destinations = []
	for row in doc.backup_destinations:
		if row.enabled and row.configuration == "Configured":
			destinations.append({
				"provider": row.provider,
				"enabled": row.enabled,
				"configuration": row.configuration,
			})

	return {
		"total_configured": len(destinations),
		"destinations": destinations
	}