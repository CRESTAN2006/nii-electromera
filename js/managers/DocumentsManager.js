import storage from '../Storage.js'

class DocumentsManager {
	constructor(type, addBtnSelector, listSelector, storageKey) {
		this.type = type
		this.addBtnSelector = addBtnSelector
		this.listSelector = listSelector
		this.storageKey = storageKey
		this.isAddFormVisible = false
		this.state = {
			items: [],
		}

		this.init()
	}

	async init() {
		await this.loadData()
		this.render()
		this.bindEvents()
		this.observeAdminMode()
	}

	observeAdminMode() {
		const observer = new MutationObserver(() => {
			const isAdmin = document.body.classList.contains('admin-mode')
			if (!isAdmin) {
				this.hideAddForm()
			}
		})
		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ['class'],
		})
	}

	async loadData() {
		const items = await storage.load(this.storageKey)
		this.state.items =
			Array.isArray(items) && items.length > 0 ? items : this.getDefaultItems()
	}

	getDefaultItems() {
		const container = document.querySelector(this.listSelector)
		const items =
			container?.querySelectorAll('li:not(.admin-documents-item)') || []
		return Array.from(items).map((item, index) => ({
			id: crypto?.randomUUID() ?? Date.now() + index,
			title: item.querySelector('p')?.textContent || '',
			fileUrl: item.querySelector('a')?.getAttribute('href') || '#',
		}))
	}

	async saveData() {
		await storage.save(this.storageKey, this.state.items)
	}

	render() {
		const container = document.querySelector(this.listSelector)
		if (!container) return
		const isAdmin = document.body.classList.contains('admin-mode')
		let addForm = container.querySelector('.admin-documents-item')
		const addFormHtml = addForm ? addForm.outerHTML : ''
		const itemsHtml = this.state.items
			.map(
				item => `	<li data-document-item data-id="${item.id}" data-type="${this.type}">
			${
				isAdmin
					? ` 
						<img
							src="images/icons/edit.svg"
							alt="Edit icon"
							width="24"
							data-action="edit"
							data-edit-document
							data-id="${item.id}"
							class="admin-icon admin-icon-edit"
						/>
						`
					: ''
			}
						<a href="${item.fileUrl}" download="${item.title}">
							<img
								src="images/icons/document-icon.svg"
								width="16"
								alt="Иконка документа"
							/>
							<p data-document-title>${this.escapeHtml(item.title)}</p>
						</a>
						${
							isAdmin
								? `
						<img
							src="images/icons/trash.svg"
							alt="Delete icon"
							width="24"
							data-action="delete"
							class="admin-icon admin-icon-delete"
							data-delete-document
							data-id="${item.id}"
						/>
						`
								: ''
						}
					</li>
					`,
			)
			.join('')

		if (isAdmin && addFormHtml) {
			container.innerHTML = addFormHtml + itemsHtml
		} else {
			container.innerHTML = itemsHtml
		}

		addForm = container.querySelector('.admin-documents-item')
		if (addForm && this.isAddFormVisible) {
			addForm.style.display = ''
		}
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
		const addBtn = document.querySelector(this.addBtnSelector)
		if (addBtn) {
			addBtn.addEventListener('click', e => {
				e.preventDefault()
				this.showAddForm()
			})
		}
		document.addEventListener('click', async e => {
			const target = e.target
			const saveBtn = target.closest('.admin-icon-save')

			if (saveBtn && this.isInsideMyList(saveBtn)) {
				e.preventDefault()
				await this.saveNewDocument(saveBtn)
				return
			}

			if (target.matches('[data-edit-document]')) {
				const li = target.closest('[data-document-item]')
				if (li && li.dataset.type === this.type) {
					e.preventDefault()
					this.editDocument(target.dataset.id)
				}
				return
			}

			if (target.matches('[data-delete-document]')) {
				const li = target.closest('[data-document-item]')
				if (li && li.dataset.type === this.type) {
					if (confirm('Удалить документ?')) {
						await this.deleteDocument(target.dataset.id)
					}
				}
			}
			return
		})
	}

	isInsideMyList(element) {
		const container = document.querySelector(this.listSelector)
		return container?.contains(element) || false
	}

	showAddForm() {
		const container = document.querySelector(this.listSelector)
		const form = container?.querySelector('.admin-documents-item')

		if (form) {
			this.isAddFormVisible = true
			form.style.display = 'grid'
			form.scrollIntoView({ behavior: 'smooth' })
		}
	}

	hideAddForm() {
		const container = document.querySelector(this.listSelector)
		const form = container?.querySelector('.admin-documents-item')
		if (form) {
			this.isAddFormVisible = false
			form.style.display = 'none'
		}
	}

	async saveNewDocument(saveBtn) {
		const formItem = saveBtn.closest('.admin-documents-item')

		if (!formItem) return

		const textarea = formItem.querySelector('textarea')
		const fileInput = formItem.querySelector('input[type="file"]')
		const title = textarea?.value.trim() || 'Новый документ'

		let fileUrl = '#'
		if (fileInput?.files && fileInput.files[0]) {
			fileUrl = URL.createObjectURL(fileInput.files[0])
		}
		const newItem = {
			id: crypto.randomUUID ? crypto.randomUUID() : Date.now(),
			title: title,
			fileUrl: fileUrl,
		}

		this.state.items.push(newItem)
		await this.saveData()

		textarea.value = ''
		if (fileInput) fileInput.value = ''

		this.hideAddForm()
		this.render()
	}

	editDocument(id) {
		this.hideAddForm()

		const container = document.querySelector(this.listSelector)
		const li = container?.querySelector(`[data-document-item][data-id="${id}"]`)
		const titleP = li?.querySelector('[data-document-title]')
		if (!titleP) return

		const oldTitle = titleP.textContent
		const input = document.createElement('input')
		input.type = 'text'
		input.value = oldTitle
		input.style.width = '100%'
		input.style.padding = '4px'
		input.style.fontSize = '16px'

		titleP.replaceWith(input)
		input.focus()

		const saveEdit = async () => {
			const newTitle = input.value.trim() || 'Без названия'
			const item = this.state.items.find(i => i.id == id)
			if (item) item.title = newTitle
			await this.saveData()
			this.render()
			document.removeEventListener('click', outsideClick)
			document.removeEventListener('keydown', keyHandler)
		}

		const outsideClick = e => {
			if (!input.contains(e.target)) saveEdit()
		}
		const keyHandler = e => {
			if (e.key === 'Enter') saveEdit()
		}

		setTimeout(() => {
			document.addEventListener('click', outsideClick)
			document.addEventListener('keydown', keyHandler)
		}, 10)
	}

	async deleteDocument(id) {
		this.state.items = this.state.items.filter(i => i.id != id)
		await this.saveData()
		this.render()
	}
}
export default DocumentsManager
