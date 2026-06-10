frappe.pages['backup-dashboard'].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Backup Dashboard',
		single_column: true
	});

	page.set_primary_action('Backup Now', function () {
		show_backup_dialog(page);
	}, 'octicon octicon-play');

	page.add_menu_item('View Logs', function () {
		frappe.set_route('List', 'Backup Log');
	});

	page.add_menu_item('Settings', function () {
		frappe.set_route('Form', 'Backup Settings', 'Backup Settings');
	});

	$(page.body).append(`
		<style>
			.bd { padding: 20px; }

			.bd-stats {
				display: grid;
				grid-template-columns: repeat(4, 1fr);
				gap: 12px;
				margin-bottom: 20px;
			}
			.bd-stat {
				background: #fff;
				border: 1px solid #e2e8f0;
				border-radius: 10px;
				padding: 16px;
			}
			.bd-stat-label { font-size: 12px; color: #888; margin: 0 0 6px 0; }
			.bd-stat-value { font-size: 24px; font-weight: 600; color: #1e293b; margin: 0; }
			.bd-stat-sub   { font-size: 11px; color: #aaa; }

			.bd-row {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 12px;
				margin-bottom: 20px;
			}
			.bd-card {
				background: #fff;
				border: 1px solid #e2e8f0;
				border-radius: 10px;
				padding: 16px;
			}
			.bd-card h6 {
				font-size: 12px;
				font-weight: 600;
				color: #888;
				text-transform: uppercase;
				letter-spacing: 0.05em;
				margin: 0 0 12px 0;
			}
			.bd-item {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 8px 0;
				border-bottom: 1px solid #f1f5f9;
				font-size: 13px;
				color: #334155;
			}
			.bd-item:last-child { border-bottom: none; }

			.bd-badge {
				font-size: 11px;
				font-weight: 600;
				padding: 3px 10px;
				border-radius: 20px;
			}
			.bd-green  { background: #dcfce7; color: #166534; }
			.bd-red    { background: #fee2e2; color: #991b1b; }
			.bd-yellow { background: #fef9c3; color: #854d0e; }
			.bd-gray   { background: #f1f5f9; color: #64748b; }

			.bd-table-wrap {
				background: #fff;
				border: 1px solid #e2e8f0;
				border-radius: 10px;
				overflow: hidden;
			}
			.bd-table-wrap h6 {
				font-size: 12px;
				font-weight: 600;
				color: #888;
				text-transform: uppercase;
				letter-spacing: 0.05em;
				margin: 0;
				padding: 14px 16px;
				border-bottom: 1px solid #e2e8f0;
				background: #f8fafc;
			}
			.bd-table { width: 100%; border-collapse: collapse; font-size: 13px; }
			.bd-table th {
				padding: 10px 16px;
				text-align: left;
				font-size: 11px;
				font-weight: 600;
				color: #94a3b8;
				text-transform: uppercase;
				letter-spacing: 0.04em;
				background: #f8fafc;
				border-bottom: 1px solid #e2e8f0;
			}
			.bd-table td {
				padding: 10px 16px;
				border-bottom: 1px solid #f1f5f9;
				color: #334155;
			}
			.bd-table tr:last-child td { border-bottom: none; }
			.bd-table tr:hover td { background: #f8fafc; }
			.bd-mono { font-family: monospace; font-size: 12px; color: #64748b; }
			.bd-empty { padding: 24px 16px; color: #aaa; font-size: 13px; }
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
				$('#total-size').text((d.total_size_mb || 0).toFixed(1) + ' MB');
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