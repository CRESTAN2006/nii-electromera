class AuthStandalone {
	constructor() {
		this.adminAccessKey = 'admin-access'
		this.init()
	}

	init() {
		this.checkSession()
		this.listenForChanges()
	}

	checkSession() {
		const isAdmin = localStorage.getItem(this.adminAccessKey) === 'true'
		this.setAdminMode(isAdmin)
	}

	setAdminMode(enabled) {
		if (enabled) {
			document.body.classList.add('admin-mode')
			console.log('[AuthStandalone] Админ-режим включен')
		} else {
			document.body.classList.remove('admin-mode')
			console.log('[AuthStandalone] Админ-режим выключен')
		}
	}

	listenForChanges() {
		window.addEventListener('storage', e => {
			if (e.key === this.adminAccessKey) {
				const isAdmin = e.newValue === 'true'
				this.setAdminMode(isAdmin)
			}
		})

		window.addEventListener('focus', () => {
			this.checkSession()
		})
	}

	refresh() {
		this.checkSession()
	}
}

export default AuthStandalone
