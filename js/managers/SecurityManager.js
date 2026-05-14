import storage from '../Storage.js'

class SecurityManager {
	constructor() {
		this.infoBlock = document.querySelector('.info-block')
		this.docsList = document.querySelector('.docs-list')

		this.storageKey = 'security'
		this.isAddFormVisible = false
		this.state = {
			infoText: '',
			documents: [],
		}

		this.init()
	}

	async init() {
		await this.loadData()
		this.render()
		this.bindEvents()
		this.bindAddButton()
		this.observeAdminMode()
	}

	observeAdminMode() {
		const observer = new MutationObserver(() => {
			const isAdmin = document.body.classList.contains('admin-mode')
			if (!isAdmin) {
				this.hideAddForm()
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
		if (saved && saved.infoText !== undefined) {
			this.state = saved
		} else {
			this.getDefaultData()
		}
	}

	getDefaultData() {
		const infoTextEl = this.infoBlock?.querySelector('.info-block__text')
		if (infoTextEl) {
			this.state.infoText = infoTextEl.innerHTML
		}

		const docItems =
			this.docsList?.querySelectorAll('.docs-list__item:not(.add-form-item)') ||
			[]
		this.state.documents = Array.from(docItems).map((item, index) => ({
			id: crypto?.randomUUID() ?? Date.now() + index,
			title: item.querySelector('p')?.textContent.trim() || '',
			fileUrl: item.querySelector('a')?.getAttribute('href') || '#',
			originalFileName: '',
		}))
	}

	async saveData() {
		await storage.save(this.storageKey, this.state)
	}

	convertLinksToHtml(text) {
		if (!text) return ''
		let html = text
		html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
			const cleanUrl = url.replace(/&amp;/g, '&')
			return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`
		})
		html = html.replace(/(https?:\/\/[^\s<>"'\]]+)/g, (match, url) => {
			if (html.includes(`href="${url}"`)) return match
			const cleanUrl = url.replace(/&amp;/g, '&')
			return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>`
		})
		return html
	}

	convertHtmlToText(html) {
		if (!html) return ''
		const div = document.createElement('div')
		div.innerHTML = html
		div.querySelectorAll('a').forEach(a => {
			const href = a.getAttribute('href')
			const text = a.textContent
			if (href && !text.includes('[')) {
				a.outerHTML = `[${text}](${href})`
			}
		})
		let result = div.innerHTML
		result = result.replace(/&amp;/g, '&')
		result = result.replace(/<div>/g, '')
		result = result.replace(/<\/div>/g, '')
		result = result.replace(/<br>/g, '\n')
		result = result.replace(/<br\/>/g, '\n')
		return result.trim()
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
		if (!this.infoBlock || !this.docsList) return

		const isAdmin = document.body.classList.contains('admin-mode')

		const infoHtml = `
			<div class="info-text-wrapper" data-id="info" data-type="info">
				${isAdmin ? `<img data-id="info" data-type="info" src="images/icons/edit.svg" alt="Edit icon" width="20" data-action="edit" class="admin-icon admin-icon-edit" style="cursor: pointer; margin-bottom: 8px;" />` : ''}
				<p class="info-block__text">${this.convertLinksToHtml(this.state.infoText)}</p>
			</div>
		`

		const docsHtml = this.state.documents
			.map(
				item => `
			<li class="docs-list__item" data-id="${item.id}" data-type="doc" style="display: flex; align-items: center; gap: 8px;">
				${isAdmin ? `<img data-id="${item.id}" data-type="doc" src="images/icons/edit.svg" alt="Edit icon" width="20" data-action="edit" class="admin-icon admin-icon-edit" style="cursor: pointer;" />` : ''}
				<a href="${item.fileUrl}" download="${this.getFileName(item)}" style="display: flex; align-items: center; gap: 8px; flex: 1; text-decoration: none; color: inherit;">
					<img src="images/icons/document-icon.svg" width="16" alt="Иконка документа" />
					<p style="margin: 0;">${this.escapeHtml(item.title)}</p>
				</a>
				${isAdmin ? `<img data-id="${item.id}" data-type="doc" src="images/icons/trash.svg" alt="Delete icon" width="20" data-action="delete" class="admin-icon admin-icon-delete" style="cursor: pointer;" />` : ''}
			</li>
		`,
			)
			.join('')

		const addDocBtnHtml = isAdmin
			? `<div style="margin-bottom: 8px;"><img src="images/icons/add.svg" alt="Add icon" width="32" data-action="add-doc" class="admin-icon admin-icon-add" style="cursor: pointer;" /></div>`
			: ''

		const existingAddForm = this.docsList.querySelector('.add-form-item')
		if (existingAddForm && !isAdmin) existingAddForm.remove()

		this.infoBlock.innerHTML = infoHtml
		this.docsList.innerHTML = addDocBtnHtml + docsHtml

		if (this.isAddFormVisible) {
			this.showAddDocForm()
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
		document.addEventListener('click', async e => {
			const target = e.target

			const saveBtn = target.closest('.admin-icon-save')
			if (saveBtn) {
				const form = saveBtn.closest('.add-form-item')
				if (form) {
					e.preventDefault()
					await this.saveNewDoc(form)
				}
				return
			}

			if (target.matches('[data-action="edit"]')) {
				e.preventDefault()
				const id = target.dataset.id
				const type = target.dataset.type
				if (type === 'info') {
					this.editInfoText()
				} else if (type === 'doc') {
					this.editDocTitle(id)
				}
				return
			}

			if (target.matches('[data-action="delete"]')) {
				e.preventDefault()
				if (confirm('Удалить документ?')) {
					await this.deleteDoc(target.dataset.id)
				}
				return
			}

			if (target.matches('[data-action="add-doc"]')) {
				e.preventDefault()
				this.showAddDocForm()
				return
			}
		})
	}

	bindAddButton() {
		const addBtn = document.querySelector('[data-action="add-doc"]')
		if (addBtn && !addBtn.hasListener) {
			addBtn.addEventListener('click', e => {
				e.preventDefault()
				this.showAddDocForm()
			})
			addBtn.hasListener = true
		}
	}

	showAddDocForm() {
		this.hideAddForm()

		const formItem = document.createElement('li')
		formItem.className = 'docs-list__item add-form-item'
		formItem.style.display = 'grid'
		formItem.style.gap = '8px'
		formItem.style.padding = '8px'
		formItem.style.marginTop = '8px'
		formItem.style.border = '1px dashed var(--color-border)'
		formItem.style.borderRadius = 'var(--radius-md)'
		formItem.style.backgroundColor = 'var(--color-bg-card)'

		formItem.innerHTML = `
			<input type="text" class="add-title-input" placeholder="Название документа" style="width: 100%; padding: 8px; box-sizing: border-box; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
			<input type="file" class="add-file-input">
			<div style="display: flex; gap: 8px; justify-content: flex-end;">
				<img src="images/icons/save.svg" alt="Save" width="24" class="admin-icon admin-icon-save" style="cursor: pointer;" />
			</div>
		`

		const addBtn = this.docsList.querySelector('[data-action="add-doc"]')
		if (addBtn) {
			addBtn.insertAdjacentElement('afterend', formItem)
		} else {
			this.docsList.prepend(formItem)
		}

		this.isAddFormVisible = true
		formItem.querySelector('.add-title-input').focus()
	}

	hideAddForm() {
		const form = this.docsList.querySelector('.add-form-item')
		if (form) form.remove()
		this.isAddFormVisible = false
	}

	async saveNewDoc(form) {
		const titleInput = form.querySelector('.add-title-input')
		const fileInput = form.querySelector('.add-file-input')

		const newTitle = titleInput?.value.trim() || 'Новый документ'

		let fileUrl = '#'
		let originalFileName = ''
		if (fileInput?.files && fileInput.files[0]) {
			fileUrl = URL.createObjectURL(fileInput.files[0])
			originalFileName = fileInput.files[0].name
		}

		const newItem = {
			id: crypto?.randomUUID() ?? Date.now(),
			title: newTitle,
			fileUrl: fileUrl,
			originalFileName: originalFileName,
		}

		this.state.documents.push(newItem)
		await this.saveData()
		this.render()
		this.hideAddForm()
	}

	editInfoText() {
		const wrapper = this.infoBlock.querySelector('.info-text-wrapper')
		const textEl = wrapper.querySelector('.info-block__text')

		const oldHtml = textEl.innerHTML
		const tempDiv = document.createElement('div')
		tempDiv.innerHTML = oldHtml

		tempDiv.querySelectorAll('a').forEach(a => {
			const href = a.getAttribute('href')
			const text = a.textContent
			if (href && !text.includes('[')) {
				a.outerHTML = `[${text}](${href})`
			}
		})

		const rawText = tempDiv.innerHTML

		const textarea = document.createElement('textarea')
		textarea.value = rawText
		textarea.style.width = '100%'
		textarea.style.minHeight = '150px'
		textarea.style.padding = '8px'
		textarea.style.fontSize = '14px'
		textarea.style.boxSizing = 'border-box'
		textarea.style.border = '1px solid var(--color-border)'
		textarea.style.borderRadius = 'var(--radius-md)'
		textarea.style.fontFamily = 'inherit'
		textarea.style.resize = 'vertical'

		textEl.replaceWith(textarea)
		textarea.focus()

		const saveEdit = async () => {
			let newText = textarea.value
			this.state.infoText = newText
			await this.saveData()
			this.render()
			document.removeEventListener('click', outsideClick)
			document.removeEventListener('keydown', keyHandler)
		}

		const outsideClick = e => {
			if (!textarea.contains(e.target)) saveEdit()
		}
		const keyHandler = e => {
			if (e.key === 'Enter' && e.ctrlKey) {
				e.preventDefault()
				saveEdit()
			}
		}

		setTimeout(() => {
			document.addEventListener('click', outsideClick)
			document.addEventListener('keydown', keyHandler)
		}, 10)
	}

	editDocTitle(id) {
		const item = this.state.documents.find(i => i.id == id)
		if (!item) return

		const li = this.docsList.querySelector(`.docs-list__item[data-id="${id}"]`)
		const titleEl = li.querySelector('p')
		const oldTitle = titleEl.textContent

		const input = document.createElement('input')
		input.type = 'text'
		input.value = oldTitle
		input.style.flex = '1'
		input.style.padding = '4px 8px'
		input.style.fontSize = '14px'
		input.style.boxSizing = 'border-box'
		input.style.border = '1px solid var(--color-border)'
		input.style.borderRadius = 'var(--radius-md)'

		titleEl.replaceWith(input)
		input.focus()

		const saveEdit = async () => {
			const newTitle = input.value.trim() || 'Без названия'
			item.title = newTitle
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

	async deleteDoc(id) {
		this.state.documents = this.state.documents.filter(i => i.id != id)
		await this.saveData()
		this.render()
	}
}

export default SecurityManager
