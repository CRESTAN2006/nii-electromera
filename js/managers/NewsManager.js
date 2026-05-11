import storage from '../Storage.js'

class NewsManager {
	constructor() {
		this.addBtn = document.querySelector('.news-title .admin-icon-add')
		this.newsContainer = document.querySelector('.news')
		this.storageKey = 'news'
		this.isAddFormVisible = false
		this.currentEditTextarea = null
		this.state = { items: [] }

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
			Array.isArray(items) && items.length > 0 ? items : this.getDefaultNews()
	}

	getDefaultNews() {
		const newsItems = document.querySelectorAll(
			'.news-item:not(.admin-news-item)',
		)
		return Array.from(newsItems).map((item, index) => ({
			id: crypto?.randomUUID() ?? Date.now() + index,
			date: item.querySelector('.news-item__date')?.textContent.trim() || '',
			text: item.querySelector('.news-content p')?.innerHTML || '',
		}))
	}

	async saveData() {
		await storage.save(this.storageKey, this.state.items)
	}

	convertLinksToHtml(text) {
		if (!text) return ''
		if (text.includes('</a>') && !text.includes('[')) {
			return text
		}
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
		return div.innerHTML
	}

	render() {
		if (!this.newsContainer) return

		const isAdmin = document.body.classList.contains('admin-mode')
		const titleHtml =
			this.newsContainer.querySelector('.news-title')?.outerHTML || ''
		const addForm = this.newsContainer.querySelector('.admin-news-item')
		const addFormHtml = addForm ? addForm.outerHTML : ''

		const itemsHtml = this.state.items
			.map(
				item => `	<article class="news-item" data-id="${item.id}">
					<div class="news-content-title">
						<time class="news-item__date">${this.escapeHtml(item.date)}</time>
						${
							isAdmin
								? `<img
								data-id="${item.id}"
							src="images/icons/edit.svg"
							alt="Edit icon"
							width="24"
							data-edit-news
							class="admin-icon admin-icon-edit"
						/>
						<img
						data-id="${item.id}"
							src="images/icons/trash.svg"
							alt="Delete icon"
							width="24"
							data-delete-news
							class="admin-icon admin-icon-delete"
						/>`
								: ''
						}
						
					</div>
					<div class="news-content">
							${this.convertLinksToHtml(item.text)}
					</div>
				</article>`,
			)
			.join('')

		if (isAdmin && addFormHtml) {
			this.newsContainer.innerHTML = titleHtml + addFormHtml + itemsHtml
		} else {
			this.newsContainer.innerHTML = titleHtml + itemsHtml
		}

		if (addForm && this.isAddFormVisible) {
			const restoredForm = this.newsContainer.querySelector('.admin-news-item')
			if (restoredForm) restoredForm.style.display = 'grid'
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

	bindEvents() {
		document.addEventListener('click', async e => {
			const target = e.target

			const saveBtn = target.closest('.admin-icon-save')
			if (saveBtn && this.newsContainer?.contains(saveBtn)) {
				e.preventDefault()
				await this.saveNewNews()
				return
			}
			if (target.matches('[data-edit-news]')) {
				e.preventDefault()
				this.editNews(target.dataset.id)
				return
			}
			if (target.matches('[data-delete-news]')) {
				e.preventDefault()
				if (confirm('Удалить новость?')) {
					await this.deleteNews(target.dataset.id)
				}
				return
			}
		})
	}

	bindAddButton() {
		this.addBtn = this.newsContainer?.querySelector(
			'.news-title .admin-icon-add',
		)

		if (this.addBtn) {
			if (this.handleAddClick) {
				this.addBtn.removeEventListener('click', this.handleAddClick)
			}
			this.handleAddClick = e => {
				e.preventDefault()
				this.showAddForm()
			}
			this.addBtn.addEventListener('click', this.handleAddClick)
		}
	}

	showAddForm() {
		const form = this.newsContainer?.querySelector('.admin-news-item')
		if (form) {
			this.isAddFormVisible = true
			form.style.display = 'grid'
			form.scrollIntoView({ behavior: 'smooth' })
		}
	}

	hideAddForm() {
		const form = this.newsContainer?.querySelector('.admin-news-item')
		if (form) {
			this.isAddFormVisible = false
			form.style.display = 'none'
		}
	}

	async saveNewNews() {
		const form = this.newsContainer?.querySelector('.admin-news-item')
		if (!form) return
		const dateInput = form.querySelector('.admin-news-date')
		const textarea = form.querySelector('.admin-news-text')
		const date = dateInput?.value || this.getCurrentDate()
		const text = textarea?.value.trim() || 'Новая новость'

		const newItem = {
			id: crypto?.randomUUID() ?? Date.now(),
			date: date,
			text: text,
		}
		this.state.items.unshift(newItem)
		await this.saveData()
		if (dateInput) dateInput.value = ''
		if (textarea) textarea.value = ''

		this.hideAddForm()
		this.render()
	}

	editNews(id) {
		this.render()
		this.hideAddForm()

		const newsItem = this.newsContainer?.querySelector(
			`.news-item[data-id="${id}"]`,
		)
		const contentDiv = newsItem?.querySelector('.news-content')
		if (!contentDiv) return

		const currentHtml = contentDiv.innerHTML
		const tempDiv = document.createElement('div')
		tempDiv.innerHTML = currentHtml

		tempDiv.querySelectorAll('a').forEach(a => {
			const href = a.getAttribute('href')
			const text = a.textContent
			if (href && !text.includes('[')) {
				a.outerHTML = `[${text}](${href})`
			}
		})

		let rawText = tempDiv.innerHTML
		rawText = rawText.replace(/<br>/g, '')
		rawText = rawText.replace(/<br\/>/g, '')
		rawText = rawText.replace(/&amp;/g, '&')
		rawText = rawText.trim()

		const textarea = document.createElement('textarea')
		textarea.value = rawText
		textarea.style.width = '100%'
		textarea.style.height = '150px'
		textarea.style.padding = '8px'
		textarea.style.fontSize = '14px'
		textarea.style.fontFamily = 'inherit'
		textarea.style.whiteSpace = 'normal'
		textarea.style.wordWrap = 'break-word'

		contentDiv.innerHTML = ''
		contentDiv.appendChild(textarea)
		textarea.focus()

		const saveEdit = async () => {
			let newText = textarea.value
			newText = newText.trim()

			const newsItemData = this.state.items.find(i => i.id == id)
			if (newsItemData) {
				newsItemData.text = newText
				await this.saveData()
				this.render()
			}
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

	async deleteNews(id) {
		this.state.items = this.state.items.filter(i => i.id != id)
		await this.saveData()
		this.render()
	}

	getCurrentDate() {
		const now = new Date()
		return `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`
	}
}

export default NewsManager
