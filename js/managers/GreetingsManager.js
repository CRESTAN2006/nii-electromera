// js/managers/GreetingsManager.js
import storage from '../Storage.js'

class GreetingsManager {
	constructor() {
		this.greetingsContainer = document.querySelector('.greetings')
		this.storageKey = 'greetings'
		this.state = {
			text: '',
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
		if (saved && saved.text !== undefined) {
			this.state = saved
		} else {
			this.getDefaultData()
		}
	}

	getDefaultData() {
		const textEl = this.greetingsContainer?.querySelector('p')
		if (textEl) {
			this.state.text = textEl.innerHTML
		}
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
		html = html.replace(/&amp;/g, '&')
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
		result = result.replace(/<br>/g, '\n')
		result = result.replace(/<br\/>/g, '\n')
		result = result.replace(/<div>/g, '')
		result = result.replace(/<\/div>/g, '')
		return result.trim()
	}

	render() {
		if (!this.greetingsContainer) return

		const isAdmin = document.body.classList.contains('admin-mode')

		const editBtnHtml = isAdmin
			? `
        <div class="greetings-edit-wrapper" style="text-align: right; margin-bottom: 8px;">
            <img data-id="greetings" data-type="greetings" src="images/icons/edit.svg" alt="Edit icon" width="20" data-action="edit" class="admin-icon admin-icon-edit" style="cursor: pointer;" />
        </div>
    `
			: ''

		const contentHtml = `
        <h1>Корпоративный сайт АО «НИИ ЭЛЕКТРОМЕРА»</h1>
        <p style="white-space: pre-wrap;">${this.convertLinksToHtml(this.state.text)}</p>
    `

		this.greetingsContainer.innerHTML = editBtnHtml + contentHtml
	}

	bindEvents() {
		document.addEventListener('click', async e => {
			const target = e.target

			if (
				target.matches('[data-action="edit"]') &&
				target.dataset.type === 'greetings'
			) {
				e.preventDefault()
				this.editGreetingsText()
				return
			}
		})
	}

	editGreetingsText() {
		const wrapper = this.greetingsContainer
		const textEl = wrapper.querySelector('p')
		const oldText = this.convertHtmlToText(textEl.innerHTML)

		const textarea = document.createElement('textarea')
		textarea.value = oldText
		textarea.style.width = '100%'
		textarea.style.minHeight = '200px'
		textarea.style.padding = '12px'
		textarea.style.fontSize = '14px'
		textarea.style.boxSizing = 'border-box'
		textarea.style.border = '1px solid var(--color-border)'
		textarea.style.borderRadius = 'var(--radius-md)'
		textarea.style.fontFamily = 'inherit'
		textarea.style.resize = 'vertical'
		textarea.style.whiteSpace = 'pre-wrap'
		textarea.style.wordWrap = 'break-word'

		textEl.replaceWith(textarea)
		textarea.focus()

		const saveEdit = async () => {
			let newText = textarea.value
			newText = newText.replace(/\n/g, '<br>')
			this.state.text = newText
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
}

export default GreetingsManager
