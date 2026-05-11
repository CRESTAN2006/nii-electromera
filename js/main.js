import Auth from './modules/Auth.js'
import AuthStandalone from './modules/AuthStandalone.js'
import Search from './modules/Search.js'

import GreetingsManager from './managers/GreetingsManager.js'
import BaseDocumentsManager from './managers/DocumentsManager.js'
import NewsManager from './managers/NewsManager.js'
import CardsManager from './managers/CardsManager.js'
import TableManager from './managers/TableManager.js'
import BlanksManager from './managers/BlanksManager.js'
import SecurityManager from './managers/SecurityManager.js'

class App {
	constructor() {
		this.init()
	}

	init() {
		if (document.querySelector('.admin-panel')) {
			new Auth()
		} else {
			new AuthStandalone()
		}

		if (document.querySelector('.news')) {
			new NewsManager()
		}

		if (
			document.querySelector('.letters') ||
			document.querySelector('.orders')
		) {
			new BlanksManager()
		}

		if (document.querySelector('.greetings')) {
			new GreetingsManager()
		}

		if (document.querySelector('.documents:not(.legal-docs)')) {
			new BaseDocumentsManager(
				'documents',
				'.documents:not(.legal-docs) .documents-title .admin-icon-add',
				'.documents:not(.legal-docs) .documents-list',
				'documents',
			)
		}

		if (document.querySelector('.documents.legal-docs')) {
			new BaseDocumentsManager(
				'legal-docs',
				'.documents.legal-docs .documents-title .admin-icon-add',
				'.documents.legal-docs .documents-list',
				'legal-docs',
			)
		}

		if (document.querySelector('.documents-cards')) {
			new CardsManager()
		}

		if (document.querySelector('.documents-cards')) {
			const search = new Search()
			window.searchInstance = search
		}

		if (document.querySelector('.table-container')) {
			new TableManager()
		}

		if (document.querySelector('.security-section')) {
			new SecurityManager()
		}
	}
}

document.addEventListener('DOMContentLoaded', () => {
	new App()
})
