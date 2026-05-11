import storage from '../Storage.js'

class Auth {
	constructor() {
		this.adminAccessKey = 'admin-access'
		this.accessCode = '1111'

		this.adminCodeInput = document.querySelector('.admin-code')
		this.adminLoginBtn = document.querySelector('.admin-code__btn')
		this.adminMessage = document.querySelector('.admin-login__message')
		this.adminLogout = document.querySelector('.admin-mode-exit')

		this.checkSession()
		this.bindEvents()
	}

	bindEvents() {
		if (this.adminLoginBtn) {
			this.adminLoginBtn.addEventListener('click', async e => {
				e.preventDefault()
				await this.login()
			})
		}
		if (this.adminLogout) {
			this.adminLogout.addEventListener('click', async e => {
				e.preventDefault()
				await this.logout()
			})
		}
	}

	async checkSession() {
		const isAdmin = await storage.load(this.adminAccessKey)
		if (isAdmin === true || isAdmin === 'true') {
			this.setAdminMode(true)
		} else {
			this.setAdminMode(false)
		}
	}

	async login() {
		const code = this.adminCodeInput?.value || ''
		if (code === this.accessCode) {
			this.setAdminMode(true)
			await storage.save(this.adminAccessKey, true)
			this.showMessage(true)
		} else {
			if (!(await storage.load(this.adminAccessKey))) {
				this.showMessage(false)
			}
		}
		if (this.adminCodeInput) {
			this.adminCodeInput.value = ''
		}
	}

	async logout() {
		this.setAdminMode(false)
		await storage.deleteItem(this.adminAccessKey)
		if (this.adminCodeInput) {
			this.adminCodeInput.value = ''
		}
	}

	setAdminMode(enabled) {
		if (enabled === true) {
			document.body.classList.add('admin-mode')
			this.adminCodeInput.disabled = true
			this.adminCodeInput.placeholder = ''
		} else {
			document.body.classList.remove('admin-mode')
			this.adminCodeInput.disabled = false
			this.adminCodeInput.placeholder = 'Введите код'
		}
	}

	showMessage(enabled) {
		if (enabled === true) {
			this.adminMessage.textContent = 'Доступ разрешен'
		} else {
			this.adminMessage.textContent = 'Неверный пароль'
		}
		setTimeout(() => {
			this.adminMessage.textContent = ''
		}, 2500)
	}
}

export default Auth
