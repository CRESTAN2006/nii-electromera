import storage from '../Storage.js'

class BlanksManager {
	constructor() {
		this.lettersContainer = document.querySelector('.letters .menu')
		this.ordersContainer = document.querySelector('.orders .menu')
		this.dispositionsContainer = document.querySelector('.dispositions .menu')
		this.serviceNotesContainer = document.querySelector('.service-notes .menu')

		this.storageKey = 'blanks'
		this.isAddFormVisible = false
		this.state = {
			letters: [],
			orders: [],
			dispositions: [],
			serviceNotes: [],
		}

		this.init()
	}

	async init() {
		await this.loadData()
		this.render()
		this.bindEvents()
		this.bindAddButtons()
		this.observeAdminMode()
	}

	observeAdminMode() {
		const observer = new MutationObserver(() => {
			const isAdmin = document.body.classList.contains('admin-mode')
			if (!isAdmin) {
				this.isAddFormVisible = false
				this.render()
			}
		})
		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ['class'],
		})
	}

	async loadData() {
		const saved = await storage.load(this.storageKey)
		if (saved && saved.letters) {
			this.state = saved
		} else {
			this.getDefaultData()
		}
	}

	getDefaultData() {
		const lettersItems =
			this.lettersContainer?.querySelectorAll(':scope > div:not(.add-form)') ||
			[]
		this.state.letters = Array.from(lettersItems).map((item, index) => ({
			id: crypto?.randomUUID() ?? Date.now() + index,
			title: item.querySelector('.menu-item-title')?.textContent.trim() || '',
			designation:
				item.querySelector('.menu-item-designation')?.textContent.trim() || '',
			fileUrl:
				item.querySelector('.download_button')?.getAttribute('href') || '#',
			originalFileName: '',
		}))

		const ordersItems =
			this.ordersContainer?.querySelectorAll(':scope > div:not(.add-form)') ||
			[]
		this.state.orders = Array.from(ordersItems).map((item, index) => ({
			id: crypto?.randomUUID() ?? Date.now() + index,
			title: item.querySelector('.menu-item-title')?.textContent.trim() || '',
			designation:
				item.querySelector('.menu-item-designation')?.textContent.trim() || '',
			fileUrl:
				item.querySelector('.download_button')?.getAttribute('href') || '#',
			originalFileName: '',
		}))

		const dispositionsItems =
			this.dispositionsContainer?.querySelectorAll(
				':scope > div:not(.add-form)',
			) || []
		this.state.dispositions = Array.from(dispositionsItems).map(
			(item, index) => ({
				id: crypto?.randomUUID() ?? Date.now() + index,
				title: item.querySelector('.menu-item-title')?.textContent.trim() || '',
				designation:
					item.querySelector('.menu-item-designation')?.textContent.trim() ||
					'',
				fileUrl:
					item.querySelector('.download_button')?.getAttribute('href') || '#',
				originalFileName: '',
			}),
		)

		const serviceNotesItems =
			this.serviceNotesContainer?.querySelectorAll(
				':scope > div:not(.add-form)',
			) || []
		this.state.serviceNotes = Array.from(serviceNotesItems).map(
			(item, index) => ({
				id: crypto?.randomUUID() ?? Date.now() + index,
				title: item.querySelector('.menu-item-title')?.textContent.trim() || '',
				designation:
					item.querySelector('.menu-item-designation')?.textContent.trim() ||
					'',
				fileUrl:
					item.querySelector('.download_button')?.getAttribute('href') || '#',
				originalFileName: '',
			}),
		)
	}

	async saveData() {
		await storage.save(this.storageKey, this.state)
	}

	getFileName(item) {
		if (item.originalFileName && item.originalFileName !== '') {
			const cleanName = item.originalFileName.replace(/[\\/:*?"<>|]/g, '')
			return cleanName
		}
		const baseName = item.title.replace(/[\\/:*?"<>|]/g, '').substring(0, 100)
		return `${baseName}.pdf`
	}

	render() {
		const isAdmin = document.body.classList.contains('admin-mode')

		this.renderContainer(
			this.lettersContainer,
			this.state.letters,
			'letters',
			isAdmin,
		)
		this.renderContainer(
			this.ordersContainer,
			this.state.orders,
			'orders',
			isAdmin,
		)
		this.renderContainer(
			this.dispositionsContainer,
			this.state.dispositions,
			'dispositions',
			isAdmin,
		)
		this.renderContainer(
			this.serviceNotesContainer,
			this.state.serviceNotes,
			'serviceNotes',
			isAdmin,
		)
	}

	renderContainer(container, items, type, isAdmin) {
		if (!container) return

		const itemsHtml = items
			.map(
				item => `
			<div class="${type}-item menu-item" data-id="${item.id}" data-type="${type}">
				${isAdmin ? `<img data-id="${item.id}" data-type="${type}" src="images/icons/edit.svg" alt="Edit icon" width="20" data-action="edit" class="admin-icon admin-icon-edit" />` : ''}
				<div class="menu-item-text">
					<p class="menu-item-title">${this.escapeHtml(item.title)}</p>
					${item.designation ? `<p class="menu-item-designation">${this.escapeHtml(item.designation)}</p>` : ''}
				</div>
				${isAdmin ? `<img data-id="${item.id}" data-type="${type}" src="images/icons/trash.svg" alt="Delete icon" width="20" data-action="delete" class="admin-icon admin-icon-delete" />` : ''}
				<a href="${item.fileUrl}" class="download_button" download="${this.getFileName(item)}">Скачать</a>
			</div>
		`,
			)
			.join('')

		container.innerHTML = itemsHtml
	}

	escapeHtml(str) {
		if (!str) return ''
		return str.replace(/[&<>]/g, m => {
			if (m === '&') return '&amp;'
			if (m === '<') return '&lt;'
			if (m === '>') return '&gt;'
			return m
		})
	}

	bindEvents() {
		document.addEventListener('click', async e => {
			const target = e.target

			const saveBtn = target.closest('.admin-icon-save')
			if (saveBtn) {
				const form = saveBtn.closest('.add-form')
				if (form) {
					e.preventDefault()
					await this.saveNewItem(form)
				}
				return
			}

			if (target.matches('[data-action="edit"]')) {
				e.preventDefault()
				this.editItem(target.dataset.id, target.dataset.type)
				return
			}

			if (target.matches('[data-action="delete"]')) {
				e.preventDefault()
				if (confirm('Удалить элемент?')) {
					await this.deleteItem(target.dataset.id, target.dataset.type)
				}
				return
			}
		})
	}

	bindAddButtons() {
		const addBtns = document.querySelectorAll('[data-action="add"]')
		addBtns.forEach(btn => {
			if (btn.hasListener) return
			btn.addEventListener('click', e => {
				e.preventDefault()
				const section = btn.closest('.card')
				let type = 'letters'
				if (section.classList.contains('orders')) type = 'orders'
				else if (section.classList.contains('dispositions'))
					type = 'dispositions'
				else if (section.classList.contains('service-notes'))
					type = 'serviceNotes'
				this.showAddForm(type)
			})
			btn.hasListener = true
		})
	}

	showAddForm(type) {
		const container = this.getContainerByType(type)
		if (!container) return

		const existingForm = container.querySelector('.add-form')
		if (existingForm) existingForm.remove()

		const formDiv = document.createElement('div')
		formDiv.className = `${type}-item menu-item add-form`
		formDiv.style.display = 'grid'
		formDiv.style.gap = '8px'
		formDiv.style.padding = '8px'
		formDiv.style.marginBottom = '8px'
		formDiv.style.backgroundColor = 'var(--color-bg-card)'

		formDiv.innerHTML = `
			<input type="text" class="add-title-input" placeholder="Название" style="width: 350px; padding: 8px; box-sizing: border-box; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
			<input type="text" class="add-designation-input" placeholder="Примечание" style="width: 350px; padding: 8px; box-sizing: border-box; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
			<input type="file" class="add-file-input">
			<div style="display: flex; gap: 8px;">
				<img src="images/icons/save.svg" alt="Save" width="24" class="admin-icon admin-icon-save" style="cursor: pointer;" />
			</div>
		`

		container.prepend(formDiv)
		this.isAddFormVisible = true
		formDiv.querySelector('.add-title-input').focus()
	}

	hideAddForm() {
		const form = document.querySelector('.add-form')
		if (form) form.remove()
		this.isAddFormVisible = false
	}

	async saveNewItem(form) {
		const type = form.className.includes('letters')
			? 'letters'
			: form.className.includes('orders')
				? 'orders'
				: form.className.includes('dispositions')
					? 'dispositions'
					: 'serviceNotes'

		const titleInput = form.querySelector('.add-title-input')
		const designationInput = form.querySelector('.add-designation-input')
		const fileInput = form.querySelector('.add-file-input')

		const newTitle = titleInput?.value.trim() || 'Новый элемент'
		const newDesignation = designationInput?.value.trim() || ''

		let fileUrl = '#'
		let originalFileName = ''
		if (fileInput?.files && fileInput.files[0]) {
			fileUrl = URL.createObjectURL(fileInput.files[0])
			originalFileName = fileInput.files[0].name
		}

		const newItem = {
			id: crypto?.randomUUID() ?? Date.now(),
			title: newTitle,
			designation: newDesignation,
			fileUrl: fileUrl,
			originalFileName: originalFileName,
		}

		this.state[type].push(newItem)
		await this.saveData()
		this.render()
		this.hideAddForm()
	}

	editItem(id, type) {
		this.hideAddForm()

		const items = this.state[type]
		const item = items.find(i => i.id == id)
		if (!item) return

		const container = this.getContainerByType(type)
		const element = container.querySelector(`[data-id="${id}"]`)
		const titleEl = element.querySelector('.menu-item-title')
		const oldTitle = titleEl.textContent
		const designationEl = element.querySelector('.menu-item-designation')
		const oldDesignation = designationEl ? designationEl.textContent : ''

		titleEl.style.display = 'none'
		if (designationEl) designationEl.style.display = 'none'

		const titleInput = document.createElement('input')
		titleInput.type = 'text'
		titleInput.value = oldTitle
		titleInput.style.width = '350px'
		titleInput.style.padding = '8px'
		titleInput.style.fontSize = '14px'
		titleInput.style.boxSizing = 'border-box'
		titleInput.style.border = '1px solid var(--color-border)'
		titleInput.style.borderRadius = 'var(--radius-md)'

		const designationInput = document.createElement('input')
		designationInput.type = 'text'
		designationInput.value = oldDesignation
		designationInput.placeholder = 'Примечание'
		designationInput.style.width = '350px'
		designationInput.style.padding = '8px'
		designationInput.style.fontSize = '14px'
		designationInput.style.boxSizing = 'border-box'
		designationInput.style.border = '1px solid var(--color-border)'
		designationInput.style.borderRadius = 'var(--radius-md)'
		designationInput.style.marginTop = '4px'

		titleEl.insertAdjacentElement('afterend', titleInput)
		if (designationEl) {
			designationEl.insertAdjacentElement('afterend', designationInput)
		} else {
			const menuItemText = element.querySelector('.menu-item-text')
			menuItemText.appendChild(designationInput)
		}

		titleInput.focus()

		const saveEdit = async () => {
			const newTitle = titleInput.value.trim() || 'Без названия'
			const newDesignation = designationInput.value.trim()

			item.title = newTitle
			item.designation = newDesignation

			await this.saveData()
			this.render()
			document.removeEventListener('click', outsideClick)
			document.removeEventListener('keydown', keyHandler)
		}

		const outsideClick = e => {
			if (
				!titleInput.contains(e.target) &&
				!designationInput.contains(e.target)
			)
				saveEdit()
		}
		const keyHandler = e => {
			if (e.key === 'Enter') saveEdit()
		}

		setTimeout(() => {
			document.addEventListener('click', outsideClick)
			document.addEventListener('keydown', keyHandler)
		}, 10)
	}

	async deleteItem(id, type) {
		this.state[type] = this.state[type].filter(i => i.id != id)
		await this.saveData()
		this.render()
	}

	getContainerByType(type) {
		switch (type) {
			case 'letters':
				return this.lettersContainer
			case 'orders':
				return this.ordersContainer
			case 'dispositions':
				return this.dispositionsContainer
			case 'serviceNotes':
				return this.serviceNotesContainer
			default:
				return null
		}
	}
}

export default BlanksManager
