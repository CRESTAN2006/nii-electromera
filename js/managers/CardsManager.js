import storage from '../Storage.js'

class CardsManager {
	constructor() {
		this.cardsContainer = document.querySelector('.documents-cards')
		this.storageKey = 'standards'
		this.isAddFormVisible = false
		this.state = { items: [] }
		this.currentEditCard = null
		this.currentEditWrapper = null
		this.currentEditForm = null

		this.init()
	}

	async init() {
		await this.loadData()
		this.render()
		this.bindEvents()
		this.observeAdminMode()
	}

	async loadData() {
		const items = await storage.load(this.storageKey)
		this.state.items =
			Array.isArray(items) && items.length > 0 ? items : this.getDefaultCards()
	}

	getDefaultCards() {
		const cards = document.querySelectorAll(
			'.documents-cards-item:not(.admin-card):not(.admin-card-secondary)',
		)
		return Array.from(cards).map((card, index) => ({
			id: crypto?.randomUUID() ?? Date.now() + index,
			designation:
				card.querySelector('.card-designation')?.textContent.trim() || '',
			name: card.querySelector('.card-name')?.textContent.trim() || '',
			note: card.querySelector('.card-note')?.textContent.trim() || '',
			fileUrl:
				card.querySelector('.download_button')?.getAttribute('href') || '#',
			originalFileName: '',
		}))
	}

	async saveData() {
		await storage.save(this.storageKey, this.state.items)
	}

