frappe.pages['backup-dashboard'].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Backup Dashboard',
		single_column: true
	});

	// page.set_primary_action('Backup Now', function () {
	// 	show_backup_dialog(page);
	// }, 'octicon octicon-play');

	//  this function will trigger backup immediately without asking for destination as both destinations will be used by default and if any of the destination is not configured, it will be automatically skipped and backup will be created in the available destination. This will provide a seamless experience to the users and reduce the number of clicks required to create a backup.
	page.set_primary_action(
		"Backup Now",
		function () {

			frappe.call({
				method: "erpnext_backup_automation.backup.manager.run_backup",
				freeze: true,
				freeze_message: __("Creating Backup..."),
				callback: function (r) {

					if (r.message) {
						frappe.msgprint({
							title: __("Success"),
							message: __("Backup created successfully"),
							indicator: "green"
						});

						console.log(r.message);
					}
				}
			});

		},
		"octicon octicon-play"
	);

	page.add_menu_item('View Logs', function () {
		frappe.set_route('List', 'Backup Log');
	});

	page.add_menu_item('Settings', function () {
		frappe.set_route('Form', 'Backup Settings', 'Backup Settings');
	});

	$(page.body).append(`
		<style>
		</style>

		<div class="bd">

			<div class="bd-stats">
				<div class="bd-stat">
					<p class="bd-stat-label">Last Backup</p>
					<p class="bd-stat-value" id="last-backup">--</p>
					<span class="bd-stat-sub">most recent</span>
				</div>
				<div class="bd-stat">
					<p class="bd-stat-label">Total Backups</p>
					<p class="bd-stat-value" id="total-backups">0</p>
					<span class="bd-stat-sub">all time</span>
				</div>
				<div class="bd-stat">
					<p class="bd-stat-label">Total Size</p>
					<p class="bd-stat-value" id="total-size">0 MB</p>
					<span class="bd-stat-sub">stored</span>
				</div>
				<div class="bd-stat">
					<p class="bd-stat-label">Failed</p>
					<p class="bd-stat-value" id="failed-backups">0</p>
					<span class="bd-stat-sub">last 30 days</span>
				</div>
			</div>

			<div class="bd-row">
				<div class="bd-card">
					<h6>Cloud Status</h6>
					<div class="bd-item">
						<span>OneDrive</span>
						<span class="bd-badge bd-green" id="onedrive-status">Connected</span>
					</div>
					<div class="bd-item">
						<span>Google Drive</span>
						<span class="bd-badge bd-green" id="gdrive-status">Connected</span>
					</div>
				</div>
				<div class="bd-card">
					<h6>Schedule</h6>
					<div class="bd-item">
						<span>Daily Backup</span>
						<span class="bd-badge bd-green" id="auto-backup-status">Enabled</span>
					</div>
					<div class="bd-item">
						<span>Backup Time</span>
						<span id="backup-time">--</span>
					</div>
					<div class="bd-item">
						<span>Next Backup</span>
						<span id="next-backup">--</span>
					</div>
				</div>
			</div>

			<div class="bd-table-wrap">
				<h6>Recent Backups</h6>
				<div id="backup-list">
					<p class="bd-empty">Loading...</p>
				</div>
			</div>

		</div>
	`);

	load_dashboard_data(page);
};


function load_dashboard_data(page) {
	frappe.call({
		method: 'erpnext_backup_automation.api.get_dashboard_data',
		callback: function (r) {
			if (r.message) {
				var d = r.message;
				$('#last-backup').text(d.last_backup_time || '--');
				$('#total-backups').text(d.total_backups || 0);
				$('#total-size').text((d.total_backup_size_mb || 0).toFixed(1) + ' MB');
				$('#failed-backups').text(d.failed_backups || 0);
				update_cloud_badge('onedrive-status', d.onedrive_status);
				update_cloud_badge('gdrive-status', d.gdrive_status);
				var enabled = d.auto_backup_enabled;
				$('#auto-backup-status')
					.text(enabled ? 'Enabled' : 'Disabled')
					.removeClass('bd-gray bd-green')
					.addClass(enabled ? 'bd-green' : 'bd-gray');
				$('#backup-time').text(d.backup_time || '--');
				$('#next-backup').text(d.next_backup || '--');
			}
		},
		error: function () { }
	});

	load_backup_history();
}


function update_cloud_badge(id, status) {
	var el = $('#' + id);
	el.text(status || 'Not Configured');
	el.removeClass('bd-gray bd-green bd-yellow bd-red');
	if (status === 'Connected') el.addClass('bd-green');
	else if (status === 'Configured') el.addClass('bd-yellow');
	else if (status === 'Error') el.addClass('bd-red');
	else el.addClass('bd-gray');
}


function load_backup_history() {
	frappe.call({
		method: 'frappe.client.get_list',
		args: {
			doctype: 'Backup Log',
			fields: ['name', 'time_stamp', 'file_name', 'file_path', 'status',
				'google_drive_status', 'one_drive_status', 'local_computer_status', 'site_name'],
			order_by: 'time_stamp desc'
		},
		callback: function (r) {
			if (r.message && r.message.length > 0) {
				var rows = r.message.map(function (b) {
					var color = {
						'Success': 'bd-green',
						'Failed': 'bd-red',
						'In Progress': 'bd-yellow'
					}[b.status] || 'bd-gray';

					return '<tr>'
						+ '<td>' + frappe.datetime.str_to_user(b.time_stamp) + '</td>'
						+ '<td class="bd-mono">' + (b.file_name || '--') + '</td>'
						+ '<td>' + (b.site_name || '--') + '</td>'
						+ '<td><span class="bd-badge ' + color + '">' + (b.status || '--') + '</span></td>'
						+ '<td><span class="bd-badge bd-gray">' + (b.google_drive_status || '--') + '</span></td>'
						+ '<td><span class="bd-badge bd-gray">' + (b.one_drive_status || '--') + '</span></td>'
						+ '<td><a href="/app/backup-log/' + b.name + '" class="btn btn-xs btn-default">View</a></td>'
						+ '</tr>';
				}).join('');

				$('#backup-list').html(
					'<table class="bd-table">'
					+ '<thead><tr>'
					+ '<th>Time</th><th>File</th><th>Site</th><th>Status</th><th>Google Drive</th><th>OneDrive</th><th>Action</th>'
					+ '</tr></thead>'
					+ '<tbody>' + rows + '</tbody>'
					+ '</table>'
				);
			} else {
				$('#backup-list').html('<p class="bd-empty">No backups found.</p>');
			}
		}
	});
}


function show_backup_dialog(page) {
	var dialog = new frappe.ui.Dialog({
		title: 'Create Backup',
		fields: [
			{
				label: 'Destination',
				fieldname: 'backup_destination',
				fieldtype: 'Select',
				options: 'Both\nOneDrive Only\nGoogle Drive Only',
				default: 'Both'
			}
		],
		primary_action_label: 'Start Backup',
		primary_action: function (values) {
			frappe.call({
				method: 'erpnext_backup_manager.api.create_backup_now',
				args: { destination: values.backup_destination },
				callback: function (r) {
					if (r.message) {
						frappe.msgprint('Backup started: ' + r.message);
						load_backup_history();
					}
				}
			});
			dialog.hide();
		}
	});
	dialog.show();
}