### Erpnext Backup Automation

This is app to keep offsite back on google drive, onedrive and local drive cloud store as well 

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch version-16
bench install-app erpnext_backup_automation
```

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/erpnext_backup_automation
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

### License

mit

### This structure works well for your planned features:

- ERPNext backup creation
- Google Drive upload (rclone)
- OneDrive upload (rclone)
- Local Windows PC sync
- Backup schedules
- Backup logs
- Dashboard and monitoring UI
- Email notifications for failed backups






erpnext_backup_automation/
├── backup_manager/
├── cloud_storage/
│   ├── google_drive.py
│   ├── onedrive.py
│   └── local_sync.py
├── doctype/
│   ├── backup_profile/
│   ├── backup_job/
│   └── backup_log/
├── page/
│   └── backup_dashboard/
├── public/
├── hooks.py
└── scheduler_events


