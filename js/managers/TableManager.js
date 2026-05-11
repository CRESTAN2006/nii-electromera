import storage from '../Storage.js'

class TableManager {
	constructor() {
		this.tableBody = document.querySelector('.documents-table tbody')
		this.storageKey = 'qms'
		this.isAddFormVisible = false
		this.state = { items: [] }
		this.currentEditRow = null
		this.currentEditWrapper = null

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
			Array.isArray(items) && items.length > 0 ? items : this.getDefaultRows()
	}

	getDefaultRows() {
		if (!this.tableBody) return []

		const rows = Array.from(this.tableBody.querySelectorAll('tr')).filter(
			row => {
				const isAddRow = row.classList.contains('add-row')
				const isAdminTr = row.classList.contains('admin-tr')
				const hasEditRow = row.classList.contains('edit-row-wrapper')
				return !isAddRow && !isAdminTr && !hasEditRow
			},
		)

		return rows.map((row, index) => ({
			id: crypto?.randomUUID() ?? Date.now() + index,
			designation:
				row.querySelector('td:first-child')?.textContent.trim() || '',
			name: row.querySelector('td:nth-child(2)')?.textContent.trim() || '',
			fileUrl:
				row.querySelector('.download_button')?.getAttribute('href') || '#',
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

		const baseName = item.name.replace(/[\\/:*?"<>|]/g, '').substring(0, 100)
		if (
			item.fileUrl &&
			item.fileUrl !== '#' &&
			!item.fileUrl.startsWith('blob:')
		) {
			const urlParts = item.fileUrl.split('/')
			const fileName = urlParts[urlParts.length - 1]
			if (fileName && fileName.includes('.')) {
				const extension = fileName.split('.').pop()
				return `${baseName}.${extension}`
			}
		}

		return `${baseName}.pdf`
	}

	render() {
		if (!this.tableBody) return

		const isAdmin = document.body.classList.contains('admin-mode')

		const addRowHtml = `
            <tr class="add-row ${isAdmin ? 'admin-actions' : ''}">
                <td colspan="3" class="${isAdmin ? 'admin-actions' : ''}">
                    <img src="images/icons/add.svg" alt="Add icon" width="48" data-action="add" class="admin-icon admin-icon-add" />
                </td>
            </tr>
        `

		const addFormHtml = `
            <tr class="admin-tr ${isAdmin ? 'admin-actions' : ''}" style="display: none;">
                <td class="${isAdmin ? 'admin-actions' : ''}">
                    <textarea class="admin-actions add-designation" placeholder="Обозначение" rows="2" style="background-color: var(--color-bg-btn); border-radius: var(--radius-md); font-size: var(--font-size-base); border: 1px solid var(--color-border); outline: none; resize: none; margin: 4px 8px; width: calc(100% - 16px); box-sizing: border-box;"></textarea>
                </td>
                <td class="${isAdmin ? 'admin-actions' : ''}">
                    <textarea class="admin-actions add-name" placeholder="Наименование таблицы" rows="2" style="background-color: var(--color-bg-btn); border-radius: var(--radius-md); font-size: var(--font-size-base); border: 1px solid var(--color-border); outline: none; resize: none; margin: 4px 8px; width: calc(100% - 16px); box-sizing: border-box;"></textarea>
                    <img src="images/icons/save.svg" alt="Save icon" width="24" class="admin-icon admin-icon-save" style="margin: 8px auto 0 auto; display: block; cursor: pointer;" />
                </td>
                <td class="${isAdmin ? 'admin-actions' : ''}">
                    <input type="file" class="admin-actions" style="margin: 8px;" />
                </td>
            </tr>
        `

		const rowsHtml = this.state.items
			.map(
				item => `
        <tr data-id="${item.id}">
            <td>${this.escapeHtml(item.designation)}</td>
            <td>${this.escapeHtml(item.name)}</td>
            <td>
                <div class="table-actions" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <a href="${item.fileUrl}" class="download_button" download="${this.getFileName(item)}">Скачать</a>
                    ${
											isAdmin
												? `
                        <img src="images/icons/edit.svg" alt="Edit" width="24" data-action="edit" data-id="${item.id}" class="admin-icon admin-icon-edit" style="cursor: pointer;" />
                        <img src="images/icons/trash.svg" alt="Delete" width="24" data-action="delete" data-id="${item.id}" class="admin-icon admin-icon-delete" style="cursor: pointer;" />
                    `
												: ''
										}
                </div></td></tr>
    `,
			)
			.join('')

		if (isAdmin) {
			this.tableBody.innerHTML = addRowHtml + addFormHtml + rowsHtml
		} else {
			this.tableBody.innerHTML = rowsHtml
		}

		if (this.isAddFormVisible) {
			const form = this.tableBody.querySelector('.admin-tr')
			if (form) form.style.display = 'table-row'
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
		const addBtn = this.tableBody?.querySelector('.add-row .admin-icon-add')

		if (addBtn) {
			if (this.handleAddClick) {
				addBtn.removeEventListener('click', this.handleAddClick)
			}
			this.handleAddClick = e => {
				e.preventDefault()
				this.showAddForm()
			}
			addBtn.addEventListener('click', this.handleAddClick)
		}
	}

	bindEvents() {
		document.addEventListener('click', async e => {
			const target = e.target

			const saveBtn = target.closest('.admin-icon-save')
			if (saveBtn) {
				const form = saveBtn.closest('.admin-tr')
				if (form && this.tableBody?.contains(form)) {
					e.preventDefault()
					await this.saveNewRow()
				}
				return
			}

			if (target.matches('[data-action="edit"]')) {
				e.preventDefault()
				this.editRow(target.dataset.id)
				return
			}

			if (target.matches('[data-action="delete"]')) {
				e.preventDefault()
				if (confirm('Удалить запись?')) {
					await this.deleteRow(target.dataset.id)
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
				const form = this.tableBody?.querySelector('.admin-tr')
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
		const form = this.tableBody?.querySelector('.admin-tr')
		if (form) {
			this.isAddFormVisible = true
			form.style.display = 'table-row'
		}
	}

	hideAddForm() {
		const form = this.tableBody?.querySelector('.admin-tr')
		if (form) {
			this.isAddFormVisible = false
			form.style.display = 'none'
		}
	}

	async saveNewRow() {
		const form = this.tableBody?.querySelector('.admin-tr')
		if (!form) return

		const designationInput = form.querySelector('.add-designation')
		const nameInput = form.querySelector('.add-name')
		const fileInput = form.querySelector('td:last-child input[type="file"]')

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
			fileUrl: fileUrl,
			originalFileName: originalFileName,
		}

		if (!newItem.name) {
			alert('Поле "Наименование таблицы" обязательно для заполнения')
			return
		}

		this.state.items.unshift(newItem)
		await this.saveData()

		if (designationInput) designationInput.value = ''
		if (nameInput) nameInput.value = ''
		if (fileInput) fileInput.value = ''

		this.hideAddForm()
		this.render()
	}

	editRow(id) {
		if (this.currentEditRow) {
			this.cancelEdit()
		}

		this.hideAddForm()

		const row = this.tableBody?.querySelector(`tr[data-id="${id}"]`)
		if (!row) return

		const item = this.state.items.find(i => i.id == id)
		if (!item) return

		this.currentEditRow = row
		row.style.display = 'none'

		const wrapper = document.createElement('tr')
		wrapper.className = 'edit-row-wrapper'

		const td = document.createElement('td')
		td.colSpan = 3
		td.style.cssText = `
            background-color: var(--color-bg-card);
            padding: 16px;
        `

		td.innerHTML = `
            <div style="display: grid; gap: 12px;">
                <textarea class="edit-designation" placeholder="Обозначение" rows="2" style="background-color: var(--color-bg-btn); border-radius: var(--radius-md); font-size: var(--font-size-base); border: 1px solid var(--color-border); outline: none; resize: none; margin: 4px 8px; width: calc(100% - 16px); box-sizing: border-box;">${this.escapeHtml(item.designation)}</textarea>
                <textarea class="edit-name" placeholder="Наименование таблицы" rows="2" style="background-color: var(--color-bg-btn); border-radius: var(--radius-md); font-size: var(--font-size-base); border: 1px solid var(--color-border); outline: none; resize: none; margin: 4px 8px; width: calc(100% - 16px); box-sizing: border-box;">${this.escapeHtml(item.name)}</textarea>
                <input type="file" class="edit-file" style="margin: 4px 8px;" />
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <img src="images/icons/save.svg" alt="Save" width="24" class="admin-icon admin-icon-save edit-save-btn" style="cursor: pointer; opacity: 0.6; transition: 0.2s; margin: 8px auto 0 auto; display: block;" />
                </div>
            </div>
        `

		wrapper.appendChild(td)
		row.insertAdjacentElement('afterend', wrapper)
		this.currentEditWrapper = wrapper

		const saveBtn = td.querySelector('.edit-save-btn')
		const designationTextarea = td.querySelector('.edit-designation')
		const nameTextarea = td.querySelector('.edit-name')
		const fileInput = td.querySelector('.edit-file')

		if (saveBtn) {
			saveBtn.addEventListener('mouseenter', () => {
				saveBtn.style.opacity = '1'
				saveBtn.style.transform = 'scale(1.05)'
			})
			saveBtn.addEventListener('mouseleave', () => {
				saveBtn.style.opacity = '0.6'
				saveBtn.style.transform = 'scale(1)'
			})
		}

		const saveEdit = async () => {
			const newDesignation = designationTextarea?.value.trim() || ''
			const newName = nameTextarea?.value.trim() || ''

			if (!newName) {
				alert('Поле "Наименование таблицы" обязательно для заполнения')
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

			await this.saveData()
			this.cancelEdit()
			this.render()
		}

		if (saveBtn) {
			saveBtn.addEventListener('click', saveEdit)
		}

		nameTextarea?.focus()
	}

	cancelEdit() {
		if (this.currentEditWrapper && this.currentEditWrapper.remove) {
			this.currentEditWrapper.remove()
		}
		if (this.currentEditRow) {
			this.currentEditRow.style.display = ''
		}
		this.currentEditRow = null
		this.currentEditWrapper = null
	}

	async deleteRow(id) {
		const beforeCount = this.state.items.length
		this.state.items = this.state.items.filter(
			item => String(item.id) !== String(id),
		)
		const afterCount = this.state.items.length

		if (beforeCount === afterCount) {
			console.warn('TableManager: Элемент не найден для удаления', id)
			alert('Ошибка: запись не найдена')
			return
		}

		await this.saveData()
		this.render()
	}
}

export default TableManager
