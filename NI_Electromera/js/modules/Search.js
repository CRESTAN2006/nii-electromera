class Search {
	constructor() {
		this.searchInput = document.querySelector('.search-box__input')
		this.searchBtn = document.querySelector('.search-box__btn')
		this.cardsContainer = document.querySelector('.documents-cards')
		this.allCards = []
		this.resultMessage = null
		this.lastQuery = ''

		setTimeout(() => {
			this.init()
		}, 100)
	}

	init() {
		this.collectCards()
		this.createResultMessage()
		this.bindEvents()
	}

	collectCards() {
		if (!this.cardsContainer) {
			return
		}

		this.allCards = Array.from(
			this.cardsContainer.querySelectorAll('.documents-cards-item'),
		).filter(card => {
			const isAddCard = card.classList.contains('admin-card')
			const isAddForm = card.classList.contains('admin-card-secondary')
			return !isAddCard && !isAddForm
		})
	}

	createResultMessage() {
		const searchPanel = document.querySelector('.search-panel')
		if (searchPanel && !document.querySelector('.search-result-message')) {
			this.resultMessage = document.createElement('div')
			this.resultMessage.className = 'search-result-message'
			searchPanel.appendChild(this.resultMessage)
			this.updateResultMessage('', this.allCards.length)
		} else {
			this.resultMessage = document.querySelector('.search-result-message')
		}
	}

	bindEvents() {
		if (this.searchBtn) {
			this.searchBtn.addEventListener('click', e => {
				e.preventDefault()
				this.filter()
			})
		}

		if (this.searchInput) {
			this.searchInput.addEventListener('keyup', e => {
				if (e.key === 'Enter') {
					this.filter()
				}
			})
		}
	}

	filter() {
		const query = this.searchInput?.value.toLowerCase().trim() || ''
		this.lastQuery = query
		let visibleCount = 0

		if (this.allCards.length === 0) {
			this.updateResultMessage(query, 0)
			return
		}

		this.allCards.forEach(card => {
			const text = card.textContent.toLowerCase()
			const matches = query === '' || text.includes(query)

			if (matches) {
				card.style.display = ''
				visibleCount++
			} else {
				card.style.display = 'none'
			}
		})

		this.updateResultMessage(query, visibleCount)
	}

	updateResultMessage(query, count) {
		if (this.resultMessage) {
			if (query === '') {
				this.resultMessage.textContent = `Всего документов: ${count}`
			} else {
				this.resultMessage.textContent = `Найдено: ${count}`
			}
		}
	}

	refresh() {
		this.collectCards()
		if (this.lastQuery !== '') {
			this.applyFilter(this.lastQuery)
		} else {
			this.showAllCards()
			this.updateResultMessage('', this.allCards.length)
		}
	}

	applyFilter(query) {
		let visibleCount = 0
		this.allCards.forEach(card => {
			const text = card.textContent.toLowerCase()
			if (text.includes(query)) {
				card.style.display = ''
				visibleCount++
			} else {
				card.style.display = 'none'
			}
		})
		this.updateResultMessage(query, visibleCount)
	}

	showAllCards() {
		this.allCards.forEach(card => {
			card.style.display = ''
		})
	}
}

export default Search