	getFileName(item) {
		if (item.originalFileName && item.originalFileName !== '') {
			const cleanName = item.originalFileName.replace(/[\\/:*?"<>|]/g, '')
			return cleanName
		}

		if (item.fileUrl && item.fileUrl.startsWith('blob:')) {
			const baseName = item.name.replace(/[\\/:*?"<>|]/g, '').substring(0, 100)
			return `${baseName}.pdf`
		}

		if (
			item.fileUrl &&
			item.fileUrl !== '#' &&
			!item.fileUrl.startsWith('blob:')
		) {
			const urlParts = item.fileUrl.split('/')
			const fileName = urlParts[urlParts.length - 1]
			if (fileName && fileName.includes('.')) {
				return fileName
			}
		}

		const baseName = item.name.replace(/[\\/:*?"<>|]/g, '').substring(0, 100)
		return `${baseName}.pdf`
	}

	render() {
		if (!this.cardsContainer) return

		const isAdmin = document.body.classList.contains('admin-mode')

		const addCardHtml = `
            <div class="documents-cards-item admin-card">
                <img src="images/icons/add.svg" alt="Add icon" width="48" class="admin-icon admin-icon-add" />
            </div>
        `

		const addFormHtml = `
            <article class="documents-cards-item admin-card-secondary" style="display: none;">
                <textarea class="admin-card-designation" placeholder="Обозначение"></textarea>
                <textarea class="admin-card-name" placeholder="Наименование"></textarea>
                <textarea class="admin-card-note" placeholder="Примечание"></textarea>
                <input type="file" />
                <img src="images/icons/save.svg" alt="Save icon" width="24" class="admin-icon admin-icon-save" />
            </article>
        `

		const cardsHtml = this.state.items
			.map(
				item => `
            <article class="documents-cards-item" data-id="${item.id}">
                ${
									isAdmin
										? `
                    <div class="admin-card-action">
                        <img src="images/icons/edit.svg" alt="Edit" width="24"data-edit-card data-id="${item.id}"class="admin-icon admin-icon-edit" />
                        <img src="images/icons/trash.svg" alt="Delete" width="24"data-delete-card data-id="${item.id}"class="admin-icon admin-icon-delete" />
                    </div>
                `
										: ''
								}
                ${item.designation ? `<div class="card-designation">${this.escapeHtml(item.designation)}</div>` : ''}
                <div class="card-name">${this.escapeHtml(item.name)}</div>
                ${item.note ? `<div class="card-note">${this.escapeHtml(item.note)}</div>` : ''}
                <div class="documents-cards-item-download__button">
                    <a href="${item.fileUrl}" class="download_button" download="${this.getFileName(item)}">Скачать</a>
                </div>
            </article>
        `,
			)
			.join('')

		if (isAdmin) {
			this.cardsContainer.innerHTML = addCardHtml + addFormHtml + cardsHtml
		} else {
			this.cardsContainer.innerHTML = cardsHtml
		}

		this.bindAddButton()
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

	bindAddButton() {
		const addCard = this.cardsContainer?.querySelector('.admin-card')

		if (addCard) {
			if (this.handleAddClick) {
				addCard.removeEventListener('click', this.handleAddClick)
			}
			this.handleAddClick = e => {
				e.preventDefault()
				this.showAddForm()
			}
			addCard.addEventListener('click', this.handleAddClick)
		}
	}

	bindEvents() {
		document.addEventListener('click', async e => {
			const target = e.target

			const saveBtn = target.closest('.admin-icon-save')
			if (saveBtn) {
				const form = saveBtn.closest('.admin-card-secondary')
				if (form && this.cardsContainer?.contains(form)) {
					e.preventDefault()
					await this.saveNewCard()
				}
				return
			}

			if (target.matches('[data-edit-card]')) {
				e.preventDefault()
				this.editCard(target.dataset.id)
				return
			}

			if (target.matches('[data-delete-card]')) {
				e.preventDefault()
				if (confirm('Удалить стандарт?')) {
					await this.deleteCard(target.dataset.id)
				}
				return
			}
		})
	}

	observeAdminMode() {
		const observer = new MutationObserver(() => {
			const isAdmin = document.body.classList.contains('admin-mode')
			if (!isAdmin) {
				this.isAddFormVisible = false
				const form = this.cardsContainer?.querySelector('.admin-card-secondary')
				if (form) form.style.display = 'none'
				this.cancelEdit()
			}
			this.render()
		})
		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ['class'],
		})
	}

	showAddForm() {
		const form = this.cardsContainer?.querySelector('.admin-card-secondary')
		if (form) {
			this.isAddFormVisible = true
			form.style.display = 'grid'
			form.scrollIntoView({ behavior: 'smooth' })
		}
	}

	hideAddForm() {
		const form = this.cardsContainer?.querySelector('.admin-card-secondary')
		if (form) {
			this.isAddFormVisible = false
			form.style.display = 'none'
		}
	}

	async saveNewCard() {
		const form = this.cardsContainer?.querySelector('.admin-card-secondary')
		if (!form) return

		const designationInput = form.querySelector('.admin-card-designation')
		const nameInput = form.querySelector('.admin-card-name')
		const noteInput = form.querySelector('.admin-card-note')
		const fileInput = form.querySelector('input[type="file"]')

		let fileUrl = '#'
		let originalFileName = ''
		if (fileInput?.files && fileInput.files[0]) {
			fileUrl = URL.createObjectURL(fileInput.files[0])
			originalFileName = fileInput.files[0].name
		}

		const newItem = {
			id: crypto?.randomUUID() ?? Date.now(),
			designation: designationInput?.value.trim() || '',
			name: nameInput?.value.trim() || '',
			note: noteInput?.value.trim() || '',
			fileUrl: fileUrl,
			originalFileName: originalFileName,
		}

		if (!newItem.name) {
			alert('Поле "Наименование" обязательно для заполнения')
			return
		}

		this.state.items.push(newItem)
		await this.saveData()

		if (designationInput) designationInput.value = ''
		if (nameInput) nameInput.value = ''
		if (noteInput) noteInput.value = ''
		if (fileInput) fileInput.value = ''

		this.hideAddForm()
		this.render()
	}

	editCard(id) {
		if (this.currentEditCard) {
			this.cancelEdit()
		}

		this.hideAddForm()

		const card = this.cardsContainer?.querySelector(
			`.documents-cards-item[data-id="${id}"]`,
		)
		if (!card) return

		const item = this.state.items.find(i => i.id == id)
		if (!item) return

		this.currentEditCard = card
		card.style.display = 'none'

		const wrapper = document.createElement('div')
		wrapper.className = 'edit-card-wrapper'
		wrapper.style.cssText = `
            break-inside: avoid;
            margin-bottom: 16px;
        `

		const form = document.createElement('div')
		form.className = 'edit-card-form'
		form.style.cssText = `
            background-color: var(--color-bg-card);
            border: 2px solid var(--color-border);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-md);
            padding: 16px;
            display: grid;
            gap: 12px;
        `

		form.innerHTML = `
            <textarea class="edit-designation" placeholder="Обозначение" rows="2" style="width: 100%; padding: 8px; box-sizing: border-box;">${this.escapeHtml(item.designation)}</textarea>
            <textarea class="edit-name" placeholder="Наименование" rows="3" style="width: 100%; padding: 8px; box-sizing: border-box;">${this.escapeHtml(item.name)}</textarea>
            <textarea class="edit-note" placeholder="Примечание" rows="2" style="width: 100%; padding: 8px; box-sizing: border-box;">${this.escapeHtml(item.note)}</textarea>
            <input type="file" class="edit-file" />
            <div class="edit-actions" style="display: flex; gap: 12px; justify-content: flex-end;">
                <img src="images/icons/save.svg" alt="Save" width="24" class="admin-icon admin-icon-save edit-save-btn" style="cursor: pointer; opacity: 0.6; transition: 0.2s;" />
            </div>
        `

		wrapper.appendChild(form)
		card.insertAdjacentElement('afterend', wrapper)
		this.currentEditWrapper = wrapper

		const saveBtn = form.querySelector('.edit-save-btn')
		const designationTextarea = form.querySelector('.edit-designation')
		const nameTextarea = form.querySelector('.edit-name')
		const noteTextarea = form.querySelector('.edit-note')
		const fileInput = form.querySelector('.edit-file')

		saveBtn.addEventListener('mouseenter', () => {
			saveBtn.style.opacity = '1'
			saveBtn.style.transform = 'scale(1.05)'
		})
		saveBtn.addEventListener('mouseleave', () => {
			saveBtn.style.opacity = '0.6'
			saveBtn.style.transform = 'scale(1)'
		})

		const saveEdit = async () => {
			const newDesignation = designationTextarea.value.trim()
			const newName = nameTextarea.value.trim()
			const newNote = noteTextarea.value.trim()

			if (!newName) {
				alert('Поле "Наименование" обязательно для заполнения')
				return
			}

			if (fileInput?.files && fileInput.files[0]) {
				if (item.fileUrl && item.fileUrl.startsWith('blob:')) {
					URL.revokeObjectURL(item.fileUrl)
				}
				item.fileUrl = URL.createObjectURL(fileInput.files[0])
				item.originalFileName = fileInput.files[0].name
			}

			item.designation = newDesignation
			item.name = newName
			item.note = newNote

			await this.saveData()
			this.cancelEdit()
			this.render()
		}

		saveBtn.addEventListener('click', saveEdit)

		nameTextarea.focus()
	}

	cancelEdit() {
		if (this.currentEditWrapper && this.currentEditWrapper.remove) {
			this.currentEditWrapper.remove()
		}
		if (this.currentEditCard) {
			this.currentEditCard.style.display = ''
		}
		this.currentEditCard = null
		this.currentEditWrapper = null
		this.currentEditForm = null
	}

	async deleteCard(id) {
		const beforeCount = this.state.items.length
		this.state.items = this.state.items.filter(
			item => String(item.id) !== String(id),
		)
		const afterCount = this.state.items.length

		if (beforeCount === afterCount) {
			console.warn('CardsManager: Элемент не найден для удаления', id)
			alert('Ошибка: документ не найден')
			return
		}

		await this.saveData()
		this.render()
	}
}

export default CardsManager
